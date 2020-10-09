/**
 * @module Writer writes the JSON config file.
 */
const { writeFileSync } = require('fs');

const jsonStringify = require('fast-safe-stringify');

const { createFilename } = require('../Utils');

/**
 * Writes the JSON configuration object in a file.
 *
 * @param {string} rootPath the project root path that contains the `configPath`.
 * @param {string} configPath the name of the directory that contains the configuration files.
 * @param {string} service
 * @param {object} data object to be written in a file
 */
const writeJson = (rootPath, configPath, service, data) => {
  const jsonFilename = createFilename(rootPath, configPath, `${service}.json`);
  writeFileSync(jsonFilename, jsonStringify(data));
};

module.exports = { writeJson };
