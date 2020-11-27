const defaultErrorHandler = require('../../../../../lib/webUtils/framework/backing/defaultErrorHandler');
const { Unauthorized, NotFound } = require('../../../../../lib/webUtils/framework/backing/errorTemplate');
const { Logger } = require('../../../../../lib/logging/Logger');

const logger = new Logger('DefaultErrorHandler');
logger.debug = jest.fn();
logger.error = jest.fn();

describe('Express Framework - default Error Handler', () => {
  let errorHandlerMiddleware = null;

  beforeAll(() => {
    errorHandlerMiddleware = defaultErrorHandler(logger);
    expect(errorHandlerMiddleware).toBeInstanceOf(Function);
  });

  describe('middleware', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the error status and the default message', () => {
      const error = NotFound();
      const req = { logger };
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandlerMiddleware(error, req, res, next);

      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(1);

      expect(res.status.mock.calls[0][0]).toBe(404);
      expect(res.json.mock.calls[0][0]).toEqual({ error: 'Not Found' });
    });

    it('should return the error status and a custom message', () => {
      const customMessage = 'You are not allowed to perform this action';
      const error = Unauthorized(customMessage);
      const req = { logger };
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandlerMiddleware(error, req, res, next);

      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(1);

      expect(res.status.mock.calls[0][0]).toBe(401);
      expect(res.json.mock.calls[0][0]).toEqual({ error: customMessage });
    });

    it('should return the error status, a custom message and detail', () => {
      const customMessage = 'You are not allowed to perform this action';
      const detail = { user: 'test', roles: ['view1', 'view2'] };
      const error = Unauthorized(customMessage, detail);
      const req = { logger };
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandlerMiddleware(error, req, res, next);

      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(1);

      expect(res.status.mock.calls[0][0]).toBe(401);
      expect(res.json.mock.calls[0][0]).toEqual({ error: customMessage, detail });
    });

    it('should return the error status and a generic error message', () => {
      const originalMessage = 'Unexpected error with a stack trace';
      const genericMessage = 'An unexpected error has occurred.';

      const error = new Error(originalMessage);
      const req = { logger };
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandlerMiddleware(error, req, res, next);

      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(1);

      expect(res.status.mock.calls[0][0]).toBe(500);

      // Original error message should not be returned as it may expose security holes
      expect(res.json.mock.calls[0][0]).toEqual({ error: genericMessage });
    });

    it('should return the error status and a original error message', () => {
      const originalMessage = 'Unexpected error with a stack trace';
      const genericMessage = 'An unexpected error has occurred.';

      const error = new Error(originalMessage);
      const req = { logger };
      const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      const oldValue = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandlerMiddleware(error, req, res, next);

      process.env.NODE_ENV = oldValue;

      expect(next.mock.calls.length).toBe(0);
      expect(res.status.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(1);

      expect(res.status.mock.calls[0][0]).toBe(500);

      // original message is returned as a detail of the error
      expect(res.json.mock.calls[0][0]).toEqual({
        error: genericMessage,
        detail: {
          originalError: originalMessage,
        },
      });
    });

    it('should return just the error status', () => {
      const error = { status: 404 };
      const req = { logger };
      const res = {
        sendStatus: jest.fn(() => res),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandlerMiddleware(error, req, res, next);

      expect(next.mock.calls.length).toBe(0);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.json.mock.calls.length).toBe(0);
      expect(res.sendStatus.mock.calls[0][0]).toBe(404);
    });

    it('should throw an exception because the error message is not a string', () => {
      expect(() => {
        const customMessage = {};
        errorHandlerMiddleware(Unauthorized(customMessage), {}, {}, jest.fn());
      }).toThrow();
    });

    it("should call the 'next()' ErrorHandler", () => {
      const error = NotFound();
      const req = {};
      const res = { headersSent: true };
      const next = jest.fn();
      errorHandlerMiddleware(error, req, res, next);
      expect(next.mock.calls.length).toBe(1);
    });
  });
});
