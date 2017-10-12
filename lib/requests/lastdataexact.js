const Data = require("./data");
const responses = require("../responses");

class LastDataExact extends Data {
  constructor(token, oid, date) {
    // token, oid, type, date, qs
    super(token, oid, "Energy", date, {
      unit: "kWh", // Case sensitive
      view: "lastdataexact"
    });
  }
  handleResponse(res) {
    return new responses.LastDataExact(res.body);
  }
}

module.exports = LastDataExact;
