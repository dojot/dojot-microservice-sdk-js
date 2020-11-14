const https = require('https');

const fs = require('fs');

const { Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

// CA certificate that the client trusts.
// This CA was the one who signed the server certificate,
// so the TLS connection will be successfully established.
const trustedCA = './tls/trusted-ca.crt';

const timer = setInterval(() => {
  const timeout = 2000;

  const options = {
    protocol: 'https:',
    host: 'server',
    port: 443,
    path: '/',
    ca: fs.readFileSync(trustedCA),
    rejectUnauthorized: true,
    servername: 'server',
    timeout,
  };

  logger.info('Connecting to the server...');

  const req = https.get(options, (res) => {
    let data = '';
    /* A chunk of data has been recieved. */
    res.on('data', (chunk) => { data += chunk; });
    /* The whole response has been received. Print out the result. */
    res.on('end', () => {
      logger.info(`The server replied: ${data}`);
    });
  }).on('connect', (res, socket) => {
    logger.info('Connected to the server:', socket.address());
  }).on('error', (err) => {
    logger.info('Error connecting to the server:', err);
  }).on('timeout', () => {
    req.abort();
    logger.info('Wait timeout reached.');
  });
}, 2000);

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach(
  (sig) => process.on(sig, () => {
    clearInterval(timer);
  }),
);
