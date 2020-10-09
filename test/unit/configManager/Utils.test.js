const Utils = require('../../../lib/configManager/Utils');

jest.mock('path', () => ({
  dirname: jest.fn(() => '/root/project'),
  join: jest.fn((path1, path2, filename) => `${path1}/${path2.slice(2)}/${filename.toLowerCase()}`),
}));

describe('toCanonicalFormat', () => {
  it('should correctly convert to canonical format', () => {
    expect(Utils.toCanonicalFileFormat('testValue', 'testKey')).toEqual('testKey=testValue');
  });
});

describe('createFilename', () => {
  it('should correctly create the filename', () => {
    expect(Utils.createFilename('./path', 'testFilename')).toEqual('/root/project/path/testfilename');
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
