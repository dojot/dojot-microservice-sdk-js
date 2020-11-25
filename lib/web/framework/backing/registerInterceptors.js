/**
 * Given that an interceptor is a common object, it is necessary to sanitize
 * its attributes to keep only those that are necessary for functionality.
 *
 * @param {Object} obj that represents the interceptor
 * @param {Object} logger to track the process flow
 */
const sanitize = (obj, logger) => {
  // the interceptor must contain the following primary attributes:
  const interceptorPattern = {
    name: '',
    path: [],
    middleware: [],
  };
  logger.debug('\tSanitizing the interceptor so that only the pattern remains: ', interceptorPattern);

  // Extracts from the object only the expected attributes
  const subset = Object.fromEntries(
    Object.entries(obj).filter(([key]) => Object.keys(interceptorPattern).includes(key)),
  );

  if (subset.name && typeof subset.name !== 'string') {
    throw new Error("The interceptor 'name' must be a string!");
  }

  if (subset.path && !Array.isArray(subset.path)) {
    subset.path = [subset.path];
  }

  if (subset.middleware) {
    if (Array.isArray(subset.middleware)) {
      subset.middleware = subset.middleware.flat();
    } else {
      subset.middleware = [subset.middleware];
    }
  }

  // Returns a sanitized object
  return { ...interceptorPattern, ...subset };
};

/**
 * Checks if the value of the "path" attribute is as expected (an array of String or RegExp)
 *
 * @param {Object} interceptor from which the "path" attribute will be retrieved
 * @param {Object} logger to track the process flow
 *
 * @throws an error if any configuration is missing or incorrect.
 */
const checkPath = ({ path }, logger) => {
  logger.debug('\tChecking if the interceptor has valid path values...');
  if (!path.length) {
    logger.debug("\tThe interceptor has no path value. Using '/' (root path)!");
  } else {
    const checked = path.every((value) => {
      if (typeof value !== 'string' && !(value instanceof RegExp)) {
        logger.debug('\tThe path value must be a string or instance of RegExp!');
        return false;
      }
      return true;
    });

    if (!checked) {
      throw new Error('The path values are not implemented correctly!');
    }
    logger.debug('\tThe path values are checked!');
  }
};

/**
 * Checks if the value of the "middleware" attribute is as expected (an array of functions)
 *
 * @param {Object} interceptor from which the "middleware" attribute will be retrieved
 * @param {Object} logger to track the process flow
 *
 * @throws an error if any configuration is missing or incorrect.
 */
const checkMiddleware = ({ middleware }, logger) => {
  logger.debug('\tChecking if the interceptor has middlewares to handle requests...');
  if (!middleware.length) {
    throw new Error('The interceptor has no middleware to handle requests!');
  }

  const checked = middleware.every((fn) => {
    if (!fn) {
      logger.debug('\tMiddleware has not been defined, but it should be!');
      return false;
    }
    if (typeof fn !== 'function') {
      logger.debug('\tThe middleware must be a function. This is a problem!');
      return false;
    }
    return true;
  });

  if (!checked) {
    throw new Error('Middlewares to handle requests are not implemented correctly!');
  }
  logger.debug('\tMiddlewares to handle requests are checked!');
};

/**
 * Registers request interceptors in an instance of the Express.js framework
 *
 * @param {Array} interceptorsToBeRegistered request interceptors
 * @param {Object} framework an instance of the Express.js framework
 * @param {Object} logger to track the process flow
 */
const registerInterceptors = (interceptorsToBeRegistered, framework, logger) => {
  let interceptors = interceptorsToBeRegistered;
  if (!Array.isArray(interceptors)) {
    interceptors = [interceptors];
  }

  // records each of the interceptors in Express
  interceptors.forEach((interceptorToBeRegistered) => {
    logger.debug('\tInterceptor to be registered: ', { name: interceptorToBeRegistered.name });

    // sanitizes interceptors to have only the correct and necessary attributes
    const interceptor = sanitize(interceptorToBeRegistered, logger);

    // Checks if the interceptor has a correct path and if there is
    // at least one middleware to handle the request
    checkPath(interceptor, logger);
    checkMiddleware(interceptor, logger);

    if (interceptor.path.length) {
      // Interceptor for a specific path
      framework.use(interceptor.path, interceptor.middleware);
    } else {
      // Generic interceptor for all paths
      framework.use(interceptor.middleware);
    }
    logger.debug('\tInterceptor registered! -> ', interceptor);
  });
};

module.exports = registerInterceptors;
