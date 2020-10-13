const { merge } = require('lodash');
const { unflatten } = require('flat');

/**
 * Transforms an array of configuration parameters in an object. The object is in the format:
 *
 * ```
 * {
 *   scope1: {
 *     flat.parameter.a: 'value',
 *     flat.parameter.b: 'value',
 *     flat.parameter_c: 'value',
 *   },
 *   .
 *   .
 *   .
 *   scopeN: {
 *     flat.parameter.a: 'value',
 *     flat.parameter.b: 'value',
 *   },
 * }
 * ```
 *
 * @param {{parameter: string, value: any}[]} data array of parsed lines
 *
 * @returns {object}
 */
const parseConfig = (data) => {
  const config = data.reduce((acc, line) => {
    // Object with the extracted configuration
    const configLineObject = {};
    /*
      * We can't specify the depth we want the unflatten function to transform the object, and we
      * want only the first '.' to be considered, so we change it to '/' so unflatten can expand the
      * object the way we want.
      */
    const newParameter = line.parameter.trim().replace('.', '/');
    configLineObject[newParameter] = line.value;
    return merge(acc, unflatten(configLineObject, { delimiter: '/' }));
  }, {});

  return config;
};

module.exports = { parseConfig };
