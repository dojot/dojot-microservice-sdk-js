# Configuration Manager

This module is responsible for the creation of a configuration file for the services. It creates a
file based on:
- Environment variables
- User configuration file
- Default configuration file

This is, also, the precedence for the configuration, from higher to lower priority. The following
image summarizes the module flow:

![Configuration Manager flow](../../docs/images/Configuration Manager Flow.png)

# Patterns

## Environment variables

All environment variables must follow this format:
```
{SERVICE}_{SCOPE}_{KEY}
```

Where:
- SERVICE: an acronym for the module, should be alphanumeric. Example: K2V, KAFKAWS.
- SCOPE: the name of a configuration object, should be alphanumeric. Example: MQTT, LWM2M, KAFKA.
- KEY: a value that will be put in the {SCOPE} object. Can contain subparts that are separated by
underscores. These underscores are converted in dots in the final configuration. Examples:
CLIENT_ID, BROKER_LIST.

Examples of full environment variables names:
```
V2K_APP_HOSTNAME
V2K_APP_CONNECTION_RETRY_COUNT
```

## User configuration files

The user configuration file can be used to replace the default values with the ones that should be
used in a determined environment. This way, you can have multiple configuration files for a myriad
of environments, e.g. production, development, 100K load test, etc.
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
scope2.param.key=value
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
- It should be in a directory named `config` in the project root
- It accepts types for variables
- It accepts comments too

### Types

To remove the burden of treating variables' types in the service code, this module provides an easy
way of handling them. Examples of variables and types:
```
scope1.param.boolean.key:boolean=true
scope1.param.float.key:float=3.1415
scope1.param.integer.key:integer=10
scope1.param.string.array.key:string[]=["stringA", 'stringB']
scope2.param.explicit.string.key:string=this is explicitly typed as string
scope2.param.implicit.string.key=this has the string type
scope2.param.string.quotation.mark="strings are not delimited, these quotation marks will be in the string"
```

The accepted types are:
- boolean: true or false, case insensitive.
- float: any value with or without decimal places.
- integer: any value without decimal places.
- string[]: a list of strings, must be delimited by [ ] and each string must be delimited by ' or ".
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
you can already see, the translation removes the {SERVICE} acronym. The translation is as follows:

| Environment variable     | File parameter   |
| ------------------------ | ---------------- |
| V2K_APP_HOSTNAME         | app.hostname     |
| EXAMPLE_SCOPE1_PARAM_KEY | scope1.param.key |

## Scopes

Let's say you have two classes and need two different configuration objects to pass to them. You can
use the scopes to solve this issue.

Example:

example.conf
```
class1.param1:integer=10
class1.param2=value2
class2.param3=value3
class2.param4.key1=value41
class2.param4.key2=value42
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
    'param4.key2': 'value42',
  },
}
```

__NOTE THAT__ the {SCOPE} part is always the name of a configuration object.
__NOTE THAT__ the object has always a depth of one, thus you should access the dotted ones like
this:
```js
obj.class2['param4.key1']
```

# Usage

Create the default configuration file `./config/default.conf` in your project's root directory.

Now you can start using the module:
```js
const { ConfigManager } = require('@dojot/microservice-sdk');
ConfigManager.loadSettings('V2K');
const config = ConfigManager.getConfig();
```

If you need to convert any object's keys to a new pattern, like camelCase or PascalCase, instead of
the dotted version we provide, you can use the transformObjectKeys function. You can pass any
function that receives a string and return a string to this function. Example:
```js
const { ConfigManager } = require('@dojot/microservice-sdk');
const camelCase = require('lodash/camelCase');

const obj = { 'param1.key1': 'value11', 'param1.key2': 'value12' };
const newObj = ConfigManager.transformObjectKeys(obj, camelCase);
console.log(newObj);
// Should print:
// { param1Key1: 'value11', param1Key2: 'value12' }
```

__NOTE THAT__ you don't need to call `loadSettings` every time you need the configuration, you just
need to call it in your initialization file. In other places where you need it, call `getConfig`.
