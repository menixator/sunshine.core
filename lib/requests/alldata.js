const Data = require("./data");
const responses = require("../responses");

class AllData extends Data {
  constructor(token, oid, interval) {
    // token, oid, type, date, qs
    super(token, oid, "Energy", new Date(), {
      period: "infinite",
      // Interval=year/month
      interval,
      unit: "kWh"
    });
    this.log`fetching alldata for interval ${interval}`;
    if (typeof interval !== "string") {
      throw new Error("interval should be a string");
    } else if (!~["year", "month"].indexOf(interval.trim().toLowerCase())) {
      throw new Error(
        "interval can be a year or a month for All Data Requests"
      );
    }
  }

  handleResponse(res) {
    return new responses.AllData(res.body);
  }
}

module.exports = AllData;
