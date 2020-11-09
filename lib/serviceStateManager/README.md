# **Service State Manager**

This module is responsible for the health check and graceful shutdown of dojot services.

# **Table of Contents**

1. [Usage](#usage)
   1. [Shutdown handlers](#shutdown-handlers)
   2. [Health checking](health-checking)
2. [Configuration](#configuration)
   1. [lightship](#lightship)
   2. [Configuration object format](#configuration-object-format)

# **Usage**

Instantiate the `Manager` class, passing a list of services you want to register in it. This is an
important part, since you can only signal services that are registered. Now you can add shutdown
handlers and health checkers to it.

Beware that when you instantiate the Manager class, an HTTP server is created, by default, in the
port `9000`. It is the health check server, created by the [lightship library](https://github.com/gajus/lightship/).
This port can be changed via the lightship configuration, but we recommend to leave the default
value to keep the same interface in all dojot services.

The lightship HTTP server provides the interface for Kubernetes probes. Check the lightship
documentation for more details about the exposed endpoints and the required Kubernetes configuration
to use them.

Don't forget to check the example in the [examples directory](../../examples/serviceStateManager)
for a practical usage.

## **Shutdown handlers**

The shutdown handlers are functions that are executed when you want to gracefully exit your program
via the module's `shutdown` function. You can add shutdown functions via the
`registerShutdownHandler` method.

## **Health checking**

The `ServiceStateManager` module provides some flexibility in the signaling of the services, so you
can adapt it to your needs. The modes are:

- Manual mode: using the module's `signalReady` and `signalNotReady` functions (e.g.: call
`signalReady` when the HTTP server receives the `listening` event and call `signalNotReady` when
receiving `close` or `error` events)
- Managed mode: using the module's internally managed health check interface via the
`addHealthChecker` method.

# **Configuration**

The configuration is done via the `Manager` constructor `config` parameter.

__NOTE THAT__ the logger used inside the Manager will indirectly inherit the configurations from the
application logger, since the SDK Logger class is globally defined.

## **lightship**

Lightship is the library that provides the graceful shutdown and health check capabilities to the
module. If you would like to change any configuration parameter, please read the library's
[official documentation](https://github.com/gajus/lightship/#usage) for the accepted parameters.

The default configuration is:

```js
{
  detectKubernetes: false,
};
```

## **Configuration object format**

When passing the configuration to the `Manager` instance, you should follow this format:

```js
{
  lightship: {
    detectKubernetes: false,
    // any other configurations you would like to provide to Lightship
  },
}
```
