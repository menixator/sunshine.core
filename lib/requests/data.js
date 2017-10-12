const Base = require("./base");
const responses = require("../responses");

class Data extends Base {
  static formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date
      .getDate()
      .toString()
      .padStart(2, "0")}`;
  }

  constructor(token, oid, type, date, qs) {
    super({
      method: "GET",
      service: "data",
      segments: [oid, type, Data.formatDate(date || new Date())],
      token: token,
      statusCodes: [200],
      qs
    });


    this.extra.qs.culture = "en-gb";
    this.extra.qs.identifier = token.identifier;
  }
}

module.exports = Data;
