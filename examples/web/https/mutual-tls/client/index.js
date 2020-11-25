const https = require('https');

const fs = require('fs');

const { Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

// Path to the x509 certificate issued to the client
const cert = process.env.CLIENT_CERT;

// Path to the client certificate private key
const key = process.env.CLIENT_CERT_KEY;

// CA certificate that the client trusts.
// This CA was the one who signed the server certificate,
// so the TLS connection will be successfully established.
const ca = process.env.SERVER_CA_CERT;

const timer = setInterval(() => {
  const timeout = 2000;

  const options = {
    protocol: 'https:',
    host: 'server',
    port: 443,
    path: '/',
    cert: fs.readFileSync(cert),
    key: fs.readFileSync(key),
    ca: fs.readFileSync(ca),
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
