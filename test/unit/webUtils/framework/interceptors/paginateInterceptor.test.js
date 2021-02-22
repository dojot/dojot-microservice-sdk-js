const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/paginateInterceptor');

describe("Unit tests of script 'paginateInterceptor.js'", () => {
  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({ limit: 25, maxLimit: 250 })).toBeDefined();
  });

  it('should create an interceptor without parameters', () => {
    expect(createInterceptor()).toBeDefined();
  });
});
