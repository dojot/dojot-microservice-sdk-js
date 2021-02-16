jest.mock('path');
jest.mock('express');
jest.mock('serve-index');

const pathModule = require('path');
const express = require('express');

pathModule.dirname = jest.fn((path) => {
  if (!path) {
    throw new Error('The "path" argument must be of type string. Received undefined');
  }
});

express.static = jest.fn();


const createInterceptor = require('../../../../../lib/webUtils/framework/interceptors/staticFileInterceptor');

describe("Unit tests of script 'staticFileInterceptor.js'", () => {
  it('should create an interceptor with parameters', () => {
    expect(createInterceptor({
      path: '/api/v1',
      baseDirectory: '/etc/test',
      staticFilePath: '/relative/path/to/static/files',
    })).toBeDefined();
  });

  it('should not create an interceptor without parameters', () => {
    expect(() => {
      createInterceptor();
    }).toThrow();
  });
});
