jest.mock('morgan');

const morgan = require('morgan');

morgan.mockImplementation((logFormat, config) => {
  config.stream.write('test some log message');
});

morgan.token = jest.fn((key, callback) => callback({ id: '123456' }));


const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/requestLogInterceptor');
const { Logger } = require('../../../../../lib/logging/Logger');

const logger = new Logger('beaconInterceptor.test.js');
logger.info = jest.fn();

describe("Unit tests of script 'requestLogInterceptor.js'", () => {
  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({
      path: '/api/v1',
      logger,
      logFormat: ':id',
    })).toBeDefined();
  });

  it('should not create an interceptor without parameters', () => {
    expect(() => {
      createInterceptor();
    }).toThrow();
  });
});
