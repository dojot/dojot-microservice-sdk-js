const WorkerThreads = require('worker_threads');
const lightship = require('lightship');
const lodash = require('lodash');
const path = require('path');

const { Logger } = require('../logging/Logger');

class ServiceStateManager {
  /**
   * Manages the services' states, providing health check and shutdown utilities.
   *
   * @param {object} context object with the services that are going to be checked in the
   * health check. Make sure to implement all of the services described in this object in the
   * worker.
   * @param {string} workerImplementationFile file with the worker's implementation. Defaults to
   * `healthcheck/Worker.js`.
   * @param {lightship.ConfigurationInputType} lightshipConfig lightship configuration. Check its
   * documentation for more details. Defaults to `{ detectKubernetes: false }` (if it is true, the
   * port is randomly chosen).
   */
  constructor(context,
    workerImplementationFile = 'healthcheck/Worker.js',
    lightshipConfig = { detectKubernetes: false }) {
    this.logger = new Logger('microservice-sdk:service-state-manager');

    this.logger.info('Initializing the ServiceStateManager...');
    this.context = context;

    this.lightship = lightship.createLightship(lightshipConfig);
    // Since these functions will behave the same way as the Lightship ones, we will directly "map"
    // them as if they are from our class
    this.registerShutdownHandler = this.lightship.registerShutdownHandler;
    this.shutdown = this.lightship.shutdown;
    this.createBeacon = this.lightship.createBeacon;

    this.worker = undefined;
    // The channel that will be used to update the state of `context`
    this.signalingChannel = undefined;

    this.initWorker(path.join(path.dirname(require.main.filename), workerImplementationFile));

    this.logger.info('... ServiceStateManager initialized.');
  }

  /**
   * Initializes the Worker thread that will deal with the health check.
   *
   * @param {string} workerImplementationFile file with the worker's implementation.
   *
   * @public
   */
  initWorker(workerImplementationFile) {
    this.logger.info(workerImplementationFile);
    this.logger.info('Initializing the Worker thread');
    this.worker = new WorkerThreads.Worker(workerImplementationFile);
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
        // WorkerThreads.parentPort.close();
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
      this.signalingChannel.port2.postMessage({ error: err.message });
    }
  }

  /**
   * Updates the state of a service in the context object.
   *
   * @param {{string: boolean}} state the state to be applied.
   *
   * @throws if the status is not a boolean.
   * @throws if the service is not present in the context object.
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

    const isServiceRegistered = Object.keys(this.context).some((value) => value === service);
    if (!isServiceRegistered) {
      throw new Error('Service is not registered');
    }

    this.context = Object.assign(this.context, state);

    // Signaling to the lightship instance whether the services are ready or not
    if (lodash.every(this.context, (value) => value)) {
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
   * @throws if the status is not a boolean.
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
   * @throws if the status is not a boolean.
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

module.exports = ServiceStateManager;
