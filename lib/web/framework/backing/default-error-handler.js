/**
 * Default Express Error Handler
 *
 * @param {object} param with a "logger" attribute to be used by the error handler
 *
 * @returns an express middleware to handle errors.
 */
module.exports = ({ logger }) => (
  /**
   * Middleware to be registered in express as an error handler
   */
  (err, req, res, next) => {
    // try to use the logger in the request scope if any, otherwise use the general logger
    const currentLogger = req.logger || logger;
    currentLogger.debug(err);

    // Pass control to custom error middleware if headers have already been sent
    if (res.headersSent) {
      return next(err);
    }

    // Check that the error has a defined status code or if not,
    // we know that it is an unexpected internal error
    const status = err.status || 500;

    if (status === 500) {
      // Status code = 500 means that there was an unexpected error...
      currentLogger.error(err);

      // Internal errors should not be exposed to the API client,
      // but if the service is running in a "development" environment,
      // it is interesting that the developer has access to that error
      res.status(status).json({
        message: (process.env.NODE_ENV !== 'development') ? 'An unexpected error has occurred.' : err.message,
      });
    } else if (err.responseBody) {
      // If the error object has the attribute "responseBody",
      // then it will be sent in the response body as JSON
      res.status(status).json(err.responseBody);
    } else if (err.message) {
      // Every error object has the attribute "message",
      // it will be sent in the response body as JSON
      res.status(status).json({ message: err.message });
    } else {
      // Finally, only the status code is sent and nothing in the response body.
      res.sendStatus(status);
    }

    // At this point, error handling is ended, that is,
    // no other error middleware will be invoked
    return null;
  }
);
