/* eslint-disable no-template-curly-in-string */
const { EnvVars } = require('../../../../lib/configManager/preProcessors');

describe('preProcess', () => {
  it('should correctly add the env var value - env var is defined', () => {
    process.env.TEST_VARIABLE = 'testDir';

    expect(EnvVars.preProcess(['scope1.param1=/root/${TEST_VARIABLE}'])).toEqual([
      'scope1.param1=/root/testDir',
    ]);
  });

  it('should correctly add the env var value - env var is not defined', () => {
    expect(EnvVars.preProcess(['scope1.param1=/root/${TEST_UNDEFINED_VARIABLE:-defaultDir}']))
      .toEqual(['scope1.param1=/root/defaultDir']);
  });

  it('should not parse the env var - empty "${}" clause', () => {
    expect(EnvVars.preProcess(['scope1.param1=/root/${}'])).toEqual(['scope1.param1=/root/${}']);
  });
});
