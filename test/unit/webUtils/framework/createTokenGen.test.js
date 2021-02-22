const createTokenGen = require('../../../../lib/webUtils/createTokenGen');

describe("Unit tests of script 'tokenGen.js'", () => {
  let tokenGen = null;

  beforeAll(() => {
    tokenGen = createTokenGen();
  });

  it("should generate a dummy token with tenant equal 'admin'", () => expect(tokenGen.generate({ tenant: 'admin' })).resolves.toBeDefined());

  it('should generate a dummy token with a custom payload', () => expect(tokenGen.generate({ payload: { service: 'admin' } })).resolves.toBeDefined());
});
