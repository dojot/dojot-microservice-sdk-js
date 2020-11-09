/**
 * Sample usage of the ServiceStateManager module. It creates an HTTP server and activates its
 * health check.
 *
 * In this example, you can either use the health check in the worker thread and in the master
 * thread. Simply change the value for the variable `enableWorker` to change its behaviour. In a
 * real service, you shouldn't do that: you must analyse both methods of health checking and use the
 * appropriate one for each module you'd like to check the health.
 */
const express = require('express');
const superagent = require('superagent');

const { ServiceStateManager, Logger } = require('@dojot/microservice-sdk');

const logger = new Logger('test-server');

/**
 * Sleeps for the number of milliseconds that is passed.
 *
 * @param {number} ms number of milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const initExpress = (stateManager) => {
  const app = express();

  app.get('/hello', async (req, res) => {
    res.status(200).send('hi!');
  });

  /*
   * You can request this endpoint after the server has started and before it is being closed to see
   * the beacon in action: it prevents the program from stopping before the job it encapsulates is
   * done. Doing this defensive code in your endpoints is recommended.
   */
  app.get('/long', async (req, res) => {
    const beacon = stateManager.createBeacon();
    await sleep(20000);
    res.status(200).send('hi!');
    await beacon.die();
  });

  return app;
};

const main = () => {
  const eventBasedHealthCheck = (process.env.ENABLE_EVENT_BASED_HEALTH_CHECK === 'true');
  /**
   * Initializing the manager, it stores the status of each service and provides the endpoints. This
   * should be instantiated in your application
   */
  const stateManager = new ServiceStateManager.Manager(['server']);
  const app = initExpress(stateManager);

  // Retrieving the health check status from the endpoint
  setInterval(() => {
    superagent
      .get('localhost:9000/health')
      .send()
      .then(() => {
        logger.info('Health check status is OK');
      })
      .catch(() => {
        logger.warn('Health check status is NOT OK');
      });
  }, 1000);

  // Initializing the server with a delay
  setTimeout(() => {
    const server = app.listen(8080, () => {
      logger.info('The server has started!');
    });

    // Example of event-based health checker
    if (eventBasedHealthCheck) {
      // Using events from the server to create the health checker
      server.on('listening', () => {
        stateManager.signalReady('server');
      });
      server.on('close', () => {
        logger.info('Received close event');
        stateManager.signalNotReady('server');
      });
      server.on('error', () => {
        logger.info('Received error event');
        stateManager.signalNotReady('server');
        /**
         * If you'd like to stop the program, you shouldn't call process.exit() or anything related
         * to it; you should register shutdown handlers using the `registerShutdownHandler` function
         * from the manager instance and then call the `shutdown` function to stop your app. This
         * will ensure you have a graceful shutdown.
         */
        stateManager.shutdown();
      });
    // Example of ServiceStateManager-controlled health checker
    } else {
      const httpHealthChecker = (signalReady, signalNotReady) => {
        superagent
          .get('localhost:8080/hello')
          .send()
          .then(() => {
            signalReady('server');
          })
          .catch(() => {
            signalNotReady('server');
          });
      };

      stateManager.addHealthChecker('server', httpHealthChecker, 5000);
    }

    stateManager.registerShutdownHandler(() => new Promise((resolve, reject) => {
      logger.warn('Closing the server...');
      server.close((error) => {
        if (error) {
          logger.error(error.stack || error);
          reject(error.message);
        } else {
          logger.info('... successfully closed the server!');
          resolve();
        }
      });
    }));
  }, 6000);

  setTimeout(() => {
    /**
     * Shutting down the server after some time; calling this function will automatically change the
     * status of the server to SERVER_IS_SHUTTING_DOWN.
     */
    stateManager.shutdown();
  }, 16000);
};

main();
