const createTokenKeycloakGen = require('../../../../lib/webUtils/createTokenKeycloakGen');

describe("Unit tests of script 'createTokenKeycloakGen.js'", () => {
  let tokenGen = null;

  beforeAll(() => {
    tokenGen = createTokenKeycloakGen();
  });

  it("should generate a dummy token with tenant equal 'admin'", () => expect(tokenGen.generate({ tenant: 'admin' })).resolves.toBeDefined());

  it('should generate a dummy token with a custom payload', () => expect(tokenGen.generate({ payload: { iss: 'http://localhost:8000/auth/realms/admin' } })).resolves.toBeDefined());
});
