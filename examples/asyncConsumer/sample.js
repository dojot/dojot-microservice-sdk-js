const util = require('util');
const { Logger, Kafka: { Consumer } } = require('../index.js');


// Set the global logger properties
// Console transport is set by default, but with info level
Logger.setLevel('console', 'debug');

// Enable verbose mode
Logger.setVerbose(true);

// instantiate a logger wrapper for the application
const logger = new Logger('sample-consumer');

const consumer = new Consumer({
  'enable.async.commit': true,
  'commit.on.failure': false,
  'kafka.consumer': {
    'group.id': process.env.KAFKA_GROUP_ID || 'sdk-consumer-example',
    'metadata.broker.list': process.env.KAFKA_HOSTS || 'localhost:9092',
  },
  'kafka.topic': {
    'auto.offset.reset': 'earliest',
  },
});

consumer.on('ready',
  () => logger.info('Received ready event'));
consumer.on('disconnected',
  () => logger.info('Received disconnected event'));
consumer.on('paused',
  () => logger.info('Received paused event'));
consumer.on('resumed',
  () => logger.info('Received resumed event'));
consumer.on('error.connecting',
  () => logger.info('Received error.connecting event'));
consumer.on('error.processing',
  (cbId, data) => logger.info(
    `Received error.processing event (cbId: ${cbId}: data: ${util.inspect(data)})`,
  ));

const getStatusFunc = () => {
  consumer.getStatus().then((value) => {
    logger.info(`Status: ${util.inspect(value)}`);
  }).catch((err) => {
    logger.error(`${err}`);
  });
};

consumer.init().then(() => {
  logger.info('Application is ready to receive messages from kafka!');
  // the target kafka topic, it could be a String or a RegExp
  const targetTopic = process.env.KAFKA_TOPIC || 'consumer.testing';

  /**
   * retrieve the status
   */
  setInterval(getStatusFunc, 5000);

  // Register callback to process incoming device data
  /* const idCallback = */ consumer.registerCallback(targetTopic, (data, ack) => {
    const { value: payload } = data;
    logger.debug(`Start processing: ${payload.toString()}`);
    setTimeout(async () => {
      logger.debug(`Finished processing: ${payload.toString()}`);
      ack();
    }, 60000 * Math.random());
  });
}).catch((error) => {
  logger.error(`Caught an error: ${error.stack || error}`);
});
