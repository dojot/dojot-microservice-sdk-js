# Kafka

The Kafka module provides a high-level abstraction for Kafka Producers and Consumers.

# Consumer

To read messages from Kafka, you use the Consumer class, which is a wrapper over the node-rdkafka Consumer and provides the following additional features:

* a register callback system with allows multiple callbacks to be registered for processing the same message;

* a backpressure mechanism to control the consumption of messages from kafka according to the processing ratio. If messages are consumed at a higher rate than they are processed, consumption is stopped until messages already consumed are processed;

* a commit management that ensures that all messages are processed at least once.

The consumer has two exclusive modes of operation:

* Synchronous - a message is marked to be committed immediately after its processing callbacks have finished successfully. If any callback throws an Error, it will be retried by a given number of times. If it keeps failing, the message will be marked to be committed only if the property 'commit.on.failure' is 'true'; otherwise, the consumer will be finished up. In both cases, an 'error.processing' event is emitted.

* Asynchronous - a message is marked to be committed immediately after its acknowledgements have been received. If any callback throws an Error, it will be retried by a given number of times. If it keeps failing, the consumer will be finished up and an 'error.processing' event will be emitted.

Once the consumer is finished due to an unprocessed message, the application will need to instantiate a new one which will start consuming from the earliest uncommitted message.

In the asynchronous mode, the responsibility for acknowledging a message is entirely of the application, and forgetting to acknowledge will eventually block the consumer.

The following example illustrates how to use the Synchronous Consumer:

```js
const { Kafka: { Consumer } } = require('@dojot/microservice-sdk');

const consumer = new Consumer({
  'kafka.consumer': {
    'group.id': 'sdk-consumer-example',
    'metadata.broker.list': 'localhost:9092',
  }
});

// register on consumer's events
consumer.on('ready', () => console.log('Received ready event'));
consumer.on('disconnected', () => console.log('Received disconnected event'));
consumer.on('paused', () => console.log('Received paused event'));
consumer.on('resumed', () => console.log('Received resumed event'));
consumer.on('error.connecting', () => console.log('Received error.connecting event'));
consumer.on('error.processing', (cbId, data) => console.log(`Received error.processing event (cbId: ${cbId}: data: ${JSON.stringfy(data)}`));

consumer.init().then(() => {
    // the target kafka topic, it could be a String or a RegExp
    const topic = "consumer.example.test";

    // Register callback for processing incoming data
    consumer.registerCallback(topic, (data) => {
        // Data processing
        const { value: payload } = data;
        console.log(`Payload: ${payload.toString()}`);
    });
}).catch((error) => {
    console.error(`Caught an error: ${error.stack || error}`);
});
```

The following example illustrates how to use the Asynchronous Consumer:

```js
const { Kafka: { Consumer } } = require('@dojot/microservice-sdk');

const consumer = new Consumer({
  'enable.async.commit': true,
  'kafka.consumer': {
    'group.id': 'sdk-consumer-example',
    'metadata.broker.list': 'localhost:9092',
  }
});

// register on consumer's events
consumer.on('ready', () => console.log('Received ready event'));
consumer.on('disconnected', () => console.log('Received disconnected event'));
consumer.on('paused', () => console.log('Received paused event'));
consumer.on('resumed', () => console.log('Received resumed event'));
consumer.on('error.connecting', () => console.log('Received error.connecting event'));
consumer.on('error.processing', (cbId, data) => console.log(`Received error.processing event (cbId: ${cbId}: data: ${JSON.stringfy(data)}`));

consumer.init().then(() => {
    // the target kafka topic, it could be a String or a RegExp
    const topic = "consumer.example.test";

    // Register callback for processing incoming data
    consumer.registerCallback(topic, (data, ack) => {
        // Data processing
        const { value: payload } = data;
        console.log(`Payload: ${payload.toString()}`);
        ack();
    });
}).catch((error) => {
    console.error(`Caught an error: ${error.stack || error}`);
});
```

## Configuration

The following properties can be set for the Consumer:

|Property|Description|
|-------|----------|
|in.processing.max.messages|The maximum number of messages being processed simultaneously. The processing callbacks are called in order but there is no guarantee regarding to the order of completion. Default value is 1.|
|max.retries.processing.callbacks|The maximum number of times a processing
callback is called if it fails. Default value is 0.|
|enable.async.commit| True whether asynchronous mode is enabled; otherwise, false. Default value is false.|
|commit.on.failure|True whether a message should be committed even if any of its
processing callback has failed; false, otherwise. Default value is true.|
|queued.max.messages.bytes|The maximum amount (in bytes) of queued messages waiting for being processed. The same queue is shared by all callbacks. Default value is 10485760.|
|subscription.backoff.min.ms|The initial backoff time (in milliseconds) for subscribing to topics in Kafka. Every time a callback is registered for a new topic, the subscriptions are updated to include this new one. Default value is 1000.|
|subscription.backoff.max.ms|The maximum value for the backoff time (in milliseconds). The backoff time is incremented while it is above this value. Default value is 60000.|
|subscription.backoff.delta.ms|The value that will be used for calculating a random delta time (in milliseconds) in the exponential delay between retries. Default value is 1000.|
|commit.interval.ms|Time interval (in milliseconds) for committing the processed messages on kafka. A message is committed if and only if all previous messages has been processed. Default value is 5000.|
|kafka.consumer| An object with global properties for the node-rdkafka consumer. For a full list of properties, see: https:/  /github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#global-configuration-properties.|
|kafka.topic| An object with specific topic configuration properties that applies to all topics the node-rdkafka consumer subscribes to. For a full list of properties, see: https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#topic-configuration-properties.|

# Producer

To write messages to Kafka, you use the Producer class, which is a wrapper over the node-rdkafka Producer.

The following example illustrates how to use the Producer:

```js
const { Kafka: { Producer } } = require('@dojot/microservice-sdk');

(async () => {

  const producer = new Producer({
    'kafka.producer': {
      'client.id': 'sample-producer',
      'metadata.broker.list': 'kafka:9092',
      dr_cb: true
    }
  });

  // The target kafka topic, it must be a String
  const targetTopic = 'producer.example.test';

  // Connecting to Producer
  await producer.connect();

  // Producing message in topic producer.example.test with content Message Example
  await producer.produce(targetTopic, "Message Example")
  console.log('Successfully produced the message.');

})().catch((error) => {
  console.error(`Caught an error: ${error.stack || error}`);
});

```

## Producer Configuration

The following properties can be set for the Producer:

|Property                      |Description             |
|------------------------------|-------------------------------------------------|
|producer.flush.timeout.ms     | Timeout in ms to flush the librdkafka internal queue, sending all messages. Default value is 2000.|
|producer.pool.interval.ms    | Polls the producer on this interval, handling disconnections and reconnection. Set it to 0 to turn it off. Default value is 100.|
|producer.connect.timeout.ms   | Timeout in ms to connect. Default value is 5000.|
|producer.disconnect.timeout.ms| Timeout in ms to disconnect. Default value is 10000.|
|kafka.producer| An object with global properties for the node-rdkafka producer. For a full list of the properties, see: https:/  /github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#global-configuration-properties.|
|kafka.topic| An object with specific topic configuration properties that applies to all topics the node-rdkafka producer produces to. For a full list of the properties, see: https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md#topic-configuration-properties.|
