const { Manager } = require('../../../lib/serviceStateManager');

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
jest.mock('logging/Logger.js', () => ({
  Logger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
  })),
}));

describe('Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should instantiate correctly - without config', () => {
      const manager = new Manager(['server']);

      expect(manager.lightship).toBeDefined();
      expect(manager.createBeacon).toBeDefined();
      expect(manager.isServerReady).toBeDefined();
      expect(manager.registerShutdownHandler).toBeDefined();
      expect(manager.shutdown).toBeDefined();

      expect(manager.config).toBeDefined();
      expect(manager.healthCheckers).toBeDefined();
      expect(manager.healthCheckers).toBeInstanceOf(Map);
      expect(manager.logger).toBeDefined();
      expect(manager.serviceStatus).toBeDefined();
    });

    it('should instantiate correctly - config with different values from the default', () => {
      const config = { lightship: { detectKubernetes: true } };
      const manager = new Manager(['server'], config);

      expect(manager.lightship).toBeDefined();
      expect(manager.createBeacon).toBeDefined();
      expect(manager.isServerReady).toBeDefined();
      expect(manager.registerShutdownHandler).toBeDefined();
      expect(manager.shutdown).toBeDefined();

      expect(manager.config).toBeDefined();
      expect(manager.config).toStrictEqual(config);
      expect(manager.healthCheckers).toBeDefined();
      expect(manager.healthCheckers).toBeInstanceOf(Map);
      expect(manager.logger).toBeDefined();
      expect(manager.serviceStatus).toBeDefined();
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

  describe('addHealthChecker', () => {
    const service = 'server';
    const interval = 1000;

    let manager;
    let healthChecker;

    beforeEach(() => {
      manager = new Manager(['server']);
      healthChecker = jest.fn();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should add a new health checker', (done) => {
      expect.assertions(4);

      manager.addHealthChecker(service, healthChecker, interval);

      expect(manager.healthCheckers.size).toBe(1);
      expect(manager.healthCheckers.get(service)).toBeDefined();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), interval);

      done();
    });

    describe('setInterval function', () => {
      beforeEach(() => {
        manager.addHealthChecker(service, healthChecker, interval);
      });

      it('should execute the health checker function', (done) => {
        expect.assertions(2);

        jest.runTimersToTime(interval);

        expect(healthChecker).toHaveBeenCalledTimes(1);
        expect(healthChecker).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

        done();
      });

      it('should not execute the health checker function - it is already running', (done) => {
        expect.assertions(2);
        manager.healthCheckers.get = jest.fn(() => ({ inUse: true }));

        jest.runTimersToTime(interval);

        expect(healthChecker).not.toHaveBeenCalled();
        expect(healthChecker).not.toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

        done();
      });
    });
  });

  describe('clearHealthChecker', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager(['server']);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clear a health checker', (done) => {
      expect.assertions(4);

      const func = jest.fn();
      const interval = 1000;

      manager.addHealthChecker('server', func, interval);
      expect(manager.healthCheckers.size).toBe(1);
      manager.clearHealthChecker('server');
      expect(manager.healthCheckers.size).toBe(0);
      expect(manager.healthCheckers.get('server')).toBeUndefined();
      expect(clearInterval).toHaveBeenCalled();

      done();
    });

    it('should not clear a health checker - not registered', (done) => {
      expect.assertions(1);

      manager.clearHealthChecker('server');

      expect(clearInterval).not.toHaveBeenCalled();

      done();
    });
  });

  describe('clearAllHealthCheckers', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager(['server']);
    });

    it('should remove all health checkers', () => {
      manager.addHealthChecker('server', jest.fn(), 1000);
      manager.clearHealthChecker = jest.fn();

      manager.clearAllHealthCheckers();

      expect(manager.clearHealthChecker).toHaveBeenCalledTimes(1);
      expect(manager.healthCheckers.size).toEqual(0);
    });

    it('should not remove the health checkers - there is no health checker', () => {
      manager.clearHealthChecker = jest.fn();

      manager.clearAllHealthCheckers();

      expect(manager.clearHealthChecker).not.toHaveBeenCalled();
    });
  });
});
