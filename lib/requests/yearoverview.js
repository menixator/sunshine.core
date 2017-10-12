const Data = require("./data");
const responses = require("../responses");

class YearOverview extends Data {
  constructor(token, oid, date) {
    // token, oid, type, date, qs
    super(token, oid, "overview-year-total", date);
  }
  handleResponse(res) {
    return new responses.YearOverview(res.body);
  }
}

module.exports = YearOverview;
