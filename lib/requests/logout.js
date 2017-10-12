const Base = require("./base");
const responses = require("../responses");

class Logout extends Base {
  constructor(token) {
    super({
      method: "DELETE",
      service: "authentication",
      segments: [token.identifier],
      token: token,
      statusCodes: [200]
    });
  }

  handleResponse(res) {
    return new responses.Authentication(res.body);
  }
}

module.exports = Logout;
