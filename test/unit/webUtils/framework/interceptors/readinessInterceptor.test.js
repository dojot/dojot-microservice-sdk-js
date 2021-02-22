const { Logger } = require('../../../../../lib/logging/Logger');
const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/readinessInterceptor');

function stateManagerMock() {
  const stateManager = {
    isReady: jest.fn(() => true),
  };
  return stateManager;
}

describe("Unit tests of script 'readinessInterceptor.js'", () => {
  let readinessInterceptor = null;
  let stateManager = null;
  let logger = null;

  beforeAll(() => {
    logger = new Logger('readinessInterceptor.test.js');
    logger.debug = jest.fn();
    logger.error = jest.fn();
  });

  beforeEach(() => {
    stateManager = stateManagerMock();
    readinessInterceptor = createInterceptor({
      stateManager,
      logger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an interceptor without parameters', () => {
    expect(createInterceptor()).toBeDefined();
  });

  it('should successfully run the interceptor middleware', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    expect(readinessInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalledTimes(0);
    expect(stateManager.isReady).toHaveBeenCalledTimes(1);
  });

  it('should throw an exception because the application is not ready', () => {
    // simulates a condition in which the application is not ready
    stateManager.isReady = jest.fn(() => false);

    const req = {};
    const res = {};
    const next = jest.fn();

    expect(readinessInterceptor.middleware(req, res, next)).toBeUndefined();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(0);
    expect(stateManager.isReady).toHaveBeenCalledTimes(1);
  });

  it('should simulate an development environment', () => {
    readinessInterceptor = createInterceptor({
      stateManager,
      logger,
      environment: 'development',
    });

    const req = {};
    const res = {};
    const next = jest.fn();

    expect(readinessInterceptor.middleware(req, res, next)).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(stateManager.isReady).toHaveBeenCalledTimes(0);
  });
});
