const lightship = require('lightship');
const util = require('util');

const { Logger } = require('../logging/Logger');

class Manager {
  /**
   * Manages the services' states, providing health check and shutdown utilities.
   *
   * @param {object} config module configuration object. Check the documentation for more details
   * about its accepted values.
   */
  constructor(config = {}) {
    this.logger = new Logger('microservice-sdk:service-state-manager');
    this.logger.info('Initializing the Manager...');

    /**
     * @type {Map<string, {interval: NodeJS.Timeout, inUse: boolean, status: boolean}>}
     */
    this.services = new Map();

    // Applying the configurations
    const defaultLightshipConfig = {
      detectKubernetes: false,
    };

    this.config = {
      lightship: { ...defaultLightshipConfig, ...config.lightship },
    };

    this.logger.info(`Manager configuration: ${util.inspect(this.config)}`);

    this.lightship = lightship.createLightship(this.config.lightship);
    // Since these functions will behave the same way as the Lightship ones, we will directly "map"
    // them as if they are from our class
    this.createBeacon = this.lightship.createBeacon.bind(this.lightship);
    this.isServerReady = this.lightship.isServerReady.bind(this.lightship);
    this.isServerShuttingDown = this.lightship.isServerShuttingDown.bind(this.lightship);
    this.registerShutdownHandler = this.lightship.registerShutdownHandler.bind(this.lightship);
    this.shutdown = this.lightship.shutdown.bind(this.lightship);

    this.registerShutdownHandler(() => this.clearAllHealthCheckers());

    this.logger.info('... Manager initialized.');
  }

  /**
   * Updates the state of a service in the `services` Map.
   *
   * @param {string} service
   * @param {boolean} status
   *
   * @throws if the service is not present in the `services` object.
   *
   * @private
   */
  updateState(service, status) {
    if (!this.services.has(service)) {
      throw new Error('Service is not registered');
    }

    const statusObj = { status };
    this.services.set(service, { ...this.services.get(service), ...statusObj });

    let isReady = true;
    this.services.forEach((value) => {
      if (!value.status) {
        isReady = false;
      }
    });

    if (isReady) {
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
   * @param {string} service the service to be signaled.
   *
   * @throws if the service is not registered.
   *
   * @public
   */
  signalReady(service) {
    this.updateState(service, true);
  }

  /**
   * Signals to the health check service that the service is not ready.
   *
   * @param {string} service the service to be signaled.
   *
   * @throws if the service is not registered.
   *
   * @public
   */
  signalNotReady(service) {
    this.updateState(service, false);
  }

  /**
   * Adds a new health checker function for an specific service.
   *
   * @param {string} service service to be checked by the health checker.
   * @param {Function} func function to be registered as a health checker. It should receive two
   * functions as parameters: `signalReady` and `signalNotReady`. They are already hooked to the
   * service you passed.
   * @param {number} interval period of time (in ms) to execute the health checker, defaults to
   * 30000.
   *
   * @public
   */
  addHealthChecker(service, healthChecker, interval = 30000) {
    if (this.services.has(service)) {
      throw new Error(`service "${service}" already has a registered health checker`);
    }

    const signalReady = this.signalReady.bind(this, service);
    const signalNotReady = this.signalNotReady.bind(this, service);

    const intervalFunc = setInterval(
      () => {
        const serviceData = this.services.get(service);
        // Semaphore scheme to prevent multiple calls to the health checker
        if (!serviceData.inUse) {
          this.services.set(service, { ...serviceData, inUse: true });
          healthChecker(signalReady, signalNotReady);
          this.services.set(service, { ...serviceData, inUse: false });
        }
      },
      interval,
    );

    this.services.set(service, { interval: intervalFunc, inUse: false, status: false });
  }

  /**
   * Removes a health checker.
   *
   * @param {string} service
   *
   * @public
   */
  clearHealthChecker(service) {
    if (this.services.has(service)) {
      const serviceData = this.services.get(service);
      clearInterval(serviceData.interval);
      this.logger.info(`Cleared "${service}" health checker`);
      this.services.delete(service);
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
    if (this.services.size > 0) {
      this.logger.info(`Removing ${this.services.size} health checkers...`);
      this.services.forEach(
        (serviceData, service) => this.clearHealthChecker(service),
      );
      this.services.clear();
      this.logger.info('... successfully removed all health checkers');
    } else {
      this.logger.info('No health checkers to remove');
    }
  }
}

module.exports = Manager;
