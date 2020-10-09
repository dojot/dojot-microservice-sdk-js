const fs = require('fs');

const jsonStringify = require('fast-safe-stringify');

const Writer = require('../../../../lib/configManager/fileManager/Writer');
const Utils = require('../../../../lib/configManager/Utils');

jest.mock('fs');

jest.mock('../../../../lib/configManager/Utils', () => ({
  createFilename: jest.fn(() => '/root/project/config/testsvc.json'),
}));

describe('writeJson', () => {
  it('should write the file', () => {
    const data = { testParam: 10 };
    const dataInJson = jsonStringify(data);

    Writer.writeJson('/root/project', './config', 'TESTSVC', data);

    expect(Utils.createFilename).toHaveBeenCalledWith('/root/project', './config', 'TESTSVC.json');
    expect(fs.writeFileSync).toHaveBeenCalledWith('/root/project/config/testsvc.json', dataInJson);
  });
});
