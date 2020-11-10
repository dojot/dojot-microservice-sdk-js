const Helper = require('kafka/Helper');

jest.mock('node-rdkafka');

const KafkaMock = require('node-rdkafka');

KafkaMock.KafkaConsumer = class {
  constructor() {
    this.eventListener = {};
    this.emit = (event, data) => {
      this.eventListener[event](data);
    };
    this.on = jest.fn((event, cb) => {
      this.eventListener[event] = cb;
    });
    this.connect = jest.fn(() => {
      this.eventListener.ready();
    });
    this.commit = jest.fn();
    this.consume = jest.fn();
    this.subscribe = jest.fn();
    this.unsubscribe = jest.fn();
    this.pause = jest.fn();
    this.resume = jest.fn();
    this.assignments = jest.fn();
    this.unassign = jest.fn();
    this.getMetadata = jest.fn((_obj, callback) => callback());
  }
};

describe('Testing Helper module', () => {
  it('should fail retrieving kafka object status', async () => {
    await expect(Helper.getStatus()).rejects.toThrow();
    // an error occurs when getting metadata
    const consumerObject = new KafkaMock.KafkaConsumer();
    consumerObject.getMetadata.mockImplementation((abc, callback) => callback(abc));
    await expect(Helper.getStatus(consumerObject)).resolves.toStrictEqual({ connected: false });
  });

  it('should resolve because client is connected ', async () => {
    const consumerObject = new KafkaMock.KafkaConsumer();
    await expect(Helper.getStatus(consumerObject)).resolves.toStrictEqual({ connected: true });
  });
});
