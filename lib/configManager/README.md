# Configuration Manager

This module is responsible for the creation of a configuration file for the services. It creates a
file based on:
- Environment variables
- User configuration file
- Default configuration file

This is, also, the precedence for the configuration, from higher to lower priority. The following
image summarizes the module flow:

<p align="center">
<img src="../../docs/images/ConfigManagerFlow.png" alt="Configuration Manager Flow">
</p>

# Table of Contents

1. [Patterns](#patterns)
   1. [Environment variables](##environment-variables)
   2. [User configuration files](##user-configuration-files)
   3. [Default configuration file](##default-configuration-file)
   4. [Created configuration file](##created-configuration-file)
   5. [Environment variables and file parameters](##environment-variables-and-file-parameters)
   6. [Passing values through environment variables](##passing-values-through-environment-variables)
2. [Scopes](#scopes)
3. [Appropriate usage guide](#appropriate-usage-guide)
4. [Usage](#usage)

# Patterns

## Environment variables

All environment variables must follow this format:
```
{SERVICE}_{SCOPE}_{KEY}
```

Where:
- `SERVICE`: an acronym for the module, should be alphanumeric and can contain underscores. Example:
`K2V`, `KAFKA_WS`.
- `SCOPE`: the name of a configuration object, should be alphanumeric. Example: `MQTT`, `LWM2M`,
`KAFKA`.
- `KEY`: a value that will be put in the `SCOPE` object. Can contain subparts that are separated by
underscores. The default is to use only one underscore, which is converted to a dot. If you use two,
they are converted to a single one in the parameter name. Examples:
`CLIENT_ID`, `BROKER_LIST`, `DR__CB`.

Examples of full environment variables names:
```
V2K_APP_HOSTNAME
V2K_APP_CONNECTION_RETRY_COUNT
KAFKA_WS_KAFKA_DR__DB
```

## User configuration files

The user configuration file can be used to replace the default values with the ones that should be
used in a determined environment. This way, you can have multiple configuration files for a myriad
of environments, e.g. production, development, load test, etc.
The filename can have any name you want. The recommended approach is to use a name that reflects the
environment it is directed to and use the `.conf` extension. Examples:
```
production.conf
development.conf
load-testing.conf
```

As for the parameters, their format are:
```
scope1.param.key=value
scope1.param.another.key=value
scope2.param_key=value
```

Also, you can write comments by beginning a line with #:
```
# This is a comment. Only entire line comments are supported.
app.hostname=v2k-bridge # This is not a comment, it will be in the parameter value
```
You can also separate the configuration in blocks using blank lines, as these are removed just like
commented lines.

Examples:
```
app.hostname=v2k-bridge
app.connection.retry.count=3
```

## Default configuration file

This file is very similar to the previous one. The differences are:
- It should exists
- It should not be empty
- It should be named `default.conf`
- It should be in a directory named `config` in the project root (you can change the location, but
it is recommended to not do so to maintain a standard).
- It accepts types for variables
- It accepts comments too

### Types

To remove the burden of treating variables' types in the service code, this module provides an easy
way of handling them. Examples of variables and types:
```
scope1.param.boolean.key:boolean=true
scope1.param.float.key:float=3.1415
scope1.param.integer.key:integer=10
scope1.param.string.array.key:string[]=["stringA", "stringB"]
scope2.param.explicit.string.key:string=this is explicitly typed as string
scope2.param.implicit.string.key=this has the string type
scope2.param.string.quotation.mark="strings are not delimited, these quotation marks will be in the string"
```

The accepted types are:
- boolean: true or false, case insensitive.
- float: any value with or without decimal places.
- integer: any value without decimal places.
- string[]: a list of strings, must be delimited by `[ ]` and each string must be delimited by `"`.
- string: if no type is passed, this is the default. There is no delimitation character.

__NOTE THAT__ only the default configuration file can be typed. The user file and environment
variables will inherit the same types. If a user file parameter or environment variable does not
exist in the default file, it will have the string type.

## Created configuration file

The module will create a JSON file. It will be located in `./config` with the name being the acronym
in lower case. Example:
```
v2k.json
```

__NOTE THAT__ this file should not be modified/loaded/created by the user.

## Environment variables and file parameters

The environment variables are translated to file parameters when they are parsed in this module. As
you can already see, the translation removes the `SERVICE` acronym. The translation is as follows:

| Environment variable     | File parameter   |
| ------------------------ | ---------------- |
| V2K_APP_HOSTNAME         | app.hostname     |
| EXAMPLE_SCOPE1_PARAM_KEY | scope1.param.key |
| KAFKA_WS_KAFKA_DR__CB    | kafka.dr_cb      |

__NOTE THAT__ the default conversion of underscore is to a dot, except if it is a double underscore,
which is then converted to a single underscore.

__NOTE THAT__ the default is to use only the dotted version, the other one is for excepcional cases.

## Passing values through environment variables

To pass a value, doesn't matter the type, you can simply pass it between `"` or `'`. Examples:

```yml
V2K_BOOLEAN_VAR: 'true'
V2K_FLOAT_VAR: '10.0'
V2K_INTEGER_VAR: "42"
V2K_STRING_LIST_VAR: '["string1", "string2"]'
V2K_STRING_VAR: "my_string"
```

## Using environment variables in `.conf` files

Sometimes you want to use a environment variable in your parameters. You can do it like so:

```
mqtt.hostname=${HOSTNAME:-v2k-bridge}
app.config.file=${NODE_ENV:-production}.conf
```

This is similar to the shell syntax: if the environment variable is not defined, it will use the
provided value after the `:-` operator (its use is optional). Currently, this is the only supported
operator.

You can use it in any type of variable.

# Scopes

Let's say you have two classes and need two different configuration objects to pass to them. You can
use the scopes to solve this issue.

Example:

example.conf
```
class1.param1:integer=10
class1.param2=value2
class2.param3=value3
class2.param4.key1=value41
class2.param4_key2=value42
```

This file will create the following object when `ConfigManager.getConfig` is called:
```js
{
  class1: {
    param1: 10,
    param2: 'value2',
  },
  class2: {
    param3: 'value3',
    'param4.key1': 'value41',
    param4_key2: 'value42',
  },
}
```

__NOTE THAT__ the `SCOPE` part is always the name of a configuration object.
__NOTE THAT__ the object has always a depth of one, thus you should access the dotted ones like
this:
```js
obj.class2['param4.key1']
```

# Appropriate usage guide

For the sake of standardization, we should follow some rules when applying this module to a service:

- Apply the Occam's razor when creating your names: the simpler, the better.
- Multiple agglutinated words should be avoided: instead of `kafka.consumerpartitionnumber`, a
better alternative is `kafka.consumer.partition.number`.
- This module does not accept uppercase letters: using them might not give you the expected results.
- Always use scopes for better modularity.
- If possible, use only dots in the parameters' names. The double to single underscore conversion is
only an extension to provide compatibility with some libraries that is not meant to be used as a
default. If you need to provide an object with only underscored parameters, use the
`transformObjectKeys` to transform the configuration object.

# Usage

Create the default configuration file `./config/default.conf` in your project's root directory.
For this example, we will use this `default.conf` file:

```
logger.transport.console.level=info
logger.verbose:boolean=true

mqtt.client.id:string=${HOSTNAME:-v2k-bridge}
mqtt.hostname:string=vernemq
mqtt.port:string=1883
mqtt.protocol:string=mqtt
mqtt.qos:integer=1
mqtt.username:string=${HOSTNAME:-v2k-bridge}
```

If you want, you can create an user configuration file. In this case, we will use a name other than
the default one for the example's sake, `test.conf`:

```
logger.transport.console.level=debug

mqtt.hostname=vernemq-test
mqtt.qos=0
```

Now you can start using the module by creating and retrieving the configuration:
```js
const { ConfigManager } = require('@dojot/microservice-sdk');
// Here we load the settings and use the test.conf file created before
ConfigManager.loadSettings('V2K', 'test.conf');
const config = ConfigManager.getConfig('V2K');
```

__NOTE THAT__ you don't need to call `loadSettings` every time you need the configuration, you just
need to call it in your initialization file. In other places where you need it, call `getConfig`.

Remember that some of its variables will be changed to the ones in the `test.conf` file! The final
configuration object will look like:
```js
{
  // Each object inside the configuration object is called a scope
  logger: {
    'transport.console.level': 'debug',
    verbose: true,
  },
  mqtt: {
    'client.id': 'v2k-bridge',
    hostname: 'vernemq-test',
    port: '1883',
    protocol: 'mqtt',
    qos: 0,
    username: 'v2k-bridge',
  },
}
```

Remember that you can also change the configuration via environment variables. In this case, you
could change, for example, the verbosity of the logger with the `V2K_LOGGER_VERBOSITY` variable.

If you need to convert any object's keys to a new pattern, like camelCase or PascalCase, instead of
the dotted version we provide, you can use the transformObjectKeys function. You can pass any
function that receives a string and return a string to this function. Example:
```js
const camelCase = require('lodash/camelCase');

// Transforming the MQTT configuration to camelCase
const mqttConfig = ConfigManager.transformObjectKeys(config.mqtt, camelCase);
// Should return:
{
  clientId: 'v2k-bridge',
  hostname: 'vernemq-test',
  port: '1883',
  protocol: 'mqtt',
  qos: 0,
  username: 'v2k-bridge',
}
```
