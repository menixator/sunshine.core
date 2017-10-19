const Base = require("./base");
const responses = require("../responses");
const moment = require('moment');

class Data extends Base {

  constructor(token, oid, type, date, qs) {
    super({
      method: "GET",
      service: "data",
      segments: [oid, type, moment(date || new Date()).format('YYYY-MM-DD')],
      token: token,
      statusCodes: [200],
      qs
    });


    this.extra.qs.culture = "en-gb";
    this.extra.qs.identifier = token.identifier;
  }
}

module.exports = Data;
