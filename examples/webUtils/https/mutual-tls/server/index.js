const { WebUtils, Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

// Path to the x509 certificate issued to the server
const cert = process.env.SERVER_CERT;

// Path to the server certificate private key
const key = process.env.SERVER_CERT_KEY;

// For connections that require mutual TLS, we can pass on an array of
// CA certificates that we consider to be trusted by the application.
const ca = process.env.CLIENT_CA_CERT.split(',');

// create a HTTPS server with mutual authentication on TLS
const server = WebUtils.createServer({
  config: {
    cert, key, ca, requestCert: true, rejectUnauthorized: true,
  },
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
