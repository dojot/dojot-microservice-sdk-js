const superagent = require('superagent');

const { ServiceStateManager, Logger } = require('@dojot/microservice-sdk');

const init = async () => {
  const logger = new Logger('health-check-worker');

  const worker = new ServiceStateManager.Worker();
  try {
    await worker.initWorker();
  } catch (error) {
    logger.error(error.stack || error);
    process.exit(1);
  }

  // We could've done this health check in the master too, since the express server is running
  // there, but it is only an example to show how to build a functional worker.
  const httpHealthChecker = (signalReady, signalNotReady) => {
    superagent
      .get('localhost:8080/hello')
      .send()
      .then(() => {
        logger.warn('Server is healthy');
        signalReady('server');
      })
      .catch(() => {
        logger.warn('Server is not healthy');
        signalNotReady('server');
      });
  };

  worker.addHealthChecker('http', httpHealthChecker, 5000);
};

init();
