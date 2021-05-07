const createError = require('http-errors');
const jwtDecode = require('jwt-decode');

/**
 * Decodes the JWT token from Keycloak that must be sent with the request.
 * The token validation is not performed, as it is expected
 * to be validated by the API Gateway.
 *
 * @param {Array}  ignoredPaths List of paths ignored by JWT verification
 * @param {string} path URL where the interceptor will be fired
 */
function createInterceptor(ignoredPaths = [], path = '/') {
  return {
    path,
    name: 'token-keycloak-parsing-interceptor',
    middleware: (req, res, next) => {
      const err = new createError.Unauthorized();

      if (ignoredPaths.some((ignore) => req.path.includes(ignore))) {
        return next();
      }

      if (req.headers.authorization) {
        const authHeader = req.headers.authorization.split(' ');

        if (authHeader.length === 2 && authHeader[0] === 'Bearer') {
          const token = authHeader[1];
          const payload = jwtDecode(token);
          if (payload.iss) {
            req.tenant = payload.iss.substring(payload.iss.lastIndexOf('/') + 1);
            return next();
          }
        }

        err.message = 'Invalid JWT token';
        return next(err);
      }

      err.message = 'Missing JWT token';
      return next(err);
    },
  };
}

module.exports = ({ ignoredPaths, path } = {}) => createInterceptor(ignoredPaths, path);
