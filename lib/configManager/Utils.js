const { dirname, join } = require('path');

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
 * @param {string} path
 * @param {string} filename
 *
 * @returns {string}
 */
const createFilename = (path, filename) => {
  const rootPath = dirname(require.main.filename);
  return join(rootPath, path, filename.toLowerCase());
};

/**
 * Checks if the passed type is a valid one (case insensitive).
 *
 * @param {string} type
 */
const isTypeValid = (type) => Types.some((acceptedType) => acceptedType === type.toLowerCase());

module.exports = {
  createFilename,
  toCanonicalFileFormat,
  isTypeValid,
};
