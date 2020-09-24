const WorkerThreads = require('worker_threads');

const { Logger } = require('../logging/Logger');

/**
 * @module Worker worker to be used by all services that implement the Service State Manager.
 */

class HealthCheckWorker {
  /**
   * Manages the connection and message passing between the main application and its health checker
   * thread.
   */
  constructor() {
    this.healthCheckers = new Map();
    this.signalingChannel = undefined;
    this.logger = new Logger('microservice-sdk:health-check-worker');
  }

  /**
   * Initializes the worker.
   *
   * @param {number} timeout time (in ms) to wait for the master thread to send the signaling
   * channel port before returning an error (default: `10000`).
   *
   * @returns {Promise<any>}
   *
   * @public
   */
  initWorker(timeout = 10000) {
    return new Promise((resolve, reject) => {
      this.logger.info('Initializing the health checker worker thread...');
      // This timer rejects the promise if it takes too long for the master to send the port
      const timer = setTimeout(() => {
        reject(new Error('Master did not send the signaling channel port!'));
      }, timeout);

      WorkerThreads.parentPort.once('message', (message) => {
        this.logger.info('Received the signaling channel port');
        // We need to cancel the timer before proceeding
        clearTimeout(timer);
        this.signalingChannel = message.signalingChannel;

        this.signalingChannel.on('close', async () => {
          this.logger.warn('The worker is terminating...');
          await this.clearAllHealthCheckers();
          this.logger.warn('... worker has gracefully stopped.');
        });
        this.signalingChannel.on('message', (recvMessage) => {
          if (recvMessage.error) {
            throw new Error(recvMessage.error);
          }
        });

        this.logger.info('... the health checker worker thread has successfully initialized!');
        resolve();
      });
    });
  }

  /**
   * Adds a new health checker function to the worker. The function is expected to send messages
   * through the `signalingChannel` variable to the master thread informing the state of the service
   * it is checking.
   *
   * @param {string} name health checker identification.
   * @param {(signalingChannel: WorkerThreads.MessagePort) => void} func
   * @param {number} interval period of time (in ms) to execute the health checker.
   *
   * @public
   */
  addHealthChecker(name, func, interval) {
    const healthCheckFunc = setInterval(() => { func(this.signalingChannel); }, interval);
    this.healthCheckers.set(name, healthCheckFunc);
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
      this.logger.info(`Cleared "${name}" health checker`);
      this.healthCheckers.delete(name);
    } else {
      throw new Error(`Health checker "${name}" not found`);
    }
  }

  /**
   * Clears all health checkers set with the `addHealthChecker` function.
   *
   * @returns {Promise<any>}
   *
   * @public
   */
  clearAllHealthCheckers() {
    return new Promise((resolve, reject) => {
      try {
        if (this.healthCheckers.size > 0) {
          this.logger.info(`Clearing ${this.healthCheckers.size} health checkers...`);
          this.healthCheckers.forEach((interval, name) => this.clearHealthChecker(name));
          this.logger.info('Cleared the health checkers!');
        } else {
          this.logger.info('No health checkers to remove');
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = HealthCheckWorker;
