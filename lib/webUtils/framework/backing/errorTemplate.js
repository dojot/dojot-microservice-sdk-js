const createError = require('http-errors');

/**
 * Creates an error object with HTTP and json status with message and detail
 *
 * @param {number} code HTTP error code
 * @param {string} message Error description message
 * @param {object} detail Object with more information about the error
 *
 * @returns an Error object with HTTP code, error description and optional details
 */
function httpError(code, message, detail) {
  const error = createError(code);
  if (message) {
    if (typeof message !== 'string') {
      throw new Error('The message parameter must be a string!');
    }
    // JSON to be returned by the HTTP response
    error.responseJSON = { error: message };
    if (detail) {
      error.responseJSON.detail = detail;
    }
  }
  return error;
}

const wrap = (statusCode) => (msg, detail) => httpError(statusCode, msg, detail);

module.exports = {
  BadRequest: wrap(400),
  Unauthorized: wrap(401),
  PaymentRequired: wrap(402),
  Forbidden: wrap(403),
  NotFound: wrap(404),
  MethodNotAllowed: wrap(405),
  NotAcceptable: wrap(406),
  ProxyAuthenticationRequired: wrap(407),
  RequestTimeout: wrap(408),
  Conflict: wrap(409),
  Gone: wrap(410),
  LengthRequired: wrap(411),
  PreconditionFailed: wrap(412),
  PayloadTooLarge: wrap(413),
  URITooLong: wrap(414),
  UnsupportedMediaType: wrap(415),
  RangeNotSatisfiable: wrap(416),
  ExpectationFailed: wrap(417),
  ImATeapot: wrap(418),
  MisdirectedRequest: wrap(421),
  UnprocessableEntity: wrap(422),
  Locked: wrap(423),
  FailedDependency: wrap(424),
  UnorderedCollection: wrap(425),
  UpgradeRequired: wrap(426),
  PreconditionRequired: wrap(428),
  TooManyRequests: wrap(429),
  RequestHeaderFieldsTooLarge: wrap(431),
  UnavailableForLegalReasons: wrap(451),
  InternalServerError: wrap(500),
  NotImplemented: wrap(501),
  BadGateway: wrap(502),
  ServiceUnavailable: wrap(503),
  GatewayTimeout: wrap(504),
  HTTPVersionNotSupported: wrap(505),
  VariantAlsoNegotiates: wrap(506),
  InsufficientStorage: wrap(507),
  LoopDetected: wrap(508),
  BandwidthLimitExceeded: wrap(509),
  NotExtended: wrap(510),
  NetworkAuthenticationRequire: wrap(511),
};
