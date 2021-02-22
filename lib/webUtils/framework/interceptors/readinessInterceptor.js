const createError = require('http-errors');

/**
 * Interceptor to allow requests only when the application is ready
 */
function createInterceptor(stateManager, logger, path = '/', environment = process.env.NODE_ENV) {
  return {
    path,
    name: 'readiness-interceptor',
    middleware: (req, res, next) => {
      if (environment === 'development') {
        logger.debug('The application is not ready, but the request will be handled in a development environment');
        next();
      } else if (stateManager.isReady()) {
        next();
      } else {
        logger.error('The application is not in a ready state, the request cannot be handled');
        next(new createError.ServiceUnavailable());
      }
    },
  };
}

module.exports = ({
  stateManager, logger, path, environment,
} = {}) => createInterceptor(stateManager, logger, path, environment);
