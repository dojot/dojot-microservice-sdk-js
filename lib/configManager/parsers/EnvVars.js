const { map, pickBy } = require('lodash');
const { toCanonicalFileFormat } = require('../Utils');

/**
 * Creates the configuration string array from environment variables.
 *
 * @param {string} service acronym for the service, should only contain letters/numbers
 *
 * @returns {string[]}
 */
const parseEnvironmentVariables = (service) => {
  // Picking only the variables that begin with '<service>_'
  const environmentVariables = pickBy(
    process.env, (value, key) => key.toString().match(`${service}_.*`),
  );

  const config = map(environmentVariables, (value, key) => {
    /**
     * Removing the service from the variable and splitting them by '__'. This is done to replace
     * them with only one underscore in the final parameter. This is kind of a escaped underscore.
     */
    const splitTwoUnderscores = key.toString().replace(`${service}_`, '').toLowerCase().split('__');
    // Replacing '_' by '.'
    const toDottedNotation = splitTwoUnderscores.map((val) => val.trim().replace(/_/g, '.'));
    // Now that each part is the dotted notation, we can unite them with '_'
    const newKey = toDottedNotation.join('_');

    return toCanonicalFileFormat(value, newKey);
  });

  return config;
};

module.exports = { parseEnvironmentVariables };
