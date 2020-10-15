const Parsers = require('./parsers');
const { mergeObjects } = require('./Utils');
const PreProcessors = require('./preProcessors');

/**
 * Processes and merges the configurations from environment variables, user config file and default
 * config file into one object.
 *
 * @param {string[]} envVarsData
 * @param {string[]} userData
 * @param {string[]} defaultData
 */
const mergeConfigs = (envVarsData, userData, defaultData) => {
  // Applying the pre processor for env vars in the default and user configs
  const preProcessedDefault = PreProcessors.EnvVars.preProcess(defaultData);
  const preProcessedUser = PreProcessors.EnvVars.preProcess(userData);

  // Transforming the lines in parsed objects
  const parsedEnvVars = envVarsData.map(Parsers.Type.parseLine);
  const parsedUser = preProcessedUser.map(Parsers.Type.parseLine);
  const parsedDefault = preProcessedDefault.map(Parsers.Type.parseLine);

  // Applying the types to parameters, taking into account the types in the default configuration
  // file
  const typedEnvVars = parsedEnvVars
    .map((parsedLine) => Parsers.Type.mapToTyped(parsedLine, parsedDefault));
  const typedUser = parsedUser
    .map((parsedLine) => Parsers.Type.mapToTyped(parsedLine, parsedDefault));
  const typedDefault = parsedDefault
    .map((parsedLine) => Parsers.Type.applyType(parsedLine));

  // Building the object that can be written to a .json file
  const objectEnvVars = Parsers.File.parseConfig(typedEnvVars);
  const objectUser = Parsers.File.parseConfig(typedUser);
  const objectDefault = Parsers.File.parseConfig(typedDefault);

  const merged = mergeObjects([objectDefault, objectUser, objectEnvVars]);

  return merged;
};

module.exports = { mergeConfigs };
