const createExpress = require('./express-factory');
const errorTemplate = require('./backing/error-template');
const defaultErrorHandler = require('./backing/default-error-handler');
const interceptors = require('./interceptors');

module.exports = {
  createExpress,
  errorTemplate,
  defaultErrorHandler,
  interceptors,
};
