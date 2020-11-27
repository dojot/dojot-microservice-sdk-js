jest.mock('fs', () => ({ readFileSync: jest.fn() }));
jest.mock('http', () => ({ createServer: jest.fn() }));
jest.mock('https', () => ({ createServer: jest.fn() }));

const fs = require('fs');
const http = require('http');
const https = require('https');
const createServer = require('../../../lib/webUtils/createServer');
const { Logger } = require('../../../lib/logging/Logger');

const logger = new Logger('HTTP Server');
logger.debug = jest.fn();

describe('HTTP Server', () => {
  it('should create an http server', () => {
    createServer({ logger });
    expect(http.createServer.mock.calls.length).toBe(1);
    expect(logger.debug.mock.calls.length).toBe(2);
  });
});

describe('HTTPS Server', () => {
  it('should create an https server', () => {
    const cert = '/path/to/the/server.crt';
    const key = '/path/to/the/private.key';
    const ca = '/path/to/the/ca.crt';
    createServer({
      logger, config: { cert, key, ca },
    });
    expect(https.createServer.mock.calls.length).toBe(1);
    expect(logger.debug.mock.calls.length).toBe(2);
    expect(fs.readFileSync.mock.calls.length).toBe(3);
  });

  it('should create an https server (CA Array)', () => {
    const cert = '/path/to/the/server.crt';
    const key = '/path/to/the/private.key';
    const ca = ['/path/to/the/ca.crt'];
    createServer({
      logger, config: { cert, key, ca },
    });
    expect(https.createServer.mock.calls.length).toBe(1);
    expect(logger.debug.mock.calls.length).toBe(2);
    expect(fs.readFileSync.mock.calls.length).toBe(3);
  });

  it('should create an https server (without CA)', () => {
    const cert = '/path/to/the/server.crt';
    const key = '/path/to/the/private.key';
    createServer({
      logger, config: { cert, key },
    });
    expect(https.createServer.mock.calls.length).toBe(1);
    expect(logger.debug.mock.calls.length).toBe(2);
    expect(fs.readFileSync.mock.calls.length).toBe(2);
  });
});
