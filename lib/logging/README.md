# Logging

This module is responsible for providing logging capabilities for dojot's services.

To log messages, you use the Logger class, which is a wrapper over the winston logging library. It
supports logging messages to both 'console' and 'file' which is rotated.

The messages are logged in the 'console' using the following format:

```bash
ts -- sid -- LEVEL: (file:line) [rid] message {extra}
```

Where:

* ts: timestamp in ISO format
* sid: service identification
* level: error, warn, info or debug
* (file:line): file and line of the log message (optional metadata)
* [rid]: request identifier (optional metadata)
* message: message in string format
* extra: any additional data aggregated in an object - user specific (optional metadada)

The messages are logged in the 'file' using the following json format:

```js
{
  level: string,
  timestamp: <number>,
  sid: <string>,
  rid: <string>,
  message: <string>,
  file: <string>,
  line: <number>,
  extra: <object>,
 }
```

Where:

* ts: timestamp in unix format
* sid: service identification
* level: error, warn, info or debug
* rid: request identifier (optional metadata)
* message: message in string format
* file: file of the log message (optional metadata)
* line: line of the log message (optional metadata)
* extra: any additional data aggregated in an object - user specific (optional metadada)

The transports ('console' and 'file') are shared by all instances of the wrapper. So,
any change in the transports will affect all instances.

By default, console transport is set, but this can be changed as part of the configuration
or initialization of the microservice.

It's usage is very simple and is shown by the following example:

```js
const { Logger } = require('@dojot/microservice-sdk');

// By default, console transport is enabled; but you can
// change it or add a file transport if required.
// It's worth to say that the transports are shared by all
// modules of the microservice; consequently, any change
// in the configuration will be valid for all!

// Setting console transport (this will replace the console set by default)
// For more information about it, see:
// https://github.com/winstonjs/winston/blob/HEAD/docs/transports.md#console-transport
//
// This is the expected transport to be used in a Docker container
// once it is stateless.
Logger.setTransport('console', {
  // Any configuration put here will be merged with the defaults:
  // { level: 'info',
  //   format: consoleFormat /* customized format */}
  level: 'debug',
});

// Setting file transport
// For more information about it, see:
// https://github.com/winstonjs/winston-daily-rotate-file#readme
//
// This transport should be used if you need to keep the logs in
// files with rotation.
// This is not typically the case for Docker container applications,
// where the logs are expected to be redirected to /dev/stdout
Logger.setTransport('file', {
  // Any configuration put here will be merged with the defaults:
  // { level: 'info',
  //   dirname: '/var/log/',
  //   filename: 'dojot.microservice-%DATE%.log',
  //   datePattern: 'YYYY-MM-DD',
  //   zippedArchive: true,
  //   maxSize: '10m',
  //   maxFiles: '7d',
  //   format: fileFormat, /* customized format */
  //   level: 'debug',
  // }
  level: 'debug',
  filename: 'sample-app-%DATE%.log',
});

// Enables the verbose mode. This should be avoided in
// production and only used for debugging purposes.
// When enabled, file:line information is added to each
// logging message
Logger.setVerbose(true);

// Instantiate a logger with a custom service/module name
// If no name is given, it tries to discover the package name
// defined in the package.json
const logger = new Logger('sample-app');

// log message with different logging levels
logger.debug('message #1');
logger.info('message #2');
logger.warn('message #3');
logger.error('message #4');

// log message with additional (service-specific) metadata
logger.debug('message #9', { rid: '7e921802-aa06-46c7-b4ba-1f6c2812d01d', src_ip: '192.168.127.99'});
logger.info('message #10', { rid: '7e921802-aa06-46c7-b4ba-1f6c2812d01d', src_ip: '192.168.127.99'});
logger.warn('message #11', { rid: '7e921802-aa06-46c7-b4ba-1f6c2812d01d', src_ip: '192.168.127.99'});
logger.error('message #12', { rid: '7e921802-aa06-46c7-b4ba-1f6c2812d01d', src_ip: '192.168.127.99'});
```
