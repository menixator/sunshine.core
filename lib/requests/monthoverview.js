const Data = require("./data");
const responses = require("../responses");

class MonthOverview extends Data {
  constructor(token, oid, date) {
    // token, oid, type, date, qs
    super(token, oid, "overview-month-total", date);
  }
  handleResponse(res) {
    return new responses.MonthOverView( res.body );
  }
}

module.exports = MonthOverview;
