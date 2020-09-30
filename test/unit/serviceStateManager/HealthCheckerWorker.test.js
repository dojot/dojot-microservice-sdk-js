const workerThreads = require('worker_threads');

const { ServiceStateManager: { Worker } } = require('../../../index');

const mockSignalingChannel = {
  on: jest.fn(),
  postMessage: jest.fn(),
};

jest.mock('worker_threads', () => ({
  parentPort: {
    once: jest.fn(),
  },
}));

describe('constructor', () => {
  it('should build an instance', () => {
    const worker = new Worker();
    expect(worker.signalingChannel).toBeNull();
    expect(worker.healthCheckers).toBeInstanceOf(Map);
  });
});

describe('initWorker', () => {
  let worker;

  beforeEach(() => {
    worker = new Worker();
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should reject the promise - master did not sent the message', (done) => {
    expect.assertions(1);

    const ret = worker.initWorker(1000);
    jest.runTimersToTime(1000);
    expect(workerThreads.parentPort.once).toHaveBeenCalledWith('message', expect.any(Function));
    expect(ret).rejects.toHaveBeenCalled('Master did not send the signaling channel port!');

    done();
  });

  it('should resolve the promise', (done) => {
    expect.assertions(8);

    workerThreads.parentPort.once = jest.fn((ev, cb) => {
      expect(ev).toEqual('message');
      cb({ signalingChannel: mockSignalingChannel });
    });
    const ret = worker.initWorker(1000);
    jest.runTimersToTime(1000);

    expect(ret).resolves.toHaveBeenCalled();

    expect(worker.signalingChannel).toEqual(mockSignalingChannel);

    expect(mockSignalingChannel.on).toHaveBeenCalledTimes(2);
    // Checking if the events handlers were registered
    expect(mockSignalingChannel.on.mock.calls[0][0]).toBe('close');
    expect(mockSignalingChannel.on.mock.calls[1][0]).toBe('message');

    // Checking the 'close' event callback
    worker.clearAllHealthCheckers = jest.fn(() => Promise.resolve());
    mockSignalingChannel.on.mock.calls[0][1]();
    expect(worker.clearAllHealthCheckers).toHaveBeenCalledTimes(1);

    // Checking the 'message' event callback
    let message = { text: 'ok' };
    expect(() => mockSignalingChannel.on.mock.calls[1][1](message)).not.toThrow();
    message = { error: 'testError' };
    expect(() => mockSignalingChannel.on.mock.calls[1][1](message)).toThrowError('testError');

    done();
  });
});

describe('signalReady', () => {
  it('should send a message with the state being true', () => {
    const worker = new Worker();
    worker.signalingChannel = mockSignalingChannel;
    worker.signalReady('server');

    expect(worker.signalingChannel.postMessage.mock.calls[0][0]).toEqual({ server: true });
  });
});

describe('signalNotReady', () => {
  it('should send a message with the state being false', () => {
    const worker = new Worker();
    worker.signalingChannel = mockSignalingChannel;
    worker.signalNotReady('server');

    expect(worker.signalingChannel.postMessage.mock.calls[0][0]).toEqual({ server: false });
  });
});

describe('addHealthChecker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should add a new health checker', (done) => {
    expect.assertions(6);

    const service = 'server';
    const func = jest.fn();
    const interval = 1000;

    const worker = new Worker();
    worker.addHealthChecker(service, func, interval);

    expect(worker.healthCheckers.size).toBe(1);
    expect(worker.healthCheckers.get(service)).toBeDefined();

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), interval);

    jest.runTimersToTime(interval);

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

    done();
  });
});

describe('clearHealthChecker', () => {
  const service = 'server';

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should clear a health checker', (done) => {
    expect.assertions(3);

    const func = jest.fn();
    const interval = 1000;

    const worker = new Worker();
    worker.addHealthChecker(service, func, interval);
    expect(worker.healthCheckers.size).toBe(1);
    worker.clearHealthChecker(service);
    expect(worker.healthCheckers.size).toBe(0);
    expect(worker.healthCheckers.get(service)).toBeUndefined();

    done();
  });

  it('should not clear a health checker - not registered', (done) => {
    const worker = new Worker();

    expect(() => worker.clearHealthChecker(service)).toThrowError(
      `Health checker "${service}" not found`,
    );

    done();
  });
});

describe('clearAllHealthCheckers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should clear all health checkers - there are two', async () => {
    const interval = 1000;
    const worker = new Worker();
    worker.addHealthChecker('server', jest.fn(), interval);
    worker.addHealthChecker('db', jest.fn(), interval);
    worker.clearHealthChecker = jest.fn();
    await worker.clearAllHealthCheckers();

    expect(worker.clearHealthChecker).toHaveBeenCalledTimes(2);
  });

  it('should clear all health checkers - there is only one', async () => {
    const service = 'server';
    const func = jest.fn();
    const interval = 1000;

    const worker = new Worker();
    worker.addHealthChecker(service, func, interval);
    worker.clearHealthChecker = jest.fn();
    await worker.clearAllHealthCheckers();

    expect(worker.clearHealthChecker).toHaveBeenCalledTimes(1);
  });

  it('should clear all health checkers - there are no registered health checkers', async () => {
    const worker = new Worker();
    worker.clearHealthChecker = jest.fn();
    await worker.clearAllHealthCheckers();

    expect(worker.clearHealthChecker).toHaveBeenCalledTimes(0);
  });
});
