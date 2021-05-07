const beaconInterceptor = require('./beaconInterceptor');
const jsonBodyParsingInterceptor = require('./jsonBodyParsingInterceptor');
const paginateInterceptor = require('./paginateInterceptor');
const readinessInterceptor = require('./readinessInterceptor');
const requestIdInterceptor = require('./requestIdInterceptor');
const requestLogInterceptor = require('./requestLogInterceptor');
const responseCompressInterceptor = require('./responseCompressInterceptor');
const staticFileInterceptor = require('./staticFileInterceptor');
const tokenParsingInterceptor = require('./tokenParsingInterceptor');
const tokenKeycloakParsingInterceptor = require('./tokenKeycloakParsingInterceptor');

module.exports = {
  beaconInterceptor,
  jsonBodyParsingInterceptor,
  paginateInterceptor,
  readinessInterceptor,
  requestIdInterceptor,
  requestLogInterceptor,
  responseCompressInterceptor,
  staticFileInterceptor,
  tokenParsingInterceptor,
  tokenKeycloakParsingInterceptor,
};
