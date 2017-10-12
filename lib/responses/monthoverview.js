const Data = require("./overview");

class MonthOverView extends Data {
  toJSON() {
    return {
      summary: this.summary,
      unit: this.unit,
      timestamp: this.timestamp,
      readings: this.readings
    };
  }
  parse() {
    this.dataNode = this.findOne("overview-month-total", this.contextNode);
    this.parseSummary("month");

    let energyChan = this.findOne(
      `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]/month/day/../..`,
      this.dataNode
    );

    this.unit = this.attr("unit", energyChan);

    let energyReadings = this.findOne("month", energyChan);

    this.timestamp = this.attr("timestamp", energyReadings);

    let dayNodes = this.findAll("day[@timestamp][@absolute]", energyReadings);

    this.readings = [];

    for (let dayNode of dayNodes) {
      let reading = {
        timestamp: this.attr("timestamp", dayNode),
        absolute: this.parseFloat(this.attr("absolute", dayNode))
      };
      this
        .log`a reading for ${reading.timestamp} has been added with a absolute of ${reading.absolute}`;

      this.readings.push(reading);
    }
  }
}

module.exports = MonthOverView;
