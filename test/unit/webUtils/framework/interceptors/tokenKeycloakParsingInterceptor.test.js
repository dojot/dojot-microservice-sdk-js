const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/tokenKeycloakParsingInterceptor');
const createTokenGen = require('../../../../../lib/webUtils/createTokenKeycloakGen');

describe("Unit tests of script 'tokenKeycloakParsingInterceptor.js'", () => {
  let tokenGen = null;

  beforeAll(() => {
    tokenGen = createTokenGen();
  });

  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({
      path: '/internal',
      ignoredPaths: ['internal/api/v1', 'internal/api/v2'],
    })).toBeDefined();
  });

  it('should create an interceptor without parameters', () => {
    expect(createInterceptor()).toBeDefined();
  });

  it('should successfully run the interceptor middleware', async () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    const tokenParsingInterceptor = createInterceptor();

    const jwt = await tokenGen.generate({ tenant: 'admin' });

    req.path = '/';
    req.headers = {};
    req.headers.authorization = `Bearer ${jwt}`;

    expect(tokenParsingInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(req.tenant).toBe('admin');
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });

  it('should generate an error because of a invalid JWT token', async () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    const tokenParsingInterceptor = createInterceptor();

    const jwt = await tokenGen.generate({ tenant: 'admin' });

    req.path = '/';
    req.headers = {};
    req.headers.authorization = `${jwt}`; // missing: "Bearer"

    expect(tokenParsingInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(req.tenant).toBe(undefined);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should generate an error because of a missing JWT token', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    const tokenParsingInterceptor = createInterceptor();

    req.path = '/';
    req.headers = {};

    expect(tokenParsingInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(req.tenant).toBe(undefined);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should generate an error because the JWT token does not contain a tenant', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    const tokenParsingInterceptor = createInterceptor();

    // A JWT token without the "iss" attribute (url with realm/tenant)
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTM2Nzg0OTMsImV4cCI6MTYxMzY3ODU1M30.c5oCtfRdiqt8jeBAnLqeuGQiAd4D6ELf7dOxSZWs478';

    req.path = '/';
    req.headers = {};
    req.headers.authorization = `Bearer ${jwt}`;

    expect(tokenParsingInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(req.tenant).toBe(undefined);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should simulate an ignored path', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    const tokenParsingInterceptor = createInterceptor({
      ignoredPaths: ['throw-away'],
    });

    req.path = '/internal/api/v1/throw-away';
    req.headers = {};

    expect(tokenParsingInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(req.tenant).toBe(undefined);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});
