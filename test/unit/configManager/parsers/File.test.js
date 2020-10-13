const File = require('../../../../lib/configManager/parsers/File');

describe('parseConfig', () => {
  it('should correctly parse the array', () => {
    const data = [
      { parameter: 'scope1.testparam1', value: 10 },
      { parameter: 'scope1.test.param2', value: true },
      { parameter: 'scope2.test_param1', value: 'testvalue' },
    ];

    const parsedObj = File.parseConfig(data);

    expect(parsedObj).toEqual({
      scope1: { testparam1: 10, 'test.param2': true },
      scope2: { test_param1: 'testvalue' },
    });
  });
});
