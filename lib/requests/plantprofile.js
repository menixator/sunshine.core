const Base = require("./base");
const PlantRequest = require('./plantrequest');

const responses = require("../responses");

class PlantProfile extends PlantRequest {
  constructor(token, oid) {
    super(token, oid, 'profile');
  }

  handleResponse(res){
    return new responses.PlantProfile(res.body);
  }
}

module.exports = PlantProfile;
