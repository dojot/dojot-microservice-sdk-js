const express = require('express');
const expressWS = require('express-ws');
const createError = require('http-errors');

/* This library is about what happens when you hit an async error. */
require('express-async-errors');

const registerInterceptors = require('./backing/register-interceptors');

const registerRoutes = require('./backing/register-routes');

/**
 * Creates and configures an instance of the express framework.
 *
 * @param {Object} config to be made in the express framework
 * @param {Array} interceptors interceptors that act on requests before they reach route handlers
 * @param {Array} routes for handling requests
 * @param {Array} errorHandlers (pure middleware) that handles errors
 * @param {http.Server} server required if you want to enable support for websockets
 * @param {Object} logger to track the process flow
 *
 * @returns an instance of the Express framework still unlinked from the web server.
 */
function createObject(config, interceptors, routes, errorHandlers, server, logger) {
  logger.debug('Creating and configuring the Express Framework...');
  const framework = express();

  if (config.websocket) {
    // Lets it define WebSocket endpoints like any other type of route
    // and applies regular Express middleware.
    expressWS(framework, server);
    logger.debug('\tWebsockets support enabled!');
  }

  // When running an Express Framework behind a proxy
  if (config.trustproxy) {
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

  // catch 404 and forward to error handler
  framework.use((req, res, next) => {
    next(new createError.NotFound());
  });

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
  config,
  interceptors,
  routes,
  errorHandlers,
  server,
  logger,
}) => createObject(config, interceptors, routes, errorHandlers, server, logger);
