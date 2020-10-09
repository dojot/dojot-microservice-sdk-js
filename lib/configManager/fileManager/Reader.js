/**
 * @module Reader reads the config files.
 */
const { readFileSync, existsSync } = require('fs');

const Sanitizer = require('./Sanitizer');
const Utils = require('../Utils');
const { Logger } = require('../../logging/Logger');

const logger = new Logger('microservice-sdk:config-manager-reader');

/**
 * Reads the default configuration file and returns an array of unparsed parameters.
 *
 * @param {string} configPath the name of the directory that contains the configuration files,
 * defaults to `./config`.
 * @param {string} rootPath the project root path that contains the `configPath`, defaults to the
 * value of `require.main.filename`, i.e., the path to the main file of your service.
 *
 * @returns {string[]}
 * @throws if the default configuration file is empty or not found
 */
const readDefaultConfig = (configPath = './config', rootPath = require.main.filename) => {
  const defaultConfigLocation = Utils.createFilename(rootPath, configPath, 'default.conf');

  if (existsSync(defaultConfigLocation)) {
    const data = readFileSync(defaultConfigLocation).toString();

    if (data === '') {
      throw new Error('empty default configuration');
    }

    const config = Sanitizer.sanitize(data);
    return config;
  }

  throw new Error(`default configuration file ${defaultConfigLocation} not found`);
};

/**
 * Reads the user configuration file and returns an array of unparsed parameters.
 *
 * @param {string} filename
 * @param {string} configPath the name of the directory that contains the configuration files,
 * defaults to `./config`.
 * @param {string} rootPath the project root path that contains the `configPath`, defaults to the
 * value of `require.main.filename`, i.e., the path to the main file of your service.
 *
 * @returns {string[]}
 */
const readUserConfig = (filename, configPath = './config', rootPath = require.main.filename) => {
  const fileLocation = Utils.createFilename(rootPath, configPath, filename);
  if (existsSync(fileLocation)) {
    const data = readFileSync(fileLocation).toString();
    const config = Sanitizer.sanitize(data);
    return config;
  }
  logger.debug(`User configuration file ${fileLocation} not present`);
  return [];
};

/**
 * Reads the configuration from the JSON file.
 *
 * @param {string} service
 * @param {string} configPath the name of the directory that contains the configuration files,
 * defaults to `./config`.
 * @param {string} rootPath the project root path that contains the `configPath`, defaults to the
 * value of `require.main.filename`, i.e., the path to the main file of your service.
 *
 * @returns {object}
 */
const readJson = (service, configPath = './config', rootPath = require.main.filename) => {
  const filename = Utils.createFilename(rootPath, configPath, `${service}.json`);
  if (existsSync(filename)) {
    const data = readFileSync(filename);
    const config = JSON.parse(data);
    return config;
  }
  logger.debug('JSON configuration file not present');
  return {};
};

module.exports = { readDefaultConfig, readJson, readUserConfig };
