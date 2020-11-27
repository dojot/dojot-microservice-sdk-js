const createError = require('http-errors');
const jwtDecode = require('jwt-decode');

const { WebUtils } = require('@dojot/microservice-sdk');

function createModule(logger) {
  // interceptors act on requests independently of the HTTP method,
  // it is enough that the request is on the same path in which the
  // interceptor is registered...
  const interceptors = [
  // useful interceptor to generate request IDs
    WebUtils.framework.interceptors.requestIdInterceptor(),

    // useful interceptor to convert the request body into a json object
    WebUtils.framework.interceptors.jsonBodyParsingInterceptor({
      config: {
        limit: '100kb',
      },
    }),

    // custom interceptor to extract some information from a JWT token
    {
      name: 'token-parsing-interceptor',
      path: '/private',
      middleware: (req, res, next) => {
        const err = new createError.Unauthorized();
        if (req.headers.authorization) {
          const authHeader = req.headers.authorization.split(' ');
          if (authHeader.length === 2 && authHeader[0] === 'Bearer') {
            const token = authHeader[1];
            const payload = jwtDecode(token);
            if (payload.service) {
              req.tenant = payload.service;
              return next();
            }
          }
          err.message = 'Invalid JWT token';
          return next(err);
        }
        err.message = 'Missing JWT token';
        return next(err);
      },
    },
  ];

  // The application can have multiple routes to various resources...
  const routes = [
    {
      // The route name is just an identifier for debugging
      name: 'simple-route-two-handlers',
      // The mount point can be ideal for API versioning
      mountPoint: '/api/v1',
      // The route path is attached to the mount point
      path: '/resource',
      // It is possible to have handlers for all types of HTTP verbs
      handlers: [
        {
          // we must define what is the HTTP verb in which the handler will act
          method: 'get',
          // Finally we define the middleware of Express.js
          middleware: [
            (req, res) => {
              logger.info(`GET - ${req.id} - Connection received. IP:${req.connection.remoteAddress}`);
              res.status(200).json({ result: 'GET - OK' });
            },
          ],
        },
        {
          // Another handler that acts on the HTTP verb POST
          method: 'post',
          middleware: [
            // The middleware supports async/await
            async (req, res) => {
              logger.info(`POST - ${req.id} - Connection received. IP:${req.connection.remoteAddress}. Body:`, req.body);
              const json = await Promise.resolve({ result: 'POST - async/await - OK' });
              res.status(200).json(json);
            },
          ],
        },
      ],
    },
    // The route below is mounted on a path monitored by a custom interceptor
    {
      name: 'custom-intercept-route',
      // This mount point matches the path monitored by the 'token-parsing-interceptor'
      mountPoint: '/private',
      path: '/jwt',
      handlers: [
        {
          method: 'put',
          middleware: [
            async (req, res) => {
              // The interceptor only lets the request reach this point
              // if there is a valid 'tenant' in the JWT token, and to complete,
              // it defines the 'tenant' in the request object: ${req.tenant}
              logger.info(`PUT - ${req.id} - Intercepted tenant: ${req.tenant} - Connection received. IP:${req.connection.remoteAddress}`);
              const json = await Promise.resolve({ result: 'PUT - async/await - OK' });
              res.status(200).json(json);
            },
          ],
        },
      ],
    },
    // It is possible to create routes for opening a connection via websockets
    // (as long as it is enabled in the creation of Express)
    {
      name: 'websocket-route',
      // As with Express, paths support parameters (:topic)
      path: '/topics/:topic',
      // It is possible to manipulate the value of the
      // parameters before they reach the middleware
      params: [{
        // This name must match the name defined in the route path
        name: 'topic',
        // The trigger is fired so that the parameter value
        // is treated before invoking the middlewares
        trigger: (req, res, next, value, param) => {
          req.params[param] = value.toUpperCase();
          // It is necessary to call 'next()' to continue the Express flow
          next();
        },
      }],
      handlers: {
        // The 'ws' method stands for 'websocket' and is an extension added to Express
        method: 'ws',
        // To handle websockets, we must define only one middleware
        middleware: async (ws, req) => {
          logger.info(`Websocket - ${req.id} - Connection received. IP:${req.connection.remoteAddress}. URI Param 'topic': ${req.params.topic}`);
          ws.on('message', (message) => {
            logger.info(`Websocket - ${req.id} - Received message: ${message}`);
            ws.send('ho!');
          });
          ws.send('Websocket - OK');
        },
      },
    },
  ];

  return { interceptors, routes };
}

module.exports = (logger) => createModule(logger);
