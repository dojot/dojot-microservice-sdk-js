const express = require('express');

/**
 * Function that checks if the parameter entered represents an http verb that express.js supports
 *
 * @param {string} method or verb http.
 *
 * @returns true if it is the name of a verb accepted by the express, otherwise, false.
 */
const allowedRoutingMethods = (method) => [
  'all', 'ws', 'checkout', 'copy', 'delete', 'get', 'head',
  'lock', 'merge', 'mkactivity', 'mkcol', 'move', 'm-search',
  'notify', 'options', 'patch', 'post', 'purge', 'put',
  'report', 'search', 'subscribe', 'trace', 'unlock', 'unsubscribe',
].includes(method);

/**
 * Given that a route is a common object, it is necessary to sanitize
 * its attributes to keep only those that are necessary for functionality.
 *
 * @param {Object} obj that represents the route
 * @param {Object} logger to track the process flow
 *
 * @throws an exception if the route name or mount point is not a string
 *
 * @returns a sanitized object to be handled safely
 */
const sanitize = (obj, logger) => {
  // the route must contain the following primary attributes:
  const routePattern = {
    name: '',
    mountPoint: '',
    path: [],
    params: [],
    handlers: [],
  };
  logger.debug('\tSanitizing the route object so that only the pattern remains: ', routePattern);

  // Extracts from the object only the expected attributes
  const subset = Object.fromEntries(
    Object.entries(obj).filter(([key]) => Object.keys(routePattern).includes(key)),
  );

  if (subset.name && typeof subset.name !== 'string') {
    throw new Error("The route 'name' must be a string!");
  }

  if (subset.mountPoint && typeof subset.mountPoint !== 'string') {
    throw new Error("The route 'mountPoint' must be a string!");
  }

  if (subset.path && !Array.isArray(subset.path)) {
    subset.path = [subset.path];
  }

  if (subset.params && !Array.isArray(subset.params)) {
    subset.params = [subset.params];
  }

  if (subset.handlers && !Array.isArray(subset.handlers)) {
    subset.handlers = [subset.handlers];
  }

  // Returns a sanitized object
  return { ...routePattern, ...subset };
};

/**
 * Checks if the value of the "path" attribute is as expected (an array of String or RegExp)
 *
 * @param {Object} route from which the "path" attribute will be retrieved
 * @param {Object} logger to track the process flow
 *
 * @throws an error if any configuration is missing or incorrect.
 */
const checkPath = ({ path }, logger) => {
  logger.debug('\tChecking if the route object has valid path values...');
  if (!path.length) {
    throw new Error('The route object has no path value!');
  }

  const checked = path.every((value) => {
    if (!value) {
      logger.debug('\tRoute path value has not been defined, but it should be!');
      return false;
    }
    if (typeof value !== 'string' && !(value instanceof RegExp)) {
      logger.debug('\tRoute path value must be a string or instance of RegExp!');
      return false;
    }
    return true;
  });

  if (!checked) {
    throw new Error('Route path values are not implemented correctly!');
  }
  logger.debug('\tRoute path values are checked!');
};

/**
 * Checks if the value of the "params" attribute is as expected (an array of functions, if any)
 *
 * @param {Object} route from which the "params" attribute will be retrieved
 * @param {Object} logger to track the process flow
 *
 * @throws an error if any configuration is missing or incorrect.
 */
const checkParams = ({ params }, logger) => {
  logger.debug('\tChecking if the route object has triggers for parameters declared in the route path...');
  if (!params || !params.length) {
    logger.debug('\tThe route object has no triggers for parameters declared in the route path. OK no problem!');
  } else {
    // Each parameter must have a "name" that identifies it and a "trigger" that will
    // be fired by the Express so that the value of the parameter is manipulated
    const checked = params.every(({ name, trigger }) => {
      logger.debug(`\tChecking the trigger for the parameter: '${name}'`);
      if (!name) {
        logger.debug('\tParameter Name has not been defined, but it should be!');
        return false;
      }
      if (!trigger) {
        logger.debug('\tParameter Trigger has not been defined, but it should be!');
        return false;
      }
      if (typeof name !== 'string') {
        logger.debug('\tParameter Name must be a string!');
        return false;
      }
      if (typeof trigger !== 'function') {
        logger.debug('\tParameter Trigger must be a function!');
        return false;
      }
      return true;
    });

    if (!checked) {
      throw new Error('Triggers for the parameters in the route path are not implemented correctly!');
    }
    logger.debug('\tTriggers for the parameters on the route path are checked!');
  }
};

/**
 * Checks if the value of the "handlers" attribute is as expected (an array of handlers)
 *
 * @param {Object} route from which the "handlers" attribute will be retrieved
 * @param {Object} logger to track the process flow
 *
 * @throws an error if any configuration is missing or incorrect.
 */
const checkHandlers = ({ handlers }, logger) => {
  logger.debug('\tChecking if the route object has handlers to handle requests in the route path...');
  if (!handlers.length) {
    throw new Error('The route object has no handlers to handle requests in the route path!');
  }

  // Each handler must have a "method" that identifies the HTTP verb
  // and a "middleware" that will be fired by the Express to handle the request
  const checked = handlers.every((handler) => {
    if (!handler) {
      logger.debug('\tThe handler is not a valid object!');
      return false;
    }
    const { method, middleware } = handler;
    if (!method) {
      logger.debug("\tHandler's Routing Method has not been defined, but it should be!");
      return false;
    }
    if (!middleware) {
      logger.debug('\tHandler Middleware has not been defined, but it should be!');
      return false;
    }
    if (!allowedRoutingMethods(method)) {
      logger.debug('\tThe handler does not have a valid Routing Method!');
      return false;
    }
    if ((typeof middleware !== 'function' && !Array.isArray(middleware))
        || (Array.isArray(middleware) && middleware.some((mid) => typeof mid !== 'function'))) {
      logger.debug('\tThe middleware of the handler must be a function or an array of functions!');
      return false;
    }
    return true;
  });

  if (!checked) {
    throw new Error('Request handlers on the route path are not implemented correctly!');
  }
  logger.debug('\tRequest handlers on the route path are checked!');
};

/**
 * Registers routes in an instance of the Express.js framework
 *
 * @param {Array} routesToBeRegistered routes to handle requests
 * @param {Object} framework an instance of the Express.js framework
 * @param {Object} logger to track the process flow
 */
const registerRoutes = (routesToBeRegistered, framework, logger) => {
  let routes = routesToBeRegistered;
  if (!Array.isArray(routes)) {
    routes = [routes];
  }

  const mountingMap = new Map();

  // records each of the routes in Express
  routes.forEach((routeToBeRegistered) => {
    logger.debug('\tRoute to be registered: ', { name: routeToBeRegistered.name });

    // sanitizes routes to have only the correct and necessary attributes
    const route = sanitize(routeToBeRegistered, logger);

    checkPath(route, logger);

    checkParams(route, logger);

    checkHandlers(route, logger);

    let { mountPoint } = route;

    // the mount point must start from the root of the domain
    if (!mountPoint.startsWith('/')) {
      mountPoint = `/${mountPoint}`;
    }

    // Several routes can use the same base mount point, so
    // for that we need only one express router per mount point
    let mountRouter = mountingMap.get(mountPoint);
    if (!mountRouter) {
      mountRouter = express.Router();
      mountingMap.set(mountPoint, mountRouter);
    }

    // Defines on the router the route path, parameters
    // and request handlers according to the HTTP verb
    const expressRoute = mountRouter.route(route.path);
    route.params.forEach(({ name, trigger }) => mountRouter.param(name, trigger));
    route.handlers.forEach(({ method, middleware }) => (
      // If the framework has been enabled to work with websockets,
      // the "ws" attribute will be available on the router so that
      // middleware can be registered to work with this type of request,
      // Otherwise, all verbs that Express.js supports are accepted.
      (method === 'ws')
        ? mountRouter[method](
          route.path[0],
          (Array.isArray(middleware) ? middleware[0] : middleware),
        )
        : expressRoute[method](middleware)
    ));

    logger.debug('\tRoute registered! -> ', route);
  });

  // Register routers in the Express.js
  mountingMap.forEach((mountRouter, mountPoint) => {
    framework.use(mountPoint, mountRouter);
  });
};

module.exports = registerRoutes;
