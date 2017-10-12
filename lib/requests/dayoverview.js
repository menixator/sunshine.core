const Data = require("./data");
const responses = require("../responses");

class DayOverview extends Data {
  constructor(token, oid, date) {
    // token, oid, type, date, qs
    super(token, oid, "overview-day-fifteen-total", date);
  }
  handleResponse(res) {
    return new responses.DayOverview( res.body );
  }
}

module.exports = DayOverview;
