const createExpress = require('./createExpress');
const errorTemplate = require('./backing/errorTemplate');
const defaultErrorHandler = require('./backing/defaultErrorHandler');
const interceptors = require('./interceptors');

module.exports = {
  createExpress,
  errorTemplate,
  defaultErrorHandler,
  interceptors,
};
