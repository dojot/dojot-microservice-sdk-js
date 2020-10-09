const { dirname } = require('path');

const Parsers = require('./parsers');
const { Reader, Writer } = require('./fileManager');
const Merger = require('./Merger');

/**
 * Creates the configuration file ./config/<service>.conf. The precedence is (from higher to lower):
 * - Environment variables
 * - User config file
 * - Default config file
 *
 * @param {string} service acronym for the service, should only contain letters/numbers
 * @param {string} userConfigFile path to the user configuration file, defaults to 'production.conf'
 * @param {string} configPath the name of the directory that contains the configuration files,
 * defaults to `./config`.
 * @param {string} rootPath the project root path that contains the `configPath`, defaults to the
 * value of `require.main.filename`, i.e., the path to the main file of your service.
 */
const loadSettings = (service,
  userConfigFile = 'production.conf',
  configPath = './config',
  rootPath = dirname(require.main.filename)) => {
  const envVarsData = Parsers.EnvVars.parseEnvironmentVariables(service);
  const userData = Reader.readUserConfig(rootPath, configPath, userConfigFile);
  const defaultData = Reader.readDefaultConfig(rootPath, configPath);

  const config = Merger.mergeConfigs(envVarsData, userData, defaultData);

  Writer.writeJson(rootPath, configPath, service, config);
};

/**
 * Retrieves the configuration from the file.
 *
 * @param {string} service acronym for the service, should only contain letters/numbers
 * @param {string} path path to the user configuration file, defaults to './config'
 *
 * @returns {object} the configuration object
 */
const getConfig = (service, configPath = './config', rootPath = dirname(require.main.filename)) => {
  const config = Reader.readJson(rootPath, configPath, service);
  return config;
};

module.exports = { loadSettings, getConfig };
