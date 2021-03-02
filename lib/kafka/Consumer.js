const async = require('async');
const events = require('events');
const Kafka = require('node-rdkafka');
const uuidv4 = require('uuid/v4');
const util = require('util');
const CommitManager = require('./CommitManager.js');
const { Logger } = require('../logging/Logger');
const Helper = require('./Helper.js');

/**
 * Logger instance
 */
const logger = new Logger('microservice-sdk:consumer');

/**
 * Default value for the maximum number of messages that might be
 * processed simultaneously.
 *
 * Property: in.processing.max.messages
 */
const DEFAULT_IN_PROCESSING_MAX_MESSAGES = 1;

/**
 * Default value for enabling asynchronous commit mode.
 */
const DEFAULT_ENABLE_ASYNC_COMMIT = false;

/**
 * Default value for the maximum number of retries to call
 * a processing callback.
 */
const DEFAULT_MAX_RETRIES_PROCESSING_CALLBACKS = 0;

/**
 * Default value for the commit operation after processing
 * has failed.
 */
const DEFAULT_COMMIT_ON_FAILURE = true;

/**
 * Default value (in bytes) for the maximum size of the message queue
 * used by the backpressure mechanism.
 *
 * Property: queued.max.messages.bytes
 */
const DEFAULT_QUEUED_MAX_MESSAGES_BYTES = 10485760; // 10 mb

/**
 * Default value (in ms) for the initial backoff time implemented by the
 * subscription mechanism.
 *
 * Property: subscription.backoff.min.ms
 */
const DEFAULT_SUBSCRIPTION_BACKOFF_MIN_MS = 1000;

/**
 * Default value (in ms) for the maximum backoff time implemented by the
 * subscription mechanism.
 *
 * Property: subscription.backoff.max.ms
 */
const DEFAULT_SUBSCRIPTION_BACKOFF_MAX_MS = 60000;

/**
 * Default value (in ms) for the delta backoff time implemented by the
 * subscription mechanism.
 *
 * Property: subscription.backoff.delta.ms
 */
const DEFAULT_SUBSCRIPTION_BACKOFF_DELTA_MS = 1000;

/**
 * Default value (in ms) for committing the messages into kafka.
 *
 * Property: commit.interval.ms
 */
const DEFAULT_COMMIT_INTERVAL_MS = 5000;

/**
 * Default value (in ms) to disconnect the consumer
 *
 * Property disconnect.interval.ms
 */
const DEFAULT_CONSUMER_DISCONNECT_TIMEOUT = 3000;

/**
 * Events emitted by the consumer
 */
const EVENTS = [
  // emitted when the consumer is ready
  'ready',
  // emitted when the consumer has been disconnected from Kafka by the client
  'disconnected',
  // emitted when the consumer stops consuming from Kafka (backpressure)
  'paused',
  // emitted when the consumer starts consuming from Kafka again (backpressure)
  'resumed',
  // emitted when the connection with Kafka failed
  'error.connecting',
  // emitted when a message couldn't be processed
  'error.processing',
];

/**
 * This class is a wrapper over the node-rdkafka implementation.
 * It adds the following features:
 * - a register callback system with allows multiple callbacks to be registered
 * for processing the same message.
 * - a backpressure mechanism to control the consumption of messages from kafka
 * according to the processing ratio.
 * - a commit management that ensures that all messages will be processed at
 * least once.
 */
module.exports = class Consumer {
  /**
   * Instantiates a new consumer.
   * @param {*} config the consumer configuration.
   * It is an object with the following properties:
   * - "in.processing.max.messages": the maximum number of messages being
   * processed simultaneously. The processing callbacks are called in order but
   * there is no guarantee regarding to the order of completion
   * - "enable.async.commit": true if the asynchronous mode is enabled; otherwise, false.
   *  In the synchronous mode, a message is marked to be committed immediately after
   * its processing callbacks have finished
   * In the asynchronous mode, a message is committed immediately after its
   * acknowledgements have been received.
   * - "max.retries.processing.callbacks": the maximum number of times a processing
   * callback will be called if it fails.
   * - "commit.on.failure": true if a message should be committed even if its
   * processing has failed; false, otherwise. This property applies only to synchronous mode.
   * - "queued.max.messages.bytes": the maximum amount (in bytes) of queued
   * messages waiting for being processed. The same queue is shared by all callbacks.
   * - "subscription.backoff.min.ms": the initial backoff time (in milliseconds) for
   * subscribing to topics in Kafka. Every time a callback is registered for a new topic,
   * the subscriptions are updated to include this new one.
   * - "subscription.backoff.max.ms": the maximum value for the backoff time (in milliseconds).
   * The backoff time is incremented while it is above this value.
   * - "subscription.backoff.delta.ms": the value that will be used for calculating a random
   * delta time (in milliseconds) in the exponential delay between retries.
   * - "commit.interval.ms": time interval (in milliseconds) for committing the processed messages
   * into kafka. A message is committed if and only if all previous messages has been processed.
   * - kafka.consumer: an object with global properties for the node-rdkafka consumer. For a full
   * list of the properties, see:
   * https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#global-configuration-properties.
   * - kafka.topic: an object with specific topic configuration properties that applies to all
   * topics the node-rdkafka consumer subscribes to. For a full list of properties, see:
   *  https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#topic-configuration-properties.
   *
   * ATTENTION: The property 'kafka.consumer["enable.auto.commit"]' is set to 'false' even if
   * it is 'true' in the 'config' because the commits are managed by
   * this consumer.
   *
   */
  constructor(config) {
    // TODO: Validate configuration file
    // configuration
    this.config = config || {};

    logger.info(`Config:\n ${JSON.stringify(config)}`);

    // kafka consumer configuration
    this.config['kafka.consumer'] = this.config['kafka.consumer'] || {};
    this.config['kafka.consumer']['enable.auto.commit'] = false;
    this.config['kafka.consumer'].rebalance_cb = this.onRebalance.bind(this);

    // kafka topic configuration
    this.config['kafka.topic'] = this.config['kafka.topic'] || {};

    // wrapper-specific configuration
    this.config['in.processing.max.messages'] = (
      this.config['in.processing.max.messages'] || DEFAULT_IN_PROCESSING_MAX_MESSAGES
    );
    this.config['enable.async.commit'] = (
      (this.config['enable.async.commit'] === undefined)
        ? DEFAULT_ENABLE_ASYNC_COMMIT
        : this.config['enable.async.commit']
    );
    this.config['max.retries.processing.callbacks'] = (
      this.config['max.retries.processing.callbacks'] || DEFAULT_MAX_RETRIES_PROCESSING_CALLBACKS
    );
    this.config['queued.max.messages.bytes'] = (
      this.config['queued.max.messages.bytes'] || DEFAULT_QUEUED_MAX_MESSAGES_BYTES
    );
    this.config['subscription.backoff.min.ms'] = (
      this.config['subscription.backoff.min.ms'] || DEFAULT_SUBSCRIPTION_BACKOFF_MIN_MS
    );
    this.config['subscription.backoff.max.ms'] = (
      this.config['subscription.backoff.max.ms'] || DEFAULT_SUBSCRIPTION_BACKOFF_MAX_MS
    );
    this.config['subscription.backoff.delta.ms'] = (
      this.config['subscription.backoff.delta.ms'] || DEFAULT_SUBSCRIPTION_BACKOFF_DELTA_MS
    );
    this.config['commit.on.failure'] = (
      (this.config['commit.on.failure'] === undefined)
        ? DEFAULT_COMMIT_ON_FAILURE
        : this.config['commit.on.failure']
    );
    this.config['commit.interval.ms'] = (
      this.config['commit.interval.ms'] || DEFAULT_COMMIT_INTERVAL_MS
    );
    this.config['disconnect.interval.ms'] = (
      this.config['disconnect.interval.ms'] || DEFAULT_CONSUMER_DISCONNECT_TIMEOUT
    );

    // internal data structures
    // subscriptions
    this.isWaitingForRefreshSubscriptions = false;
    this.topicMap = {};
    this.topicRegExpArray = [];
    // consumer
    this.consumer = new Kafka.KafkaConsumer(this.config['kafka.consumer'],
      this.config['kafka.topic']);
    // commit manager
    this.commitManager = new CommitManager(this.consumer.commit.bind(this.consumer),
      this.config['commit.interval.ms']);
    // processing queue
    this.isReady = false;
    this.currQueueBytes = 0;
    this.isPaused = false;
    this.msgQueue = async.queue(async (data, done) => {
      await this.invokeInterestedCallbacks(data);
      done();
    }, this.config['in.processing.max.messages']);
    this.msgQueue.drain(this.resumeConsumer.bind(this));

    // define sync or async commit mode handler
    this.invokeInterestedCallbacks = (this.config['enable.async.commit']
      ? this.invokeInterestedCallbacksAsyncCommit
      : this.invokeInterestedCallbacksSyncCommit);
    this.invokeInterestedCallbacks.bind(this);

    // async commit mode
    this.unackMsgBytes = 0;
    // the epoch changes when a rebalance happens,
    // and uncommitted messages will be handled again
    // by this instance or another one
    this.epoch = 0;

    // event emitter
    this.eventEmitter = new events.EventEmitter();

    // log consumer settings
    logger.info(`Consumer configuration ${JSON.stringify(this.config)}`);
    logger.info(`Kafka features: ${Kafka.features}`);
  }

  /**
   * Initializes the consumer.
   * @returns a Promise that is fullfil when the consumer becomes ready.
   */
  async init() {
    return new Promise((resolve, reject) => {
      // register handler for kafka events
      // error
      this.consumer.on('event.error', (event) => {
        logger.warn(`Kafka event.error: ${event}`);
      });
      // data
      this.consumer.on('data', this.onData.bind(this));
      // ready
      // note: the ready function is called just once
      this.consumer.on('ready', () => {
        logger.info('Consumer is ready');
        this.isReady = true;
        this.commitManager.init();
        this.refreshSubscriptions();
        this.consumer.consume();
        this.eventEmitter.emit('ready');
        return resolve();
      });

      /**
       * this event is reached only when consumer.disconnect() is called
       * otherwise the consumer will keep trying to reconnect
       */
      this.consumer.on('disconnected', (arg) => {
        this.isReady = false;
        this.isWaitingForRefreshSubscriptions = false;
        this.topicMap = {};
        this.topicRegExpArray = [];
        this.currQueueBytes = 0;
        this.isPaused = false;
        this.msgQueue = null;
        this.unackMsgBytes = 0;
        this.epoch = 0;
        this.eventEmitter.emit('disconnected');
        logger.info(`Consumer disconnected. ${util.inspect(arg)}`);
      });

      // connect to kafka
      this.consumer.connect(undefined, (error) => {
        if (error) {
          logger.error(`Error on connect: ${error}`);
          this.eventEmitter.emit('error.connecting');
          reject(error);
        }
      });
    });
  }

  /**
   * Adds a listener at the end of the listeners array for the specified
   * event. No checks are made to see if the listener has already been
   * added. Multiple calls passing the same combination of event and
   * listener will result in the listener being added multiple times.
   *
   * @param {*} event one of the following:
   *  ready emitted when the consumer is ready
   *  disconnected emitted when the consumer is disconnected from Kafka by the client
   *  paused emitted when the consumer is paused (backpressure)
   *  resumed emitted when the consumer is resumed
   *  error.connecting emitted when the connection with Kafka failed
   *  error.processing emitted when a message couldn't be processed
   * @param {*} callback
   */
  on(event, callback) {
    if (EVENTS.includes(event)) {
      this.eventEmitter.addListener(event, callback);
    }
  }

  /**
   * Registers a callback to handle messages from a specific kafka topic.
   * If the kafka consumer is not subscribed on the given topic, it does.
   * Note that:
   * - subscriptions are not made immediately, it waits the
   * 'subscription.backoff.min.ms' to do it;
   * - errors happens if the topic does not exist and auto creation is disabled,
   * but in the future if the topic is created, the consumer will subscribe on it
   * according to the 'kafka.topic.metadata.refresh.interval.ms'(configurable by
   * config on constructor).
   *
   * @param {*} topic the target kafka topic, it could be a String or a RegExp
   * @param {*} callback async callback (data): Promise
   * Where data is an object with the following content:
   *   {
   *     value: Buffer.from('hi'), // message contents as a Buffer
   *     size: 2, // size of the message, in bytes
   *     topic: 'librdtesting-01', // topic the message comes from
   *     offset: 1337, // offset the message was read from
   *     partition: 1, // partition the message was on
   *     key: 'someKey', // key of the message if present
   *     timestamp: 1510325354780 // timestamp of message creation
   *   }
   * .
   *
   * @return an identifier (uuidv4 string) that represents the association between the
   * topic and the callback. You need to store it if you intend to remove this association
   * in some moment.
   *
   * @example subscribe(/^notifications\/.*\/critical/), handleAllCriticalNotifications)
   */
  registerCallback(topic, callback) {
    logger.debug(`subscribing on topic: ${topic}`);

    let needToRefreshSubscriptions = true;
    const id = uuidv4();
    const registryEntry = {
      callback,
      id,
    };

    if (typeof (topic) === 'object') {
      registryEntry.regExp = topic;
      this.topicRegExpArray.push(registryEntry);
    } else {
      // init structure
      this.topicMap[topic] = this.topicMap[topic] || [];
      // add new entry
      this.topicMap[topic].push(registryEntry);
      if (this.topicMap[topic].length > 1) {
        needToRefreshSubscriptions = false;
      }
    }

    // update kafka topic subscriptions
    if (needToRefreshSubscriptions) {
      this.refreshSubscriptions();
    }

    return id;
  }

  /**
   * Unregister a callback previously registered by the 'registerCallback' method.
   * @param {*} registerId the subscription id that belongs to the callback register
   * that you desire to remove
   */
  unregisterCallback(registerId) {
    logger.debug(`unsubscribing id: ${registerId}`);
    let needToRefreshSubscriptions = false;
    const topicsToBeRemoved = [];

    // check if the id belongs to a regular expression registry
    const topicsRegExpBefore = this.topicRegExpArray.length;
    this.topicRegExpArray = this.topicRegExpArray.filter((entry) => entry.id !== registerId);
    if (topicsRegExpBefore !== this.topicRegExpArray.length) {
      needToRefreshSubscriptions = true;
    } else {
      Object.keys(this.topicMap).forEach((topic) => {
        this.topicMap[topic] = this.topicMap[topic].filter(
          (entry) => entry.id !== registerId,
        );
        if (this.topicMap[topic].length === 0) {
          needToRefreshSubscriptions = true;
          topicsToBeRemoved.push(topic);
        }
      });

      topicsToBeRemoved.forEach((topic) => {
        delete this.topicMap[topic];
      });
    }

    if (needToRefreshSubscriptions) {
      this.refreshSubscriptions();
    }
  }

  /*
   * Get the current status of the consumer
   * @returns object { "connected": boolean, metadata: object }
   */
  async getStatus() {
    return Helper.getStatus(this.consumer);
  }

  /**
   * finish the Consumer
   *
   * This method unsubscribe the consumer from all topics and
   * disconnect it from kafka
   *
   * If it was not connected it won't do anything.
   */
  finish() {
    logger.debug('Disconnecting from kafka...');
    if (this.isReady === false) {
      logger.debug('... not initialized. Aborting operation.');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      logger.debug('Unsubscribing from all topics and disconnecting ...');

      try {
        const disconnectTimeout = setTimeout(() => {
          logger.error('Unable to disconnect the consumer due to timeout.');
          return reject(new Error('disconnection timeout'));
        }, this.config['disconnect.interval.ms']);

        this.consumer.unsubscribe();
        this.commitManager.finish().then(() => {
          logger.debug('Committed processed offsets!');
        }).catch((err) => reject(err));

        return this.consumer.disconnect((err) => {
          clearTimeout(disconnectTimeout);
          if (err) {
            logger.error(`Error while disconnecting consumer: ${err}`);
            return reject(err);
          }
          logger.debug('Successfully disconnected producer from Kafka.');
          this.isReady = false;
          return resolve();
        });
      } catch (error) {
        return reject(error);
      }
    });
  }

  /**
   * Computes a truncated exponential backoff with random delta.
   * The waiting time for the next attempt is given by:
   *
   * min((maximum backoff),
   *     (minimum backoff) * 2 ** retries + random * delta)
   *
   * @access private
   * @param {*} retries the number of retries.
   * @return the waiting time for the next attempt in milliseconds.
   */
  backoffWithRandomDelta(retries) {
    const waitingTime = (
      Math.min(
        this.config['subscription.backoff.max.ms'],
        (
          this.config['subscription.backoff.min.ms'] * 2 ** retries
          + this.config['subscription.backoff.delta.ms'] * Math.random()
        ),
      )
    );
    return waitingTime;
  }

  /**
   * Refreshes the subscription on kafka.
   * To ensure that the consumer doesn't generate excessive load trying
   * to refresh subscriptions immediately after a failure, a truncated
   * exponential backoff with random delta is implemented.
   *
   * @access private
   */
  refreshSubscriptions() {
    // just schedule if does not have a previous timer scheduled and if
    // the consumer is ready
    if ((!this.isWaitingForRefreshSubscriptions) && (this.isReady)) {
      this.isWaitingForRefreshSubscriptions = true;

      const subscriptionProcedure = (retries = 0) => {
        logger.debug('Refreshing subscriptions');
        // According to the node-rdkafka documentation we need to call
        // the unsubscribe method before call the subscribe with new topics
        try {
          this.consumer.unsubscribe();
          // concatenates the topics explicits with the regular expressions
          const topics = Array.prototype.concat(Object.keys(this.topicMap),
            this.topicRegExpArray.map((entry) => entry.regExp));
          logger.debug(`subscribing in the following topics (${topics.length}): ${JSON.stringify(topics)}`);
          if (topics.length > 0) {
            this.consumer.subscribe(topics);
          }
          this.isWaitingForRefreshSubscriptions = false;
        } catch (error) {
          logger.warn(`Error while subscribing: ${error}`);
          // schedules the next retry
          const timeout = this.backoffWithRandomDelta(retries);
          setTimeout(
            subscriptionProcedure,
            timeout,
            (retries + 1),
          );
        }
      };

      // run immediately!
      subscriptionProcedure();
    }
  }

  /**
   * Handles the kafka's rebalance event.
   *
   * Once a rebalance occurs, it's no longer needed to handle the remaining queued
   * messages, as all uncommitted messages will be redelivered to the new assignee
   * that is part of the consumer group. Consequently, the processing queue is drained
   * and the uncommitted offsets are discarded.
   *
   * ATTENTION: A message might be processed more than once if a rebalance occurs
   * and some processed messages has not be committed.
   * @access private
   * @param {*} error the error code
   * @param {*} assignments the assignments
   */
  async onRebalance(error, assignments) {
    if (error.code === Kafka.CODES.ERRORS.ERR__ASSIGN_PARTITIONS) {
      this.consumer.assign(assignments);
    } else if (error.code === Kafka.CODES.ERRORS.ERR__REVOKE_PARTITIONS) {
      this.resumeConsumer();
      // when partition are revoked we just abort queued tasks and do not
      // commit any processed task that is waiting for be committed into Kafka.
      this.msgQueue.remove(() => true);
      this.unackMsgBytes = 0;
      this.epoch = (this.epoch + 1) % Number.MAX_SAFE_INTEGER;
      this.consumer.unassign();
      this.commitManager.onRebalance();
    } else {
      logger.warn(`Rebalance error : ${error}`);
    }
  }

  /**
   * Handles the raw messages that has been come from the Kafka
   * @access private
   * @param {*} data the received message with the following attributes:
   * {
   *   value: Buffer.from('konnichiwa'), // message contents as a Buffer
   *   size: 10, // size of the message, in bytes
   *   topic: 'greetings', // topic the message comes from
   *   offset: 1337, // offset the message was read from
   *   partition: 1, // partition the message was on
   *   key: 'someKey', // key of the message if present
   *   timestamp: 1510325354780, // timestamp of message creation
   * }
   */
  onData(data) {
    this.commitManager.notifyStartProcessing(data);
    this.currQueueBytes += data.size;
    this.msgQueue.push(data, () => {
      this.currQueueBytes -= data.size;
    });

    logger.debug(`Current queue utilization:
    (${this.currQueueBytes} + ${this.unackMsgBytes})`
    + `/${this.config['queued.max.messages.bytes']} bytes`);

    // checks if the backpressure stop condition is met
    // enqueued messages (not delivered) + unprocessed messages (delivered, but waiting for ack)
    if (this.currQueueBytes + this.unackMsgBytes > this.config['queued.max.messages.bytes']) {
      logger.info('Consumer paused due to processing queue capacity overflow.'
      + ` Enqueued Messages: ${this.currQueueBytes} (bytes).`
      + ` Unacknowledged Messages: ${this.unackMsgBytes} (bytes).`);
      this.consumer.pause(this.consumer.assignments());
      this.isPaused = true;
      this.eventEmitter.emit('paused');
    }
  }

  /**
   * Given a kafka message this method invokes all interested callbacks based on
   * the message's topic and mark it to be committed in a synchronous way.
   *
   * If a processing callback throws an exception, the callback will be recalled
   * by n-times according its configuration. If the callback
   * has not succeeded after the n-retries, an 'error.processing' event is emitted.
   *
   * Depending on the configuration, the message that couldn't be processed is
   * marked to be committed on Kafka, and the consumer continues working as nothing
   * has happened (message discarded). But, if the message can't be discarded, it
   * won't be marked to be committed on Kafka and  the consumer will be finished.
   *
   * It worths to say that in the synchronous mode the messages are marked to be
   * committed after the callbacks return.
   *
   * @access private
   * @param {*} data the kafka message with the following attributes:
   * {
   *   value: Buffer.from('konnichiwa'), // message contents as a Buffer
   *   size: 10, // size of the message, in bytes
   *   topic: 'greetings', // topic the message comes from
   *   offset: 1337, // offset the message was read from
   *   partition: 1, // partition the message was on
   *   key: 'someKey', // key of the message if present
   *   timestamp: 1510325354780, // timestamp of message creation
   * }
   */
  async invokeInterestedCallbacksSyncCommit(data) {
    let anyProcessingFailure = false;
    try {
      // verifies if the topic does not matches with a regular expression
      this.topicRegExpArray.forEach(async (entry) => {
        if (entry.regExp.test(data.topic)) {
          let retry = 0;
          let succeeded = false;
          /* eslint-disable no-await-in-loop */
          do {
            logger.debug(`Message on topic: ${data.topic}. `
              + `Calling callback: ${entry.id}. `
              + `Attempt: ${retry + 1}/${this.config['max.retries.processing.callbacks']}`);
            try {
              await entry.callback(data);
              succeeded = true;
            } catch (error) {
              logger.warn(`Error on user's callback ${entry.id} topic: ${data.topic}: ${error}. Attempt: ${retry + 1}`);
              retry += 1;
            }
          } while ((!succeeded) && retry <= this.config['max.retries.processing.callbacks']);
          if (!succeeded) {
            logger.error(`Callback ${entry.id} failed in all attempts (${retry})`);
            anyProcessingFailure = true;
            this.eventEmitter.emit('error.processing', entry.id, data);
          }
        }
      });
      // checks if there isn't a handler to the topic explicitly
      if (!this.topicMap[data.topic]) {
        // just skip
        return;
      }
      // iterates by the callbacks
      this.topicMap[data.topic].forEach(async (entry) => {
        let retry = 0;
        let succeeded = false;
        /* eslint-disable no-await-in-loop */
        do {
          logger.debug(`Message on topic: ${data.topic}. `
            + `Calling callback: ${entry.id}. `
            + `Attempt: ${retry + 1}/${this.config['max.retries.processing.callbacks']}`);
          try {
            await entry.callback(data);
            succeeded = true;
          } catch (error) {
            logger.warn(`Error on user's callback ${entry.id} topic: ${data.topic}: ${error}. Attempt: ${retry + 1}`);
            retry += 1;
          }
        } while ((!succeeded) && retry <= this.config['max.retries.processing.callbacks']);
        if (!succeeded) {
          logger.error(`Callback ${entry.id} failed in all attempts (${retry})`);
          anyProcessingFailure = true;
          this.eventEmitter.emit('error.processing', entry.id, data);
        }
      });
    } catch (error) {
      logger.warn(`Internal error during processing message: ${error}`);
      this.eventEmitter.emit('error.processing', null, data);
    } finally {
      if (this.config['commit.on.failure'] || !anyProcessingFailure) {
        this.commitManager.notifyFinishedProcessing(data);
      } else {
        logger.error('Consumer cannot keep working properly. Finishing consumer.');
        this.finish();
      }
    }
  }

  /**
   * Given a kafka message this method invokes all interested callbacks based on
   * the message's topic and mark it to be committed in an asynchronous way.
   *
   * If a processing callback throws an exception, the callback will be recalled
   * by n-times according its configuration. If the callback
   * has not succeeded after all retries, an 'error.processing' event is emitted
   * and the consumer is finished up.
   *
   * It worths to say that in the asynchronous mode the messages are marked to be
   * committed after receiving the acknowledgments.
   *
   * @access private
   * @param {*} data the kafka message with the following attributes:
   * {
   *   value: Buffer.from('konnichiwa'), // message contents as a Buffer
   *   size: 10, // size of the message, in bytes
   *   topic: 'greetings', // topic the message comes from
   *   offset: 1337, // offset the message was read from
   *   partition: 1, // partition the message was on
   *   key: 'someKey', // key of the message if present
   *   timestamp: 1510325354780, // timestamp of message creation
   * }
   */
  async invokeInterestedCallbacksAsyncCommit(data) {
    // the current epoch
    const { epoch } = this;

    // counter to the unacknowledged callbacks
    //
    // Notice that multiple callbacks might be
    // called to the same message, and when the counter
    // becomes 0 is safe to mark the message to
    // be committed on Kafka (all acks have been
    // received). Before calling the callbacks
    // the counter is set to 1 and is incremented
    // for each callback and decremented for each
    // corresponding ack. It is also decremented after
    // calling all callbacks.
    // Incrementing before calling the callbacks and
    // decrementing after calling all callbacks guarantees
    // that the counter doesn't become 0 before all
    // callbacks are called.
    let unackCounter = 1;

    // acknowledge callback
    //
    // It is supposed that the ack will be called if
    // and only if its corresponding callback succeeded.
    const ack = () => {
      if (epoch !== this.epoch) {
        return false;
      }
      unackCounter -= 1;
      if (unackCounter === 0) {
        this.commitManager.notifyFinishedProcessing(data);
        this.unackMsgBytes -= data.size;
      }
      return true;
    };

    // set backpressure control
    this.unackMsgBytes += data.size;

    //  true if any callback has failed
    let anyProcessingFailure = false;

    try {
      // verifies if the topic does not matches with a regular expression
      this.topicRegExpArray.forEach(async (entry) => {
        if (entry.regExp.test(data.topic)) {
          let retry = 0;
          let succeeded = false;
          unackCounter += 1;

          // called is a guard to guarantee that ack
          // is called once by each callback
          let called = false;
          const ackOnce = () => {
            if (!called) {
              called = true;
              return ack();
            }
            return false;
          };

          /* eslint-disable no-await-in-loop */
          do {
            logger.debug(`Message on topic: ${data.topic}. `
              + `Calling callback: ${entry.id}. `
              + `Attempt: ${retry + 1}/${this.config['max.retries.processing.callbacks']}`);
            try {
              await entry.callback(data, ackOnce);
              succeeded = true;
            } catch (error) {
              logger.warn(`Error on user's callback ${entry.id} topic: ${data.topic}: ${error}. Attempt: ${retry + 1}`);
              retry += 1;
            }
          } while ((!succeeded) && retry <= this.config['max.retries.processing.callbacks']);
          if (!succeeded) {
            logger.error(`Callback ${entry.id} failed in all attempts (${retry})`);
            unackCounter -= 1;
            anyProcessingFailure = true;
            this.eventEmitter.emit('error.processing', entry.id, data);
          }
        }
      });
      // checks if there isn't a handler to the topic explicitly
      if (!this.topicMap[data.topic]) {
        // just skip
        return;
      }
      // iterates by the callbacks
      this.topicMap[data.topic].forEach(async (entry) => {
        let retry = 0;
        let succeeded = false;
        unackCounter += 1;

        // called is guard to guarantee that ack
        // is called once by each callback
        let called = false;
        const ackOnce = () => {
          if (!called) {
            called = true;
            return ack();
          }
          return false;
        };

        /* eslint-disable no-await-in-loop */
        do {
          logger.debug(`Message on topic: ${data.topic}. `
            + `Calling callback: ${entry.id}. `
            + `Attempt: ${retry + 1}/${this.config['max.retries.processing.callbacks']}`);
          try {
            await entry.callback(data, ackOnce);
            succeeded = true;
          } catch (error) {
            logger.warn(`Error on user's callback ${entry.id} topic: ${data.topic}: ${error}. Attempt: ${retry + 1}`);
            retry += 1;
          }
        } while ((!succeeded) && retry <= this.config['max.retries.processing.callbacks']);
        if (!succeeded) {
          logger.error(`Callback ${entry.id} failed in all attempts (${retry})`);
          unackCounter -= 1;
          anyProcessingFailure = true;
          this.eventEmitter.emit('error.processing', entry.id, data);
        }
      });
    } catch (error) {
      logger.warn(`Internal error during processing message: ${error}`);
      this.eventEmitter.emit('error.processing', null, data);
    } finally {
      unackCounter -= 1;
      if (anyProcessingFailure) {
        this.unackMsgBytes -= data.size;
        logger.error('Consumer cannot keep working properly. Finishing consumer.');
        this.finish();
      } else if (unackCounter === 0) {
        this.unackMsgBytes -= data.size;
        this.commitManager.notifyFinishedProcessing(data);
      }
    }
  }

  /**
   * Resumes the consumer
   * @access private
   */
  resumeConsumer() {
    logger.debug(`Calling resume consumer; isPaused? ${this.isPaused}...`);
    if (this.isPaused) {
      this.consumer.resume(this.consumer.assignments());
      this.isPaused = false;
      this.eventEmitter.emit('resumed');
      logger.info('Consumer resumed');
    }
  }
};
