const http = require('http');
const WebSocket = require('ws');
const { Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger(process.env.LOG_LABEL);

const responseHandler = (verb) => (res) => {
  let data = '';
  /* A chunk of data has been recieved. */
  res.on('data', (chunk) => { data += chunk; });
  /* The whole response has been received. Print out the result. */
  res.on('end', () => {
    logger.info(`(${verb}) The server replied: ${data}`);
  });
};

const catchEvents = (req, verb) => {
  req.on('connect', (res, socket) => {
    logger.info(`(${verb}) Connected to the server:`, socket.address());
  });
  req.on('error', (err) => {
    logger.info(`(${verb}) Error connecting to the server:`, err);
  });
  req.on('timeout', () => {
    req.abort();
    logger.info(`(${verb}) Wait timeout reached.`);
  });
};


const defaultOptions = {
  protocol: 'http:',
  host: 'server',
  port: 80,
  path: '/',
  timeout: 2000,
};

const timer1 = setInterval(() => {
  logger.info('Connecting to the server (GET)...');
  const options = { ...defaultOptions, path: '/api/v1/resource' };
  const req = http.get(options, responseHandler('GET'));
  catchEvents(req, 'GET');
}, 2000);

const timer2 = setInterval(() => {
  logger.info('Connecting to the server (POST)...');
  const options = {
    ...defaultOptions,
    path: '/api/v1/resource',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const req = http.request(options, responseHandler('POST'));
  catchEvents(req, 'POST');
  // Write data to request body
  req.write(JSON.stringify({ payload: 'Hello!' }));
  req.end();
}, 2500);

const timer3 = setInterval(() => {
  logger.info('Connecting to the server (PUT)...');
  const options = {
    ...defaultOptions,
    path: '/private/jwt',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoiVGVuYW50IEFCQyJ9.HR9mSsGThu68XXdWXQhibXqjsv7b3PPCLJKmeSTXxF0',
    },
  };
  const req = http.request(options, responseHandler('PUT'));
  catchEvents(req, 'PUT');
  // Write data to request body
  req.write(JSON.stringify({ payload: 'Update it!' }));
  req.end();
}, 3000);

let ws = null;
setTimeout(() => {
  const loggerWS = new Logger(`${process.env.LOG_LABEL} - Websocket`);
  loggerWS.info('Establishing communication with the server via websocket ...');
  const endpoint = `ws://${defaultOptions.host}:${defaultOptions.port}/topics/anything`;
  ws = new WebSocket(endpoint);

  ws.on('open', () => {
    loggerWS.info('Websocket on "open": Connected to the server.');
  });

  ws.on('message', (data) => {
    loggerWS.info(`Websocket on "message": Received message: ${data}`);
  });

  ws.on('close', (code, reason) => {
    loggerWS.info(`Websocket on "close": Connection closed.\nCode: ${code}\nReason: ${reason}`);
  });

  ws.on('error', (err) => {
    loggerWS.error('Websocket on "error"', err);
  });
}, 2000);

const timer4 = setInterval(() => {
  ws.send('hey');
}, 3500);

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach(
  (sig) => process.on(sig, () => {
    clearInterval(timer1);
    clearInterval(timer2);
    clearInterval(timer3);
    clearInterval(timer4);
    ws.close();
  }),
);
