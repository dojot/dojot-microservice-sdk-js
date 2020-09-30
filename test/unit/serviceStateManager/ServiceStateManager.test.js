const { ServiceStateManager: { Manager } } = require('../../../index');

const mockWorker = {
  on: jest.fn(),
  postMessage: jest.fn(),
};

const mockMessagePort1 = {
  close: jest.fn(),
  on: jest.fn(),
};

const mockMessagePort2 = {
  close: jest.fn(),
  on: jest.fn(),
  postMessage: jest.fn(),
};

const mockMessageChannel = {
  port1: mockMessagePort1,
  port2: mockMessagePort2,
};

jest.mock('worker_threads', () => ({
  Worker: jest.fn(() => mockWorker),
  MessageChannel: jest.fn(() => mockMessageChannel),
}));
jest.mock('express');
jest.mock('lightship', () => ({
  createLightship: jest.fn(() => ({
    createBeacon: jest.fn(),
    isServerReady: jest.fn(),
    registerShutdownHandler: jest.fn(),
    signalNotReady: jest.fn(),
    signalReady: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

describe('constructor', () => {
  it('should instantiate correctly - without worker threads', () => {
    const manager = new Manager(['server']);

    expect(manager.lightship).toBeDefined();
    expect(manager.createBeacon).toBeDefined();
    expect(manager.isServerReady).toBeDefined();
    expect(manager.registerShutdownHandler).toBeDefined();
    expect(manager.shutdown).toBeDefined();

    expect(manager.worker).toBeUndefined();
    expect(manager.signalingChannel).toBeUndefined();
  });

  it('should instantiate correctly - with worker threads', () => {
    const manager = new Manager(['server'], { module: { 'worker.enable': true } });
    manager.registerShutdownHandler = jest.fn();

    expect(manager.lightship).toBeDefined();
    expect(manager.createBeacon).toBeDefined();
    expect(manager.isServerReady).toBeDefined();
    expect(manager.registerShutdownHandler).toBeDefined();
    expect(manager.shutdown).toBeDefined();

    expect(manager.worker).toBeDefined();
  });
});

describe('initWorker', () => {
  let manager;

  beforeEach(() => {
    manager = new Manager(['server'], { module: { 'worker.enable': true } });
    manager.registerShutdownHandler = jest.fn();
    manager.shutdown = jest.fn();
  });

  it('should correctly initialize the worker', () => {
    expect(manager.worker.on).toHaveBeenCalledTimes(2);
    expect(manager.worker.on.mock.calls[0][0]).toBe('error');
    expect(manager.worker.on.mock.calls[1][0]).toBe('online');

    // Testing the 'online' event callback
    manager.worker.on.mock.calls[1][1]();

    expect(manager.signalingChannel).toBeDefined();
    expect(manager.worker.postMessage).toHaveBeenCalledTimes(1);
    expect(manager.worker.postMessage).toHaveBeenCalledWith(
      { signalingChannel: mockMessagePort1 },
      [mockMessagePort1],
    );
    expect(mockMessagePort2.on).toHaveBeenCalledTimes(1);
    expect(mockMessagePort2.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(manager.registerShutdownHandler).toHaveBeenCalledWith(expect.any(Function));

    // Testing the shutdown function
    manager.registerShutdownHandler.mock.calls[0][0]();
    expect(mockMessagePort1.close).toHaveBeenCalledTimes(1);
    expect(mockMessagePort2.close).toHaveBeenCalledTimes(1);
  });

  it('should not correctly initialize the worker - an error occurs', () => {
    expect(manager.worker.on).toHaveBeenCalledTimes(2);
    expect(manager.worker.on.mock.calls[0][0]).toBe('error');
    expect(manager.worker.on.mock.calls[1][0]).toBe('online');

    // Testing the 'online' event callback
    manager.worker.on.mock.calls[0][1]('testError');

    expect(manager.shutdown).toHaveBeenCalledTimes(1);
  });
});

describe('handleSignalMessages', () => {
  let manager;
  let state;

  beforeEach(() => {
    manager = new Manager(['server'], { module: { 'worker.enable': true } });
    manager.signalingChannel = mockMessageChannel;
    manager.updateState = jest.fn();
    manager.shutdown = jest.fn();

    state = { server: true };
  });

  it('should correctly handle the message', () => {
    manager.handleSignalMessages(state);

    expect(manager.shutdown).not.toHaveBeenCalled();
    expect(manager.updateState).toHaveBeenCalledTimes(1);
    expect(manager.updateState).toHaveBeenCalledWith(state);
    expect(mockMessagePort2.postMessage).not.toHaveBeenCalled();
  });

  it('should not correctly handle the message - more than one state in the message', (done) => {
    state.db = false;

    manager.shutdown = () => {
      // It will not stop the test, but if it is not called, will fail
      done();
    };

    manager.handleSignalMessages(state);
  });

  it('should not correctly handle the message - the updateState has thrown an error', () => {
    manager.updateState = jest.fn(() => {
      throw new Error('testError');
    });

    manager.handleSignalMessages(state);

    expect(manager.shutdown).not.toHaveBeenCalled();
    expect(manager.updateState).toHaveBeenCalledTimes(1);
    expect(manager.updateState).toHaveBeenCalledWith(state);
    expect(mockMessagePort2.postMessage).toHaveBeenCalledTimes(1);
    expect(mockMessagePort2.postMessage).toHaveBeenCalledWith({ error: 'testError' });
  });
});

describe('updateState', () => {
  let manager;
  let state;

  describe('one state', () => {
    beforeEach(() => {
      manager = new Manager(['server']);
      state = { server: true };
    });

    it('should correctly update the state - update to true and signal as ready', () => {
      expect(() => manager.updateState(state)).not.toThrow();

      expect(manager.serviceStatus).toEqual(state);
      expect(manager.lightship.signalReady).toHaveBeenCalledTimes(1);
    });

    it('should correctly update the state - update to false and signal as not ready', () => {
      state.server = false;

      expect(() => manager.updateState(state)).not.toThrow();

      expect(manager.serviceStatus).toEqual(state);
      expect(manager.lightship.signalNotReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('two states', () => {
    beforeEach(() => {
      manager = new Manager(['server', 'db']);
      state = { db: false, server: true };
      manager.serviceStatus = state;
    });

    it('should correctly update one state - update db to true and signal as ready', () => {
      state.db = true;

      expect(() => manager.updateState({ db: true })).not.toThrow();

      expect(manager.serviceStatus).toEqual(state);
      expect(manager.lightship.signalReady).toHaveBeenCalledTimes(1);
    });

    it('should correctly update one state - update db to false and signal as not ready', () => {
      expect(() => manager.updateState({ db: false })).not.toThrow();

      expect(manager.serviceStatus).toEqual(state);
      expect(manager.lightship.signalNotReady).toHaveBeenCalledTimes(1);
    });
  });

  describe('error', () => {
    beforeEach(() => {
      manager = new Manager(['server']);
    });

    it('service state is not a boolean', () => {
      state = { server: 'testState' };
      expect(() => manager.updateState(state)).toThrowError(
        `Invalid state type: expected "boolean", received "${typeof state.server}"`,
      );
    });

    it('service not registered', () => {
      expect(() => manager.updateState({ db: true })).toThrowError('Service is not registered');
    });
  });
});

describe('signalReady', () => {
  it('should send a ready signal', () => {
    const manager = new Manager(['server']);
    manager.updateState = jest.fn();

    manager.signalReady('server');

    expect(manager.updateState).toHaveBeenCalledTimes(1);
    expect(manager.updateState).toHaveBeenCalledWith({ server: true });
  });
});

describe('signalNotReady', () => {
  it('should send a not ready signal', () => {
    const manager = new Manager(['server']);
    manager.updateState = jest.fn();

    manager.signalNotReady('server');

    expect(manager.updateState).toHaveBeenCalledTimes(1);
    expect(manager.updateState).toHaveBeenCalledWith({ server: false });
  });
});
