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
 * Merges objects in a new object. The higher the index of the object in the passed array, the
 * higher its precedence is. This function only merges one level deep. For a better understanding of
 * what it means, check out the example:
 *
 * ```js
 * const obj1 = { scope1: { param1: { param11: "text" } } }
 * const obj2 = { scope1: { param1: { param12: "anotherText" } } }
 * mergeObjects([obj1, obj2]);
 * // Returns:
 * // { scope1: { param1: { param12: 'anotherText' } } }
 * ```
 *
 * As you can see, the parameters inside the `param1` object are not merged; the object is
 * overwritten by the one with higher precedence.
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
