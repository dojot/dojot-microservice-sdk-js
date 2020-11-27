# **Express Framework**

The web framework [Express.js](http://expressjs.com/) is unopinionated, this
means that there are several ways to reach the same result, it is up to the
developer to find an efficient way to structure your code so that _Express.js_
better suits you. Having this in mind, a standard was developed for creating an
instance of the framework _Express.js_ previously configured to meet the basic
needs of the dojot platform services.

To run the example:
```shell
docker-compose up
```

In order to create an instance of Express, we must provide a configuration
object with specific attributes that will be detailed below.

```javascript
// Creating an instance of express ...
const { WebUtils, Logger } = require('@dojot/microservice-sdk');

Logger.setTransport('console', { level: 'debug' });
const logger = new Logger();

const expressConfig = require('./express-config')(logger);

// create an instance of HTTP server
const server = WebUtils.createServer({ logger });

// creates an instance of Express.js already configured
const framework = WebUtils.framework.createExpress(expressConfig);

// emitted each time there is a request
server.on('request', framework);

// boots up the server
server.listen(80);
```

The `expressConfig` object must have the following attributes:

```javascript
const expressConfig = {
  logger, /* {Object} to track the process flow */
  server, /* {Object} required if you want to enable support for websockets */
  routes, /* {Array} for handling requests */
  interceptors,  /* {Array} interceptors that act on requests before they reach
                  * route handlers */
  errorHandlers, /* {Array} (pure middleware) that handles errors */
  supportWebsockets, /* {Boolean} for protocol upgrade (from HTTP to WS) */
  supportTrustProxy, /* {Boolean} Express will have knowledge that it's sitting
                      * behind a proxy and that the X-Forwarded-* header fields
                      * may be trusted, which otherwise may be easily spoofed.*/
};
```

The `logger` attribute is an instance of the _SDK Logger_:

```javascript
const { Logger } = require('@dojot/microservice-sdk');
Logger.setTransport('console', { level: 'debug' });
const logger = new Logger();
```

The `server` is only necessary if you need to enable support for _websockets_:

```javascript
const { WebUtils } = require('@dojot/microservice-sdk');
const server = WebUtils.createServer({ logger });
```

The `routes` array has its elements in the following format:

```javascript
const routePattern = {
  name: '', /* to identify the route in the debug logs */
  mountPoint: '', /* useful in API versioning */
  path: [], /* passed on to express
             * (http://expressjs.com/en/4x/api.html#path-examples) */
  params: [], /* add callback triggers to route parameters */
  handlers: [], /* supports the routing methods corresponding to
                 * the HTTP methods */
};
const routes = [ routePattern ];
```

The `route.params` and `route.handlers` objects are better detailed
below:

```javascript
const params = [{
  name, /* {String} Parameter name mapped to the URI path */
  trigger, /* {function} callback executed to handle the parameter value
            * (http://expressjs.com/en/4x/api.html#app.param) */
}];

const handlers = [{
  method, /* {String} Name of the HTTP method used in the request */
  middleware, /* {function|Array} callback executed to handle the request
               * on the route path using the HTTP method defined above
               * (http://expressjs.com/en/4x/api.html#middleware-callback-function-examples) */
}];
```

The `interceptors` array has its elements in the following format:

```javascript
const interceptorPattern = {
  name: '', /* to identify the interceptor in the debug logs */
  path: [], /* passed on to express
             * (http://expressjs.com/en/4x/api.html#path-examples) */
  middleware: [], /* {function|Array} callback executed to handle the
                   * request on the path above
                   * (http://expressjs.com/en/4x/api.html#middleware-callback-function-examples) */
};
const interceptors = [ interceptorPattern ];
```

The `routes` and `interceptors` objects are registered in _Express_
following their [routing](http://expressjs.com/en/guide/routing.html)
concept.

The `errorHandlers` array is passed directly to Express. If this attribute is
not informed, a _default_ will be added. For more details on how Express error
handlers work, see: [Express Error Handling](http://expressjs.com/en/guide/error-handling.html).
