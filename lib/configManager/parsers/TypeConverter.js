/**
 * Converts to boolean.
 *
 * @param {string} value
 *
 * @returns {boolean}
 */
const toBoolean = (value) => value.toString().trim().toLowerCase() === 'true';

/**
 * Converts to float.
 *
 * @param {string} value
 *
 * @returns {number}
 */
const toFloat = (value) => Number(value);

/**
 * Converts to integer.
 *
 * @param {string} value
 *
 * @returns {number}
 */
const toInteger = (value) => parseInt(value, 10);

/**
 * Converts to string.
 *
 * @param {string} value
 *
 * @returns {string}
 */
const toString = (value) => value.toString().trim();

/**
 * Converts to string[].
 *
 * @param {string} value
 *
 * @returns {string[]}
 */
const toStringArray = (value) => {
  const valueToString = value.toString().trim();
  // Verifying whether the array is correctly delimited by []
  if (!valueToString.match(/^\[.+\]$/)) {
    throw new Error('invalid array of strings');
  }
  const resultingArray = JSON.parse(valueToString);

  const hasOnlyStrings = resultingArray.every((element) => typeof element === 'string');

  if (!hasOnlyStrings) {
    throw new Error('invalid value passed to a string[]');
  }

  return resultingArray;
};

module.exports = {
  boolean: toBoolean,
  float: toFloat,
  integer: toInteger,
  string: toString,
  'string[]': toStringArray,
};
