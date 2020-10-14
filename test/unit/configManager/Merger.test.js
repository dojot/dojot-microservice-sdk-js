const Merger = require('../../../lib/configManager/Merger');

const envVarsData = [
  'scope1.testparam1=10',
  'scope1.testparam3=2.1',
  'scope1.testparam5=anotherExplicitString',
];
const userData = [
  'scope1.testparam2=["fg", "e"]',
];
const defaultData = [
  'scope1.testparam1:integer=2',
  'scope1.testparam2:string[]=["ab", "c", "e"]',
  'scope1.testparam3:float=1.1',
  'scope1.testparam4:boolean=false',
  'scope1.testparam5:string=explicitString',
  'scope1.testparam6=implicitString',
];

describe('Functionality', () => {
  it('should correctly merge - 3 non-empty configurations', () => {
    const merged = Merger.mergeConfigs(envVarsData, userData, defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 10,
        testparam2: ['fg', 'e'],
        testparam3: 2.1,
        testparam4: false,
        testparam5: 'anotherExplicitString',
        testparam6: 'implicitString',
      },
    });
  });

  it('should correctly merge - 2 non-empty configurations', () => {
    const merged = Merger.mergeConfigs(envVarsData, userData, []);
    expect(merged).toEqual({
      scope1: {
        testparam1: '10',
        testparam2: '["fg", "e"]',
        testparam3: '2.1',
        testparam5: 'anotherExplicitString',
      },
    });
  });

  it('should correctly merge - 1 non-empty configurations', () => {
    const merged = Merger.mergeConfigs(envVarsData, [], []);
    expect(merged).toEqual({
      scope1: {
        testparam1: '10',
        testparam3: '2.1',
        testparam5: 'anotherExplicitString',
      },
    });
  });

  it('should correctly merge - all configurations empty', () => {
    const merged = Merger.mergeConfigs([], [], []);
    expect(merged).toEqual({});
  });
});

describe('Precedence', () => {
  it('should apply the default config', () => {
    const merged = Merger.mergeConfigs([], [], defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 2,
        testparam2: ['ab', 'c', 'e'],
        testparam3: 1.1,
        testparam4: false,
        testparam5: 'explicitString',
        testparam6: 'implicitString',
      },
    });
  });

  it('should apply the user config', () => {
    const merged = Merger.mergeConfigs([], userData, defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 2,
        testparam2: ['fg', 'e'],
        testparam3: 1.1,
        testparam4: false,
        testparam5: 'explicitString',
        testparam6: 'implicitString',
      },
    });
  });

  it('should apply the environment variables config', () => {
    const merged = Merger.mergeConfigs(envVarsData, userData, defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 10,
        testparam2: ['fg', 'e'],
        testparam3: 2.1,
        testparam4: false,
        testparam5: 'anotherExplicitString',
        testparam6: 'implicitString',
      },
    });
  });
});

describe('Typing', () => {
  it('should create a typed configuration object from user the configuration file', () => {
    const merged = Merger.mergeConfigs([], userData, defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 2,
        testparam2: ['fg', 'e'],
        testparam3: 1.1,
        testparam4: false,
        testparam5: 'explicitString',
        testparam6: 'implicitString',
      },
    });
  });

  it('should create a typed configuration object from environment variables', () => {
    const merged = Merger.mergeConfigs(envVarsData, userData, defaultData);
    expect(merged).toEqual({
      scope1: {
        testparam1: 10,
        testparam2: ['fg', 'e'],
        testparam3: 2.1,
        testparam4: false,
        testparam5: 'anotherExplicitString',
        testparam6: 'implicitString',
      },
    });
  });
});
