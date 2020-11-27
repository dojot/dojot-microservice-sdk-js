const http = require('http');
const https = require('https');
const fs = require('fs');

const containsAll = (source, target) => target.every((el) => source.includes(el));

/**
 * Creates a simple HTTP server or
 * an HTTPS server if the TLS settings are informed:
 *  - 'cert': path to the certificate to be presented by the server
 *  - 'key' : path to the server certificate private key
 *  - 'ca'  : List of paths to CA certificates that the server should trust
 *
 * @param {Object} logger to track the process flow
 * @param {Object} config to be passed on to the server
 *
 * @returns an instance of the web server not yet started.
 *
 * @throws an error if any configuration is incorrect (for instance invalid files)
 */
function createObject(logger, config = {}) {
  let server = null;
  if (containsAll(Object.keys(config), ['cert', 'key'])) {
    const serverCfg = { ...config };

    serverCfg.cert = fs.readFileSync(serverCfg.cert);
    serverCfg.key = fs.readFileSync(serverCfg.key);

    if (serverCfg.ca) {
      if (!Array.isArray(serverCfg.ca)) {
        serverCfg.ca = [serverCfg.ca];
      }
      serverCfg.ca = serverCfg.ca.map((filename) => fs.readFileSync(filename));
    }

    logger.debug('Creating the Web Server (with TLS encryption)');
    server = https.createServer(serverCfg);
  } else {
    logger.debug('Creating the Web Server');
    server = http.createServer(config);
  }
  logger.debug('Web Server created!');
  return server;
}

module.exports = ({ logger, config }) => createObject(logger, config);
