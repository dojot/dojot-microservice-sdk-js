const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/jsonBodyParsingInterceptor');

describe("Unit tests of script 'jsonBodyParsingInterceptor.js'", () => {
  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({ config: { limit: '100kb' } })).toBeDefined();
  });

  it('should not create an interceptor without parameters', () => {
    expect(() => {
      createInterceptor();
    }).toThrow();
  });
});
