const lightship = require('lightship');
const util = require('util');

const { Logger } = require('../logging/Logger');

class ServiceStateManager {
  /**
   * Manages the services' states, providing health check and shutdown utilities.
   *
   * @param {lightship.ConfigurationInputType} config module configuration object. Check the
   * documentation for more details about its accepted values.
   */
  constructor(config = {}) {
    /**
     * @type {Logger}
     * @private
     */
    this.logger = new Logger('microservice-sdk:service-state-manager');
    this.logger.info('Initializing the ServiceStateManager...');

    /**
     * @type {Map<string, {interval: NodeJS.Timeout, inUse: boolean, status: boolean}>}
     * @private
     */
    this.services = new Map();

    // Applying the configurations
    const defaultLightshipConfig = {
      detectKubernetes: false,
      terminate: () => {
        this.logger.warn('process did not exit on its own; investigate what is keeping the event loop active');
        process.exit(1);
      },
    };

    /**
     * @type {lightship.ConfigurationInputType}
     * @private
     */
    this.config = {
      lightship: {
        ...defaultLightshipConfig,
        ...config.lightship,
      },
    };

    this.logger.info(`ServiceStateManager configuration: ${util.inspect(this.config)}`);

    /**
     * @type {lightship.LightshipType}
     * @private
     */
    this.lightship = lightship.createLightship(this.config.lightship);
    // Since these functions will behave the same way as the Lightship ones, we will directly "map"
    // them as if they are from our class
    this.createBeacon = this.lightship.createBeacon.bind(this.lightship);
    this.isServerReady = this.lightship.isServerReady.bind(this.lightship);
    this.isServerShuttingDown = this.lightship.isServerShuttingDown.bind(this.lightship);
    /**
    * All registered shutdown handlers are
    * executed in the order they have been registered.
    * @type {function}
    */
    this.registerShutdownHandler = this.lightship.registerShutdownHandler.bind(this.lightship);
    this.shutdown = this.lightship.shutdown.bind(this.lightship);
    this.registerShutdownHandler(this.removeAllServices.bind(this));

    this.readyState = false;

    this.logger.info('... ServiceStateManager initialized.');
  }

  /**
   * Changes the Lightship state depending on the statuses of the registered services. If all of
   * them are `true`, them `signalReady` is called; `signalNotReady` is called otherwise.
   *
   * @private
   */
  updateLightshipState() {
    let isReady = true;
    this.services.forEach((value) => {
      isReady = isReady && value.status;
    });

    if (isReady) {
      this.lightship.signalReady();
    } else {
      this.lightship.signalNotReady();
    }
    this.readyState = isReady;
  }

  /**
   * Updates the state of a service in the `services` Map.
   *
   * @param {string} service
   * @param {boolean} status
   *
   * @private
   */
  updateState(service, status) {
    if (!this.services.has(service)) {
      this.logger.debug(`Service "${service}" is not registered, will not signalize anything`);
      return;
    }

    const statusObj = { status };
    this.services.set(service, { ...this.services.get(service), ...statusObj });

    this.updateLightshipState();
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
    // We need to call the code inside an immediate because the states of other services were being
    // overwritten
    setImmediate(this.updateState.bind(this, service, true));
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
    // We need to call the code inside an immediate because the states of other services were being
    // overwritten
    setImmediate(this.updateState.bind(this, service, false));
  }

  /**
   * Indicates whether all services are ready or not
   *
   * @returns true if all services are ready (according to the last check), otherwise, false.
   *
   * @public
   */
  isReady() {
    return (this.readyState);
  }

  /**
   * Registers a new service in the Manager. It does not add any health checkers, if you want to add
   * one, check the addHealthChecker function.
   *
   * @param {string} service
   *
   * @public
   */
  registerService(service) {
    if (this.services.has(service)) {
      throw new Error(`service "${service}" is already registered`);
    }

    this.services.set(service, { interval: undefined, inUse: false, status: false });

    this.logger.debug(`Service ${service} was registered`);
  }

  /**
   * Adds a new health checker function for an specific service.
   *
   * @param {string} service service to be checked by the health checker.
   * @param {Function} func __async function__ to be registered as a health checker. It should
   * receive two functions as parameters: `signalReady` and `signalNotReady` that are already hooked
   * to the service you passed.
   * @param {number} interval period of time (in ms) to execute the health checker, defaults to
   * 30000.
   *
   * @public
   */
  addHealthChecker(service, healthChecker, interval = 30000) {
    if (!this.services.has(service)) {
      throw new Error(`service "${service}" is not registered`);
    }

    const serviceEntry = this.services.get(service);

    if (serviceEntry.interval) {
      throw new Error(`service "${service}" already has a registered health checker`);
    }

    const signalReady = this.signalReady.bind(this, service);
    const signalNotReady = this.signalNotReady.bind(this, service);

    const intervalFunc = setInterval(
      async () => {
        const serviceData = this.services.get(service);
        // Semaphore scheme to prevent multiple calls to the health checker
        if (!serviceData.inUse) {
          try {
            this.services.set(service, { ...serviceData, inUse: true });
            await healthChecker(signalReady, signalNotReady);
            this.services.set(service, { ...serviceData, inUse: false });
          } catch (error) {
            this.logger.error(`The "${service}" health checker threw an error`);
            this.logger.error(error.stack || error);
          }
        }
      },
      interval,
    );

    this.services.set(service, { ...serviceEntry, ...{ interval: intervalFunc } });

    this.logger.debug(`Health checker for service ${service} was registered`);
  }

  /**
   * Removes a service.
   *
   * @param {string} service
   *
   * @private
   */
  removeService(service) {
    if (this.services.has(service)) {
      const serviceData = this.services.get(service);
      clearInterval(serviceData.interval);
      this.services.delete(service);
      this.logger.warn(`Removed service "${service}"`);
    } else {
      this.logger.warn(`Service "${service}" not found`);
    }
  }

  /**
   * Clears all service set with the `addHealthChecker` function. This function is automatically set
   * as a shutdown handler when you instantiate this class.
   *
   * @private
   */
  removeAllServices() {
    if (this.services.size > 0) {
      this.logger.warn(`Removing ${this.services.size} services...`);
      this.services.forEach(
        (serviceData, service) => this.removeService(service),
      );
      this.services.clear();
      this.logger.warn('... successfully removed all services');
    } else {
      this.logger.warn('No services to remove');
    }
  }
}

module.exports = ServiceStateManager;
