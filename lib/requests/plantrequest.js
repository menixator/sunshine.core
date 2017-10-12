const Base = require("./base");
const responses = require("../responses");

class PlantInfo extends Base {
  constructor(token, oid, view) {
    super({
      method: "GET",
      service: "plant",
      segments: [oid],
      token: token,
      statusCodes: [200],
      qs: {
        view,
        culture: "en-gb",
        "plant-image-size": "64px",
        identifier: token.identifier
      }
    });
  }
}

module.exports = PlantInfo;
