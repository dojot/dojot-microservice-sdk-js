jest.mock('on-finished');

const onFinished = require('on-finished');
const { Logger } = require('../../../../../lib/logging/Logger');
const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/beaconInterceptor');

function stateManagerMock() {
  const beacon = {
    die: jest.fn(),
  };
  const stateManager = {
    createBeacon: jest.fn(() => beacon),
    beacon,
    isServerShuttingDown: jest.fn(() => false),
  };
  return stateManager;
}

describe("Unit tests of script 'beaconInterceptor.js'", () => {
  let beaconInterceptor = null;
  let stateManager = null;
  let logger = null;

  beforeAll(() => {
    logger = new Logger('beaconInterceptor.test.js');
    logger.debug = jest.fn();
    logger.error = jest.fn();
  });

  beforeEach(() => {
    stateManager = stateManagerMock();
    beaconInterceptor = createInterceptor({
      stateManager,
      logger,
    });
    onFinished.mockImplementation((res, callback) => callback());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an interceptor without parameters', () => {
    expect(createInterceptor()).toBeDefined();
  });

  it('should successfully run the interceptor middleware', () => {
    const req = { id: '123456' };
    const res = {};
    const next = jest.fn();

    expect(beaconInterceptor.middleware(req, res, next)).toBeUndefined();

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);

    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(stateManager.beacon.die).toHaveBeenCalledTimes(1);
  });

  it("should throw an exception because the 'server' is shutting down", () => {
    // simulates a condition in which the server is being shut down
    stateManager.isServerShuttingDown = jest.fn(() => true);

    const req = { id: '123456' };
    const res = {};
    const next = jest.fn();

    expect(() => {
      beaconInterceptor.middleware(req, res, next);
    }).toThrow();

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should simulate an error request', () => {
    onFinished.mockImplementation((res, callback) => callback(new Error('Async error')));

    const req = { id: '123456' };
    const next = jest.fn();

    expect(beaconInterceptor.middleware(req, {}, next)).toBeUndefined();
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(stateManager.beacon.die).toHaveBeenCalledTimes(1);
  });
});
