const express = require('express');
const expressWS = require('express-ws');

/* This library is about what happens when you hit an async error. */
require('express-async-errors');

const registerInterceptors = require('./backing/registerInterceptors');

const registerRoutes = require('./backing/registerRoutes');

const defaultErrorHandler = require('./backing/defaultErrorHandler');

const { NotFound } = require('./backing/errorTemplate');

/**
 * Creates and configures an instance of the express framework.
 *
 * @param {Object} logger to track the process flow
 * @param {Object} server required if you want to enable support for websockets
 * @param {Array} routes for handling requests
 * @param {Array} interceptors interceptors that act on requests before they reach route handlers
 * @param {Array} errorHandlers (pure middleware) that handles errors
 * @param {Boolean} supportWebsockets for protocol upgrade (from HTTP to WS)
 * @param {Boolean} supportTrustProxy Express will have knowledge that it's sitting behind a proxy
 *                                    and that the X-Forwarded-* header fields may be trusted, which
 *                                    otherwise may be easily spoofed.
 * @param {Boolean} catchInvalidRequest (404-Not Found) and forward to error handler.
 *
 * @returns an instance of the Express framework still unlinked from the web server.
 */
function createObject(
  logger, server,
  routes, interceptors,
  errorHandlers = [defaultErrorHandler({ logger })],
  supportWebsockets = false,
  supportTrustProxy = false,
  catchInvalidRequest = true,
) {
  logger.debug('Creating and configuring the Express Framework...');
  const framework = express();

  if (supportWebsockets) {
    // Lets it define WebSocket endpoints like any other type of route
    // and applies regular Express middleware.
    expressWS(framework, server);
    logger.debug('\tWebsockets support enabled!');
  }

  // When running an Express Framework behind a proxy
  if (supportTrustProxy) {
    framework.set('trust proxy', true);
    logger.debug('\tTrust Proxy support enabled!');
  }

  // Configures middlewares as the highest level "interceptors" for the application.
  // These middlewares are executed before any logic associated with HTTP methods.
  if (interceptors) {
    logger.debug('\tRegistering highest level "interceptors" for the application...');
    registerInterceptors(interceptors, framework, logger);
    logger.debug('\tInterceptors for the application have been registered!');
  }

  // defines routing using methods of the Express object that correspond to HTTP methods
  if (routes) {
    logger.debug('\tRegistering routes...');
    registerRoutes(routes, framework, logger);
    logger.debug('\tAll routes have been registered!');
  }

  // catch invalid request (404-Not Found) and forward to error handler
  if (catchInvalidRequest) {
    framework.use((req, res, next) => {
      next(NotFound());
    });
  }

  if (errorHandlers) {
    logger.debug('\tUsing custom error handler!');
    errorHandlers.forEach((errorHandler) => {
      framework.use(errorHandler);
    });
  }

  logger.debug('Express Framework successfully configured!');
  return framework;
}

module.exports = ({
  logger,
  server,
  routes,
  interceptors,
  errorHandlers,
  supportWebsockets,
  supportTrustProxy,
  catchInvalidRequest,
}) => createObject(
  logger, server, routes, interceptors, errorHandlers,
  supportWebsockets, supportTrustProxy, catchInvalidRequest,
);
