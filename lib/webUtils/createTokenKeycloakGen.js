const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const jwtSignAsync = promisify(jwt.sign).bind(jwt);

function createTokenKeycloakGen() {
  /**
   * Sign the given payload into a JSON Web Token string
   *
   * @param {object} data - data for JWT generation
   */
  const generate = async ({
    payload = {},
    tenant = '',
    externalAccessKeycloakURL = 'http://localhost:8000/auth',
    expirationSec = 60,
    secret = 'secret',
  }) => {
    const innerPayload = { ...payload };
    if (typeof innerPayload.iss !== 'string') {
      innerPayload.iss = `${externalAccessKeycloakURL}/realms/${tenant}`;
    }
    const token = await jwtSignAsync(innerPayload, secret, { expiresIn: expirationSec });
    return token;
  };

  // returns an object of type "TokenGen"
  return Reflect.construct(function TokenGen() {
    this.generate = generate;
  }, []);
}

module.exports = () => createTokenKeycloakGen();
