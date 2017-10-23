const Data = require("./overview");
const moment = require("moment");

class MonthOverView extends Data {
  toJSON() {
    return {
      empty: this.empty,
      summary: this.summary,
      unit: this.unit,
      timestring: this.timestring,
      timestamp: this.timestamp,
      readings: this.readings
    };
  }
  parse() {
    this.dataNode = this.findOne("overview-month-total", this.contextNode);
    this.parseSummary("month");

    let energyChan = this.find(
      `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]/month/day/../..`,
      this.dataNode
    );

    this.empty = !energyChan;
    this.readings = [];

    if (this.empty) {
      // No data for the given month.

      let emptyChan = this.findFirst(
        `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]`,
        this.dataNode
      );
      this.timestring = this.attr(
        "timestamp",
        this.findOne("month", emptyChan)
      );
      this.timestamp = moment(this.timestring, "MM/YYYY").valueOf();
      this.unit = this.attr("unit", emptyChan);

      return this;
    }

    this.unit = this.attr("unit", energyChan);

    let energyReadings = this.findOne("month", energyChan);

    this.timestring = this.attr("timestamp", energyReadings);

    this.timestamp = moment(this.timestring, "MM/YYYY").valueOf();

    let dayNodes = this.findAll("day[@timestamp][@absolute]", energyReadings);

    for (let dayNode of dayNodes) {
      let reading = {
        timestring: this.attr("timestamp", dayNode),
        absolute: this.parseFloat(this.attr("absolute", dayNode))
      };

      reading.timestamp = moment(reading.timestring, "DD/MM/YYYY").valueOf();

      this
        .log`a reading for ${reading.timestamp} has been added with a absolute of ${reading.absolute}`;

      this.readings.push(reading);
    }
  }
}

module.exports = MonthOverView;
