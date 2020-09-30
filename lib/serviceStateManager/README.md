# **Service State Manager**

This module is responsible for the health check and graceful shutdown of dojot services.

# **Structure**

The Service State Manager is structured to use 2 threads to support health check. The master thread
is meant to be the service main thread, where all connections and jobs of the service are done (e.g.
the V2K component functionality). You can also use the master thread to do some health checks. The
second thread, called the `worker thread` is meant to run health checks without overloading the
master thread's event loop.

In the next sections we will superficially cover what each thread is meant to do and exemplify its
functionalities. If you have any doubts, check the example in the
[examples directory](../../examples/serviceStateManager) for a more concrete example.

## **Master Thread**

This is the thread where your service resides. It should instantiate the `Manager` to
handle both health check and graceful shutdown functionalities. To do the health check from the
master thread, you can use events from the object you are requiring a connection (e.g. a Redis
client). In the events handlers, you can call the `signalReady` and `signalNotReady` functions to
signalize whether the service is working or not.

There is, also, an HTTP server running, by default, in the port `9000` inside the master thread. It
is the health check server, created by the [lightship library](https://github.com/gajus/lightship/).
This port can be changed via the lightship configuration, but we recommend to leave the default
value to keep the same interface in all dojot services.

The lightship HTTP server provides the interface for Kubernetes probes. Check the lightship
documentation for more details about the exposed endpoints and the required Kubernetes configuration
to use them.

## **Worker Thread**

A separate thread to treat all the health checkers that should not interfere in the main thread's
event loop. This thread is created when the `Manager` class is initialized and you've
**enabled it via configuration**.

__ATTENTION__: the worker thread code should be in a separate file from the master thread code.
Check the [configuration section](#configuration) for more details on its configuration.

Inside its file, you should register functions in the `Worker` via the
`addHealthChecker` function. It will create a node.js `Interval` to periodically call the passed
function.

# **Configuration**

The configuration object is divided in 3 parts: `lightship`, `logger` and `module`.

__NOTE THAT__ this configuration is applied only to the master thread. The slave thread does not
have a configuration object.

__NOTE THAT__ the logger used inside the Manager will indirectly inherit the
configurations from the application logger, since the SDK Logger class is globally defined.

## **lightship**

Lightship is the library that provides the graceful shutdown and health check capabilities to our
module. If you would like to change any configuration parameter, please read the library's
[official documentation](https://github.com/gajus/lightship/#usage) for the accepted parameters.

The default configuration is:

```js
{
  detectKubernetes: false,
};
```

## **module**

The Manager internal configuration. It follows the default dojot configuration object
model. Check the [ConfigManager documentation](../configManager/README.md).

__NOTE THAT__ we do not use the ConfigManager in this module, since we don't want to accept
environment variables inside the SDK modules, we only follow its naming patterns for configuration
variables.

| Name          | Description                             | Default value         | Accepted values
| ------------- | --------------------------------------- | --------------------- | ---------------
| worker.enable | Whether to use the worker thread or not | false                 | boolean
| worker.file   | The worker file location                | healthcheck/Worker.js | path


## **Configuration object format**

When passing the configuration to the `Manager` instance, you should follow this format:

```js
{
  lightship: {
    detectKubernetes: false,
  },
  module: {
    'worker.file': 'healthcheck/Worker.js',
  },
}
```
