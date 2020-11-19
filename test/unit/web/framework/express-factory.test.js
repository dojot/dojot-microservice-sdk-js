jest.mock('express-ws', () => jest.fn());
jest.mock('../../../../lib/web/framework/backing/register-interceptors', () => jest.fn());
jest.mock('../../../../lib/web/framework/backing/register-routes', () => jest.fn());
jest.mock('../../../../lib/web/framework/backing/default-error-handler', () => (
  jest.fn(() => jest.fn())
));

const request = require('supertest');
const expressWS = require('express-ws');
const registerInterceptors = require('../../../../lib/web/framework/backing/register-interceptors');
const registerRoutes = require('../../../../lib/web/framework/backing/register-routes');
const defaultErrorHandler = require('../../../../lib/web/framework/backing/default-error-handler');

const { createServer, framework: { createExpress } } = require('../../../../lib/web');
const { Logger } = require('../../../../lib/logging/Logger');

const logger = new Logger();
logger.debug = jest.fn();

describe('Express Framework', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should config a web framework', () => {
    createExpress({
      logger, routes: [{}], interceptors: [{}],
    });
    expect(registerInterceptors.mock.calls.length).toBe(1);
    expect(registerRoutes.mock.calls.length).toBe(1);
    expect(defaultErrorHandler.mock.calls.length).toBe(1);
  });

  it('should config a web framework (support Websockets)', () => {
    const server = createServer({ logger });
    const framework = createExpress({
      logger, server, routes: [{}], interceptors: [{}], supportWebsockets: true,
    });
    // The first arg of the first call to the function was 'framework'
    expect(expressWS.mock.calls[0][0]).toBe(framework);

    // The second arg of the first call to the function was 'server'
    expect(expressWS.mock.calls[0][1]).toBe(server);
  });

  it('should config a web framework (support Trust Proxy)', () => {
    const framework = createExpress({
      logger, routes: [{}], interceptors: [{}], supportTrustProxy: true,
    });
    expect(framework.get('trust proxy')).toBeTruthy();
  });

  it('should config a web framework (without middleware)', () => {
    createExpress({
      logger, routes: null, interceptors: null, errorHandlers: null,
    });
    expect(registerInterceptors.mock.calls.length).toBe(0);
    expect(registerRoutes.mock.calls.length).toBe(0);
    expect(defaultErrorHandler.mock.calls.length).toBe(0);
  });

  it('should config a web framework (without middleware) 2', () => {
    const framework = createExpress({
      logger, routes: null, interceptors: null,
    });
    expect(registerInterceptors.mock.calls.length).toBe(0);
    expect(registerRoutes.mock.calls.length).toBe(0);
    expect(defaultErrorHandler.mock.calls.length).toBe(1);

    const req = request(framework);
    return req.get('/not-found-resource')
      .send()
      .expect(404)
      .then((res) => {
        expect(res.body).toEqual({});
      });
  });
});
