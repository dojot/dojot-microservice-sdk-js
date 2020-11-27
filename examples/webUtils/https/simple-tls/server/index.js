const { WebUtils, Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

// Path to the x509 certificate issued to the server
const cert = './tls/server.crt';

// Path to the server certificate private key
const key = './tls/server.key';

// create a simple HTTPS server without mutual authentication on TLS
const server = WebUtils.createServer({
  config: { cert, key },
  logger,
});

server.on('request', (req, res) => {
  logger.info(`Connection received. IP:${req.connection.remoteAddress}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok!');
  logger.info('Response sent to the client');
});

server.listen(443);

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach(
  (sig) => process.on(sig, () => {
    server.close(() => {
      process.exit(0);
    });
  }),
);
