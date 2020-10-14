const Utils = require('../../../lib/configManager/Utils');

describe('toCanonicalFormat', () => {
  it('should correctly convert to canonical format', () => {
    expect(Utils.toCanonicalFileFormat('testValue', 'testKey')).toEqual('testKey=testValue');
  });
});

describe('createFilename', () => {
  it('should correctly create the filename', () => {
    expect(Utils.createFilename('/root/project', './path', 'testFilename'))
      .toEqual('/root/project/path/testfilename');
  });
});

describe('mergeObjects', () => {
  it('should merge', () => {
    const obj1 = {
      scope1: {
        param1: 1,
        param2: ['a', 'b'],
      },
    };
    const obj2 = {
      scope1: {
        param1: 2,
        param2: ['c', 'd', 'e'],
      },
    };

    expect(Utils.mergeObjects([obj1, obj2])).toEqual({
      scope1: {
        param1: 2,
        param2: ['c', 'd', 'e'],
      },
    });

    expect(Utils.mergeObjects([obj2, obj1])).toEqual({
      scope1: {
        param1: 1,
        param2: ['a', 'b'],
      },
    });
  });
});

describe('isTypeValid', () => {
  it('should correctly recognize the types', () => {
    expect(Utils.isTypeValid('boolean')).toBeTruthy();
    expect(Utils.isTypeValid('BooLeAn')).toBeTruthy();
    expect(Utils.isTypeValid('integer')).toBeTruthy();
    expect(Utils.isTypeValid('InTeGeR')).toBeTruthy();
    expect(Utils.isTypeValid('float')).toBeTruthy();
    expect(Utils.isTypeValid('FlOaT')).toBeTruthy();
    expect(Utils.isTypeValid('string')).toBeTruthy();
    expect(Utils.isTypeValid('StRiNg')).toBeTruthy();
    expect(Utils.isTypeValid('string[]')).toBeTruthy();
    expect(Utils.isTypeValid('StRiNg[]')).toBeTruthy();

    expect(Utils.isTypeValid('double')).toBeFalsy();
  });
});
