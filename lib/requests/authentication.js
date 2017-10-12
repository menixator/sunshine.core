const Base = require("./base");
const responses = require('../responses');

class Authentication extends Base {
  constructor(username, password) {
    super({
      method: "GET",
      service: "authentication",
      qs: { password },
      segments: [username],
      statusCodes: [200]
    });

    this.username = username;
    this.password = password;
  }

  handleResponse(res){
    return new responses.Authentication(res.body);
  }
}


module.exports = Authentication