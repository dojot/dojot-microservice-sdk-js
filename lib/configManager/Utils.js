const forEach = require('lodash/forEach');
const { join } = require('path');

const Types = ['boolean', 'float', 'integer', 'string', 'string[]'];

/**
 * Transforms the value and key into the canonical form for file storage.
 *
 * @param {string} value
 * @param {string} key
 */
const toCanonicalFileFormat = (value, key) => `${key}=${value}`;

/**
 * Creates a configuration filename in an absolute path.
 *
 * @param {string} rootPath the project root path that contains the `configPath`.
 * @param {string} configPath the name of the directory that contains the configuration files.
 * @param {string} filename
 *
 * @returns {string}
 */
const createFilename = (rootPath, configPath, filename) => join(
  rootPath, configPath, filename.toLowerCase(),
);

/**
 * Checks if the passed type is a valid one (case insensitive).
 *
 * @param {string} type
 */
const isTypeValid = (type) => Types.some((acceptedType) => acceptedType === type.toLowerCase());

/**
 * Merges objects in a new object (this function merges one level depth only).
 *
 * @param {Array} data array of objects to merge
 *
 * @returns {Object}
 */
const mergeObjects = (data) => {
  const finalConfig = {};

  data.forEach((obj) => {
    forEach(obj, (scope, key) => {
      finalConfig[key] = { ...finalConfig[key], ...scope };
    });
  });

  return finalConfig;
};

module.exports = {
  createFilename,
  mergeObjects,
  toCanonicalFileFormat,
  isTypeValid,
};
