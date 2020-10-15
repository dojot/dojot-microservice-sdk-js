/**
 * Processes the raw strings
 *
 * @param {Array<string>} data
 */
const preProcess = (data) => data.map((value) => {
  // This RegExp extracts all elements that are surrounded by ${}
  const regex = /\$\{[^$]+\}/;

  let envVarValue;
  let newValue = value;

  let matched = regex.exec(newValue);
  while (matched) {
    // We slice the match to remove the `${}` and then we split it to retrieve the default value
    // (if there is any)
    const [envVarName, envVarDefaultValue] = matched.toString().slice(2, -1).split(':-');

    envVarValue = undefined;
    // We retrieve the env var value or use the default one (if provided)
    envVarValue = process.env[envVarName] || envVarDefaultValue;
    // Substitute the matched by the env var value in the string
    newValue = newValue.replace(matched, envVarValue);

    matched = regex.exec(newValue);
  }

  return newValue;
});

module.exports = { preProcess };
