const express = require('express');
const expressWS = require('express-ws');

const registerInterceptors = require('../../../../../lib/webUtils/framework/backing/registerRoutes');
const { Logger } = require('../../../../../lib/logging/Logger');

const logger = new Logger('Register routes');
logger.debug = jest.fn();


describe('Express Framework - Register routes', () => {
  it('should register the route', () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it('should register the route array', () => {
    const route1 = {
      name: 'a custom route 1',
      mountPoint: '/mnt',
      path: ['/custom-path1'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };
    const route2 = {
      name: 'a custom route 2',
      mountPoint: '/mnt',
      path: ['/custom-path2'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };
    const routeArray = [route1, route2];

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(routeArray, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it("should correct the mount point with '/'", () => {
    const route = {
      name: 'a custom route',
      mountPoint: 'mnt', // mount point does not start with "/"
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
    expect(framework.use.mock.calls[0][0]).toBe(`/${route.mountPoint}`);
  });

  it('should register the route with parameters', () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: [{
        name: 'some-param',
        trigger: (req, res, next, value, param) => {
          req.params[param] = value.toUpperCase();
          next();
        },
      }],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it('should register the route for websocket', () => {
    const route = {
      name: 'a custom ws route',
      mountPoint: '/',
      path: ['/websocket'],
      params: [],
      handlers: [{
        method: 'ws',
        middleware: () => {},
      }],
    };

    const framework = express();
    expressWS(framework);

    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it('should register the route for websocket (middleware can be an array of just one element)', () => {
    const route = {
      name: 'a custom ws route',
      mountPoint: '/',
      path: ['/websocket'],
      params: [],
      handlers: [{
        method: 'ws',
        middleware: [() => {}],
      }],
    };

    const framework = express();
    expressWS(framework);

    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it("should throw an exception because the route 'name' is not a string", () => {
    const route = {
      name: 123456, // route name is not a string!
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the route 'mountPoint' is not a string", () => {
    const route = {
      name: 'a custom ws route',
      mountPoint: 123456, // mount point is not a string!
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should register the route even if the 'path' is not an array", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: '/custom-path', // path is not an array!
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it("should register the route even if the 'params' is not an array", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: {
        name: 'some-param',
        trigger: (req, res, next, value, param) => {
          req.params[param] = value.toUpperCase();
          next();
        },
      }, // params is not an array (but an object)!
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it("should register the route even if the 'handlers' is not an array", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: {
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }, // params is not an array (but an object)!
    };

    const framework = express();
    framework.use = jest.fn();

    registerInterceptors(route, framework, logger);

    expect(framework.use.mock.calls.length).toBe(1);
  });

  it("should throw an exception because the 'path' is an empty array", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: [], // path is an empty array!
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'path' value has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: [null], // value has not been defined!
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'path' must be a string or instance of RegExp", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: [{}], // value is an instance of Object!
      params: [],
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'params.name' has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: {
        // name: 'some-param', /* has not been defined! */
        trigger: (req, res, next, value, param) => {
          req.params[param] = value.toUpperCase();
          next();
        },
      },
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'params.name' is not a string", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: {
        name: 123456, /* is not a string! */
        trigger: (req, res, next, value, param) => {
          req.params[param] = value.toUpperCase();
          next();
        },
      },
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'params.trigger' has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: {
        name: 'some-param',
        // trigger: (req, res, next, value, param) => {
        //  req.params[param] = value.toUpperCase();
        //  next();
        // }, /* has not been defined! */
      },
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'params.trigger' is not a function", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path/:some-param'],
      params: {
        name: 'some-param',
        trigger: {}, /* is not a function! */
      },
      handlers: [{
        method: 'get',
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers' is an empty array", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [], // is an empty array!
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers' value has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [null], // value has not been defined!
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers.method' value has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        // method: 'get', /* has not been defined */
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers.middleware' value has not been defined", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        // middleware: [
        //  (req, res, next) => { next(); },
        // ], /* has not been defined */
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers.method' has an invalid value", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'INVALID', // has an invalid value!
        middleware: [
          (req, res, next) => { next(); },
        ],
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });

  it("should throw an exception because the 'handlers.middleware' has an invalid value", () => {
    const route = {
      name: 'a custom route',
      mountPoint: '/mnt',
      path: ['/custom-path'],
      params: [],
      handlers: [{
        method: 'get',
        middleware: {}, // has an invalid value!
      }],
    };

    const framework = express();
    framework.use = jest.fn();

    expect(() => {
      registerInterceptors(route, framework, logger);
    }).toThrow();
  });
});
