const Base = require("./base");
const responses = require("../responses");

class PlantList extends Base {
  constructor(token) {
    super({
      method: "GET",
      service: "plantlist",
      segments: [token.identifier],
      token: token,
      statusCodes: [200]
    });
  }

  handleResponse(res) {
    return new responses.PlantList(res.body, this.token);
  }
}

module.exports = PlantList;
