const { Manager } = require('../../../lib/serviceStateManager');

jest.mock('express');
jest.mock('lightship', () => ({
  createLightship: jest.fn(() => ({
    createBeacon: jest.fn(),
    isServerReady: jest.fn(),
    isServerShuttingDown: jest.fn(),
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
      const manager = new Manager();

      expect(manager.lightship).toBeDefined();
      expect(manager.createBeacon).toBeDefined();
      expect(manager.isServerReady).toBeDefined();
      expect(manager.registerShutdownHandler).toBeDefined();
      expect(manager.shutdown).toBeDefined();

      expect(manager.config).toBeDefined();
      expect(manager.services).toBeDefined();
      expect(manager.services).toBeInstanceOf(Map);
      expect(manager.logger).toBeDefined();
    });

    it('should instantiate correctly - config with different values from the default', () => {
      const config = { lightship: { detectKubernetes: true } };
      const manager = new Manager(config);

      expect(manager.lightship).toBeDefined();
      expect(manager.createBeacon).toBeDefined();
      expect(manager.isServerReady).toBeDefined();
      expect(manager.registerShutdownHandler).toBeDefined();
      expect(manager.shutdown).toBeDefined();

      expect(manager.config).toBeDefined();
      expect(manager.config).toStrictEqual(config);
      expect(manager.services).toBeDefined();
      expect(manager.services).toBeInstanceOf(Map);
      expect(manager.logger).toBeDefined();
    });
  });

  describe('updateState', () => {
    let manager;

    const interval = 30000;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('one state', () => {
      beforeEach(() => {
        manager = new Manager();
        manager.addHealthChecker('server', jest.fn(), interval);
      });

      it('should correctly update the state - update to true and signal as ready', (done) => {
        expect(() => manager.updateState('server', true)).not.toThrow();

        expect(manager.services.size).toEqual(1);

        const service = manager.services.get('server');

        expect(service).toBeDefined();
        expect(service.status).toBeTruthy();
        expect(manager.lightship.signalReady).toHaveBeenCalledTimes(1);

        done();
      });

      it('should correctly update the state - update to false and signal as not ready', (done) => {
        expect(() => manager.updateState('server', false)).not.toThrow();

        expect(manager.services.size).toEqual(1);

        const service = manager.services.get('server');

        expect(service).toBeDefined();
        expect(service.status).toBeFalsy();
        expect(manager.lightship.signalNotReady).toHaveBeenCalledTimes(1);

        done();
      });
    });

    describe('two states', () => {
      beforeEach(() => {
        manager = new Manager();
        manager.addHealthChecker('db', jest.fn(), interval);
        manager.addHealthChecker('server', jest.fn(), interval);
      });

      it('should correctly update one state - update db to true and signal as not ready', () => {
        expect(() => manager.updateState('db', true)).not.toThrow();

        const service = manager.services.get('db');
        expect(service).toBeDefined();
        expect(service.status).toBeTruthy();

        expect(manager.lightship.signalNotReady).toHaveBeenCalledTimes(1);
      });

      it('should correctly update one state - update db and server to true and signal as ready', () => {
        expect(() => manager.updateState('db', true)).not.toThrow();
        expect(() => manager.updateState('server', true)).not.toThrow();

        const serviceDb = manager.services.get('db');
        expect(serviceDb).toBeDefined();
        expect(serviceDb.status).toBeTruthy();

        const serviceServer = manager.services.get('server');
        expect(serviceServer).toBeDefined();
        expect(serviceServer.status).toBeTruthy();

        expect(manager.lightship.signalReady).toHaveBeenCalledTimes(1);
      });
    });

    describe('error', () => {
      beforeEach(() => {
        manager = new Manager();
      });

      it('service not registered', () => {
        expect(() => manager.updateState('db', true)).toThrow();
      });
    });
  });

  describe('signalReady', () => {
    it('should send a ready signal', () => {
      const manager = new Manager();
      manager.updateState = jest.fn();

      manager.signalReady('server');

      expect(manager.updateState).toHaveBeenCalledTimes(1);
      expect(manager.updateState).toHaveBeenCalledWith('server', true);
    });
  });

  describe('signalNotReady', () => {
    it('should send a not ready signal', () => {
      const manager = new Manager();
      manager.updateState = jest.fn();

      manager.signalNotReady('server');

      expect(manager.updateState).toHaveBeenCalledTimes(1);
      expect(manager.updateState).toHaveBeenCalledWith('server', false);
    });
  });

  describe('addHealthChecker', () => {
    const service = 'server';
    const interval = 1000;

    let manager;
    let healthChecker;

    beforeEach(() => {
      manager = new Manager();
      healthChecker = jest.fn();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should add a new health checker', (done) => {
      expect.assertions(4);

      manager.addHealthChecker(service, healthChecker, interval);

      expect(manager.services.size).toBe(1);
      expect(manager.services.get(service)).toBeDefined();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), interval);

      done();
    });

    it('should not add a new health checker - there already is one registered for the service', (done) => {
      manager.addHealthChecker(service, healthChecker, interval);
      jest.clearAllMocks();
      expect(() => manager.addHealthChecker(service, healthChecker, interval)).toThrow();

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
        manager.services.get = jest.fn(() => ({ inUse: true }));

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
      manager = new Manager();
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
      expect(manager.services.size).toBe(1);
      manager.clearHealthChecker('server');
      expect(manager.services.size).toBe(0);
      expect(manager.services.get('server')).toBeUndefined();
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
      manager = new Manager();
    });

    it('should remove all health checkers', () => {
      manager.addHealthChecker('server', jest.fn(), 1000);
      manager.clearHealthChecker = jest.fn();

      manager.clearAllHealthCheckers();

      expect(manager.clearHealthChecker).toHaveBeenCalledTimes(1);
      expect(manager.services.size).toEqual(0);
    });

    it('should not remove the health checkers - there is no health checker', () => {
      manager.clearHealthChecker = jest.fn();

      manager.clearAllHealthCheckers();

      expect(manager.clearHealthChecker).not.toHaveBeenCalled();
    });
  });
});
