const WorkerThreads = require('worker_threads');

const { Logger } = require('../logging/Logger');

const logger = new Logger('microservice-sdk:health-check-worker');

class Worker {
  /**
   * Manages the connection and message passing between the main application and its health checker
   * thread.
   */
  constructor() {
    /**
     * @type {Map<string, NodeJS.Timeout>}
     */
    this.healthCheckers = new Map();
    /**
     * @type {WorkerThreads.MessageChannel}
     */
    this.signalingChannel = null;
  }

  /**
   * Initializes the worker.
   *
   * @param {number} timeout time (in ms) to wait for the master thread to send the signaling
   * channel port before returning an error (default: `10000`).
   *
   * @returns {Promise<Error | void>}
   *
   * @public
   */
  initWorker(timeout = 10000) {
    return new Promise((resolve, reject) => {
      logger.info('Initializing the health checker worker thread...');
      // This timer rejects the promise if it takes too long for the master to send the port
      const timer = setTimeout(() => {
        reject(new Error('Master did not send the signaling channel port!'));
      }, timeout);

      logger.info('Waiting the signaling channel to be sent by the master...');
      WorkerThreads.parentPort.once('message', (message) => {
        logger.info('... received the signaling channel port');
        // We need to cancel the timer before proceeding
        clearTimeout(timer);
        this.signalingChannel = message.signalingChannel;

        this.signalingChannel.on('close', async () => {
          logger.warn('The worker is terminating...');
          await this.clearAllHealthCheckers();
          logger.warn('... worker has gracefully stopped.');
        });
        this.signalingChannel.on('message', (recvMessage) => {
          if (recvMessage.error) {
            throw new Error(recvMessage.error);
          }
        });

        logger.info('... the health checker worker thread has successfully initialized!');
        resolve();
      });
    });
  }

  /**
   * Send a message to the master to signal that the `service` is ready.
   *
   * @param {string} service
   *
   * @public
   */
  signalReady(service) {
    const stateObject = {};
    stateObject[service] = true;
    this.signalingChannel.postMessage(stateObject);
  }

  /**
   * Send a message to the master to signal that the `service` is not ready.
   *
   * @param {string} service
   *
   * @public
   */
  signalNotReady(service) {
    const stateObject = {};
    stateObject[service] = false;
    this.signalingChannel.postMessage(stateObject);
  }

  /**
   * Adds a new health checker function to the worker. The function is expected to send messages
   * through the `signalingChannel` variable to the master thread informing the state of the service
   * it is checking.
   *
   * @param {string} name health checker identification.
   * @param {(Function, Function) => void} func function to be registered as a health checker. It
   * should receive two functions as parameters: `signalReady` and `signalNotReady`. Use them to
   * submit the state of your service to the master.
   * @param {number} interval period of time (in ms) to execute the health checker.
   *
   * @public
   */
  addHealthChecker(name, func, interval) {
    const intervalFunc = setInterval(
      () => {
        func(this.signalReady.bind(this), this.signalNotReady.bind(this));
      },
      interval,
    );
    this.healthCheckers.set(name, intervalFunc);
  }

  /**
   * Removes a health checker from the list.
   *
   * @param {string} name
   *
   * @throws if the health checker name does not match with any registered health checker.
   *
   * @public
   */
  clearHealthChecker(name) {
    if (this.healthCheckers.get(name)) {
      clearInterval(this.healthCheckers.get(name));
      logger.info(`Cleared "${name}" health checker`);
      this.healthCheckers.delete(name);
    } else {
      throw new Error(`Health checker "${name}" not found`);
    }
  }

  /**
   * Clears all health checkers set with the `addHealthChecker` function.
   *
   * @returns {Promise<Error | void>}
   *
   * @public
   */
  clearAllHealthCheckers() {
    return new Promise((resolve, reject) => {
      try {
        if (this.healthCheckers.size > 0) {
          logger.info(`Clearing ${this.healthCheckers.size} health checkers...`);
          this.healthCheckers.forEach((interval, name) => this.clearHealthChecker(name));
          logger.info('Cleared the health checkers!');
        } else {
          logger.info('No health checkers to remove');
        }
        resolve();
      } catch (error) {
        reject(error.stack || error);
      }
    });
  }
}

module.exports = Worker;
