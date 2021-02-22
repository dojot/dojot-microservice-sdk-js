const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/requestIdInterceptor');

describe("Unit tests of script 'requestIdInterceptor.js'", () => {
  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({ path: '/api/v1' })).toBeDefined();
  });

  it('should create an interceptor without parameters', () => {
    expect(createInterceptor()).toBeDefined();
  });
});
