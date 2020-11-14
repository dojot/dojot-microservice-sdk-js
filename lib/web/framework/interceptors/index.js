const beaconInterceptor = require('./beacon-interceptor');
const jsonBodyParsingInterceptor = require('./json-body-parsing-interceptor');
const paginateInterceptor = require('./paginate-interceptor');
const requestIdInterceptor = require('./request-id-interceptor');
const requestLogInterceptor = require('./request-log-interceptor');
const responseCompressInterceptor = require('./response-compress-interceptor');
const staticFileInterceptor = require('./static-file-interceptor');

module.exports = {
  beaconInterceptor,
  jsonBodyParsingInterceptor,
  paginateInterceptor,
  requestIdInterceptor,
  requestLogInterceptor,
  responseCompressInterceptor,
  staticFileInterceptor,
};
