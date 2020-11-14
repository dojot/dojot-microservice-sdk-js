const expressFactory = require('./express-factory');
const errorTemplate = require('./backing/error-template');
const defaultErrorHandler = require('./backing/default-error-handler');
const interceptors = require('./interceptors');

module.exports = {
  expressFactory,
  errorTemplate,
  defaultErrorHandler,
  interceptors,
};
