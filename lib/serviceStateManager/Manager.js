const lightship = require('lightship');
const lodash = require('lodash');
const util = require('util');

const { Logger } = require('../logging/Logger');

class Manager {
  /**
   * Manages the services' states, providing health check and shutdown utilities.
   *
   * @param {Array<string>} services array of services to be checked. Make sure to implement a
   * health checker for each one of these, otherwise it will not properly work.
   * @param {object} config module configuration object. Check the documentation for more details
   * about its accepted values.
   */
  constructor(services, config = {}) {
    this.logger = new Logger('microservice-sdk:service-state-manager');
    this.logger.info('Initializing the Manager...');

    /**
     * @type {Map<string, {interval: NodeJS.Timeout, inUse: boolean}>}
     */
    this.healthCheckers = new Map();

    // Applying the configurations
    const defaultLightshipConfig = {
      detectKubernetes: false,
    };

    this.config = {
      lightship: { ...defaultLightshipConfig, ...config.lightship },
    };

    this.logger.info(`Manager configuration: ${util.inspect(this.config)}`);

    this.serviceStatus = {};
    services.forEach((value) => {
      this.serviceStatus[value] = false;
    });

    this.lightship = lightship.createLightship(this.config.lightship);
    // Since these functions will behave the same way as the Lightship ones, we will directly "map"
    // them as if they are from our class
    this.createBeacon = this.lightship.createBeacon;
    this.isServerReady = this.lightship.isServerReady;
    this.registerShutdownHandler = this.lightship.registerShutdownHandler;
    this.shutdown = this.lightship.shutdown;

    this.registerShutdownHandler(() => this.clearAllHealthCheckers());

    this.logger.info('... Manager initialized.');
  }

  /**
   * Updates the state of a service in the `serviceStatus` object.
   *
   * @param {{string: boolean}} state the state to be applied.
   *
   * @throws if the state is not a boolean.
   * @throws if the service is not present in the `serviceStatus` object.
   *
   * @private
   */
  updateState(state) {
    const service = Object.keys(state)[0];
    if (typeof state[service] !== 'boolean') {
      throw new Error(
        `Invalid state type: expected "boolean", received "${typeof state[service]}"`,
      );
    }

    const isServiceRegistered = Object.keys(this.serviceStatus).some((value) => value === service);
    if (!isServiceRegistered) {
      throw new Error('Service is not registered');
    }

    this.serviceStatus = { ...this.serviceStatus, ...state };

    // Signaling to the lightship instance whether the services are ready or not
    if (lodash.every(this.serviceStatus, (value) => value)) {
      this.lightship.signalReady();
    } else {
      this.lightship.signalNotReady();
    }
  }

  /**
   * Signals to the health check service that the service is ready. This can be useful, for example,
   * in cases were you already have a connection (e.g. MongoDB client) and want to check it via
   * built-in events (in this case, the MongoDB client has an event when the connection is ready).
   *
   * @param {string} service the service to be signaled. Must be a service that were registered in
   * the class' instantiation.
   *
   * @throws if the service is not registered.
   *
   * @public
   */
  signalReady(service) {
    const stateObject = {};
    stateObject[service] = true;
    this.updateState(stateObject);
  }

  /**
   * Signals to the health check service that the service is not ready.
   *
   * @param {string} service the service to be signaled. Must be a service that were registered in
   * the class' instantiation.
   *
   * @throws if the service is not registered.
   *
   * @public
   */
  signalNotReady(service) {
    const stateObject = {};
    stateObject[service] = false;
    this.updateState(stateObject);
  }

  /**
   * Adds a new health checker function for an specific service.
   *
   * @param {string} service service to be checked by the health checker.
   * @param {Function} func function to be registered as a health checker. It should receive two
   * functions as parameters: `signalReady` and `signalNotReady`. They are already hooked to the
   * service you passed.
   * @param {number} interval period of time (in ms) to execute the health checker.
   *
   * @public
   */
  addHealthChecker(service, healthChecker, interval) {
    const signalReady = this.signalReady.bind(this, service);
    const signalNotReady = this.signalNotReady.bind(this, service);

    const intervalFunc = setInterval(
      () => {
        const healthCheckData = this.healthCheckers.get(service);
        // Semaphore scheme to prevent multiple calls to the health checker
        if (!healthCheckData.inUse) {
          this.healthCheckers.set(service, { ...healthCheckData, inUse: true });
          healthChecker(signalReady, signalNotReady);
          this.healthCheckers.set(service, { ...healthCheckData, inUse: false });
        }
      },
      interval,
    );

    this.healthCheckers.set(service, { interval: intervalFunc, inUse: false });
  }

  /**
   * Removes a health checker.
   *
   * @param {string} service
   *
   * @throws if the health checker service does not match with any registered health checker.
   *
   * @public
   */
  clearHealthChecker(service) {
    // Checking if the service really has a health checker
    let isHealthCheckerRegistered = false;
    this.healthCheckers.forEach((value, key) => {
      if (key === service) {
        isHealthCheckerRegistered = true;
      }
    });
    if (isHealthCheckerRegistered) {
      const healthCheckData = this.healthCheckers.get(service);
      clearInterval(healthCheckData.interval);
      this.logger.info(`Cleared "${service}" health checker`);
      this.healthCheckers.delete(service);
    } else {
      this.logger.info(`Health checker for "${service}" not found`);
    }
  }

  /**
   * Clears all health checkers set with the `addHealthChecker` function. This function is
   * automatically set as a shutdown handler when you instantiate this class.
   *
   * @public
   */
  clearAllHealthCheckers() {
    if (this.healthCheckers.size > 0) {
      this.logger.info(`Removing ${this.healthCheckers.size} health checkers...`);
      this.healthCheckers.forEach(
        (healthCheckData, service) => this.clearHealthChecker(service),
      );
      this.healthCheckers.clear();
      this.logger.info('... successfully removed all health checkers');
    } else {
      this.logger.info('No health checkers to remove');
    }
  }
}

module.exports = Manager;
