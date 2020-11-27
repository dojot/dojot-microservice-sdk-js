jest.mock('express', () => {
  const app = () => {};
  app.use = jest.fn();
  return () => app;
});

const express = require('express');
const registerInterceptors = require('../../../../../lib/webUtils/framework/backing/registerInterceptors');
const { Logger } = require('../../../../../lib/logging/Logger');

const logger = new Logger('Register Interceptors');
logger.debug = jest.fn();

describe('Express Framework - Register Interceptors', () => {
  it('should register the interceptor', () => {
    const interceptor = {
      name: 'a custom name',
      middleware: (req, res, next) => { next(); },
    };
    const framework = express();

    registerInterceptors(interceptor, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it('should register the interceptor with custom path', () => {
    const interceptor = {
      // because 'name' is not a string, it will be removed
      // from the object by the function to be tested
      name: 'a custom name',
      path: '/custom-path',
      // 'middleware' also accepts an array of functions
      middleware: [(req, res, next) => { next(); }],
    };
    const framework = express();

    registerInterceptors([interceptor], framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
    expect(framework.use.mock.calls[0][0]).toMatchObject([interceptor.path]);
  });

  it("should throw an error because 'name' is not a string", () => {
    const interceptor = {
      name: 123, // 'name' is not a string
      path: '/custom-path',
      middleware: (req, res, next) => { next(); },
    };
    const framework = express();

    expect(() => {
      registerInterceptors([interceptor], framework, logger);
    }).toThrow();
  });

  it('should throw an error because of the invalid path', () => {
    const interceptor = {
      name: 'a custom name',
      path: {}, // invalid path
      middleware: (req, res, next) => { next(); },
    };
    const framework = express();

    expect(() => {
      registerInterceptors([interceptor], framework, logger);
    }).toThrow();
  });

  it('should throw an error as there is no middleware', () => {
    const interceptor = {
      name: 'a custom name',
      path: '',
      // there is no middleware!
    };
    const framework = express();

    expect(() => {
      registerInterceptors(interceptor, framework, logger);
    }).toThrow();
  });

  it('should throw an error because a middleware has not been defined', () => {
    const interceptor = {
      name: 'a custom name',
      // a middleware has not been defined (null)
      middleware: [(req, res, next) => { next(); }, null],
    };
    const framework = express();

    expect(() => {
      registerInterceptors(interceptor, framework, logger);
    }).toThrow();
  });

  it('This should throw an error because a middleware is not a function', () => {
    const interceptor = {
      name: 'a custom name',
      // a middleware is not a function (but a empty object)
      middleware: [{}, (req, res, next) => { next(); }],
    };
    const framework = express();

    expect(() => {
      registerInterceptors(interceptor, framework, logger);
    }).toThrow();
  });
});
