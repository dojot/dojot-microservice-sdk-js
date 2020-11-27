const { WebUtils, Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

const { routes, interceptors } = require('./backing')(logger);

// create an instance of HTTP server
const server = WebUtils.createServer({ logger });

// creates an instance of Express.js already configured
const framework = WebUtils.framework.createExpress({
  logger, server, routes, interceptors, supportWebsockets: true,
});

// emitted each time there is a request
server.on('request', framework);

// boots up the server
server.listen(80);

// graceful shutdown
['SIGTERM', 'SIGINT'].forEach(
  (sig) => process.on(sig, () => {
    server.close(() => {
      process.exit(0);
    });
  }),
);
