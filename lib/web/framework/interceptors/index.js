const beaconInterceptor = require('./beaconInterceptor');
const jsonBodyParsingInterceptor = require('./jsonBodyParsingInterceptor');
const paginateInterceptor = require('./paginateInterceptor');
const requestIdInterceptor = require('./requestIdInterceptor');
const requestLogInterceptor = require('./requestLogInterceptor');
const responseCompressInterceptor = require('./responseCompressInterceptor');
const staticFileInterceptor = require('./staticFileInterceptor');

module.exports = {
  beaconInterceptor,
  jsonBodyParsingInterceptor,
  paginateInterceptor,
  requestIdInterceptor,
  requestLogInterceptor,
  responseCompressInterceptor,
  staticFileInterceptor,
};
