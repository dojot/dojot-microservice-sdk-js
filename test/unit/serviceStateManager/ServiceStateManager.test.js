const Manager = require('../../../lib/serviceStateManager/ServiceStateManager');

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
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
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
      expect(manager.areServicesBeingRemoved).toBeFalsy();
    });

    it('should instantiate correctly - config with different values from the default', () => {
      const config = {
        lightship: {
          detectKubernetes: true,
          terminate: expect.any(Function),
        },
      };
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
      expect(manager.areServicesBeingRemoved).toBeFalsy();
    });
  });

  describe('updateLightshipState', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager();
      manager.registerService('server');
    });

    it('should signal to lightship that it is ready', () => {
      manager.updateState('server', true);
      manager.updateLightshipState();

      expect(manager.lightship.signalReady).toHaveBeenCalled();
    });

    it('should signal to lightship that it is not ready', () => {
      manager.updateState('server', false);
      manager.updateLightshipState();

      expect(manager.lightship.signalNotReady).toHaveBeenCalled();
    });
  });

  describe('updateState', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager();
      manager.updateLightshipState = jest.fn();
    });

    it('should correctly update the state - update to true', () => {
      manager.registerService('server');

      expect(() => manager.updateState('server', true)).not.toThrow();

      expect(manager.services.get('server').status).toBeTruthy();
      expect(manager.updateLightshipState).toHaveBeenCalled();
    });

    it('should correctly update the state - update to false', () => {
      manager.registerService('server');

      expect(() => manager.updateState('server', false)).not.toThrow();

      expect(manager.services.get('server').status).toBeFalsy();
      expect(manager.updateLightshipState).toHaveBeenCalled();
    });

    it('should not update state - service not registered', () => {
      manager.updateLightshipState = jest.fn();
      manager.updateState('db', true);

      expect(manager.updateLightshipState).not.toHaveBeenCalled();
    });
  });

  describe('registerService', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager();
    });

    it('should successfully register one service', () => {
      manager.registerService('server');

      expect(manager.services.size).toEqual(1);
    });

    it('should successfully register two services', () => {
      manager.registerService('server');
      manager.registerService('kafka');

      expect(manager.services.size).toEqual(2);
    });

    it('should not register the same service twice', () => {
      manager.registerService('server');
      expect(() => manager.registerService('server')).toThrow();

      expect(manager.services.size).toEqual(1);
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

      manager.registerService(service);
      manager.addHealthChecker(service, healthChecker, interval);

      expect(manager.services.size).toBe(1);
      expect(manager.services.get(service)).toBeDefined();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), interval);

      done();
    });

    it('should not add a new health checker - there already is one registered for the service', (done) => {
      manager.registerService(service);
      manager.addHealthChecker(service, healthChecker, interval);
      expect(() => manager.addHealthChecker(service, healthChecker, interval)).toThrow();

      done();
    });


    it('should not add a new health checker - service not registered', (done) => {
      expect(() => manager.addHealthChecker(service, healthChecker, interval)).toThrow();

      done();
    });

    describe('setInterval function', () => {
      beforeEach(() => {
        manager.registerService(service);
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

  describe('removeService', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager();
    });

    it('should clear a health checker', () => {
      manager.registerService('server');
      expect(manager.services.size).toBe(1);
      manager.removeService('server');
      expect(manager.services.size).toBe(0);
      expect(manager.services.get('server')).toBeUndefined();
    });

    it('should not clear a health checker - not registered', () => {
      manager.registerService('server');

      expect(manager.services.size).toEqual(1);
      manager.removeService('kafka');
      expect(manager.services.size).toEqual(1);
    });
  });

  describe('removeAllServices', () => {
    let manager;

    beforeEach(() => {
      manager = new Manager();
    });

    it('should remove all health checkers', () => {
      const removeServiceSpy = jest.spyOn(manager, 'removeService');

      manager.registerService('server');

      manager.removeAllServices();

      expect(removeServiceSpy).toHaveBeenCalledTimes(1);
      expect(manager.services.size).toEqual(0);
    });

    it('should not remove the services - there are no registered services', () => {
      manager.removeService = jest.fn();

      manager.removeAllServices();

      expect(manager.removeService).not.toHaveBeenCalled();
    });
  });
});
