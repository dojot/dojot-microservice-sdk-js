jest.mock('express-ws', () => jest.fn());
jest.mock('../../../../lib/webUtils/framework/backing/registerInterceptors', () => jest.fn());
jest.mock('../../../../lib/webUtils/framework/backing/registerRoutes', () => jest.fn());
jest.mock('../../../../lib/webUtils/framework/backing/defaultErrorHandler',
  () => jest.fn().mockImplementation(
    () => (err, req, res, next) => {
      res.status(404).json({ error: err.message });
      next('route');
    },
  ));

const request = require('supertest');
const expressWS = require('express-ws');
const registerInterceptors = require('../../../../lib/webUtils/framework/backing/registerInterceptors');
const registerRoutes = require('../../../../lib/webUtils/framework/backing/registerRoutes');
const defaultErrorHandler = require('../../../../lib/webUtils/framework/backing/defaultErrorHandler');

const { createServer, framework: { createExpress } } = require('../../../../lib/webUtils');
const { Logger } = require('../../../../lib/logging/Logger');

const logger = new Logger('Express Framework');
logger.debug = jest.fn();

describe('Express Framework', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should configure a web framework', () => {
    createExpress({
      logger, routes: [{}], interceptors: [{}],
    });
    expect(registerInterceptors.mock.calls.length).toBe(1);
    expect(registerRoutes.mock.calls.length).toBe(1);
    expect(defaultErrorHandler.mock.calls.length).toBe(1);
  });

  it('should configure a web framework (support Websockets)', () => {
    const server = createServer({ logger });
    const framework = createExpress({
      logger, server, routes: [{}], interceptors: [{}], supportWebsockets: true,
    });
    // The first arg of the first call to the function was 'framework'
    expect(expressWS.mock.calls[0][0]).toBe(framework);

    // The second arg of the first call to the function was 'server'
    expect(expressWS.mock.calls[0][1]).toBe(server);
  });

  it('should configure a web framework (support Trust Proxy)', () => {
    const framework = createExpress({
      logger, routes: [{}], interceptors: [{}], supportTrustProxy: true,
    });
    expect(framework.get('trust proxy')).toBeTruthy();
  });

  it('should configure a web framework (without middleware)', () => {
    createExpress({
      logger, routes: null, interceptors: null, errorHandlers: null,
    });
    expect(registerInterceptors.mock.calls.length).toBe(0);
    expect(registerRoutes.mock.calls.length).toBe(0);
    expect(defaultErrorHandler.mock.calls.length).toBe(0);
  });

  it('should configure a web framework to capture invalid requests', () => {
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
        expect(res.body).toEqual({ error: 'Not Found' });
      });
  });

  it('should configure a web framework to not capture invalid requests', () => {
    const framework = createExpress({
      logger, routes: null, interceptors: null, errorHandlers: null, catchInvalidRequest: false,
    });
    expect(registerInterceptors.mock.calls.length).toBe(0);
    expect(registerRoutes.mock.calls.length).toBe(0);
    expect(defaultErrorHandler.mock.calls.length).toBe(0);

    const req = request(framework);
    return req.get('/not-found-resource')
      .send()
      .expect(404)
      .then((res) => {
        expect(res.body).toEqual({});
      });
  });
});
