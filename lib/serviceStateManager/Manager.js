const WorkerThreads = require('worker_threads');
const lightship = require('lightship');
const lodash = require('lodash');
const util = require('util');
const path = require('path');

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

    // Applying the configurations
    const defaultLightshipConfig = {
      detectKubernetes: false,
    };
    const defaultModuleConfig = {
      'worker.enable': false,
      'worker.file': 'healthcheck/Worker.js',
    };

    this.config = {
      lightship: { ...defaultLightshipConfig, ...config.lightship },
      module: { ...defaultModuleConfig, ...config.module },
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

    if (this.config.module['worker.enable']) {
      // The channel that will be used to update the state of `serviceStatus`
      this.signalingChannel = undefined;
      this.worker = undefined;
      const workerPath = path.join(
        path.dirname(require.main.filename),
        this.config.module['worker.file'],
      );
      this.initWorker(workerPath);
    }

    this.logger.info('... Manager initialized.');
  }

  /**
   * Initializes the Worker thread that will deal with the health check.
   *
   * @param {string} workerImplementationFile file with the worker's implementation.
   *
   * @public
   */
  initWorker(workerImplementationFile) {
    this.logger.info('Initializing the Worker thread');
    this.worker = new WorkerThreads.Worker(workerImplementationFile);

    this.worker.on('error', (error) => {
      this.logger.error('An error occurred in the worker');
      this.logger.error(error.stack || error);
      this.shutdown();
    });

    this.worker.on('online', () => {
      this.signalingChannel = new WorkerThreads.MessageChannel();

      // Sending the channel to the worker, so it will be able to send signals
      this.worker.postMessage(
        { signalingChannel: this.signalingChannel.port1 },
        [this.signalingChannel.port1],
      );

      // port1 is the port used by the worker to send messages to the master
      // port2 is the port used by the master to send messages to the worker
      this.signalingChannel.port2.on('message', this.handleSignalMessages.bind(this));

      this.registerShutdownHandler(async () => {
        // By closing the signaling channel, we are signaling the worker to stop its work
        this.logger.warn('Closing the signaling channel');
        this.signalingChannel.port1.close();
        this.signalingChannel.port2.close();
      });
    });
  }

  /**
   * Handles the signaling messages, updating the Lightship's health check.
   *
   * Note that each message must have only ONE key (i.e. one service). This is done to force the
   * user to do only one check per health check function, thus not blocking the event loop for too
   * long with long operations.
   *
   * @param {object} message
   *
   * @private
   */
  handleSignalMessages(message) {
    if (Object.keys(message).length > 1) {
      this.logger.error('Incorrect usage: the status message must contain only one service status');
      this.shutdown();
    }

    try {
      this.updateState(message);
    } catch (err) {
      this.logger.error(err.stack || err);
      this.signalingChannel.port2.postMessage({ error: err.message });
    }
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
   * Signals to the health check service that the service is ready. This can be used to create
   * health checkers in the same thread as the master. This can be useful, for example, in cases
   * were you already have a connection in the master thread (e.g. MongoDB client) and want to check
   * it via built-in events (in this case, the MongoDB client has an event when the connection is
   * ready).
   *
   * @param {string} service the service to be signaled. Must be present in the context object.
   *
   * @throws if the service is not present in the context object.
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
   * @param {string} service the service to be signaled. Must be present in the context object.
   *
   * @throws if the service is not present in the context object.
   *
   * @public
   */
  signalNotReady(service) {
    const stateObject = {};
    stateObject[service] = false;
    this.updateState(stateObject);
  }
}

module.exports = Manager;
