const Data = require("./overview");

class DayOverview extends Data {
  toJSON() {
    return {
      summary: this.summary,
      unit: this.unit,
      timestamp: this.timestamp,
      readings: this.readings
    };
  }

  parse() {
    this.dataNode = this.findOne(
      "overview-day-fifteen-total",
      this.contextNode
    );
    this.parseSummary("day");

    let powerChan = this.findOne(
      `channel[attribute::name="Power"]`,
      this.dataNode
    );

    this.unit = this.attr("unit", powerChan);

    let powerReadings = this.findOne("day", powerChan);

    this.timestamp = this.attr("timestamp", powerReadings);

    let fiveteenNodes = this.findAll(
      "fiveteen[@timestamp][@mean]",
      powerReadings
    );

    this.readings = [];

    for (let fiveteenNode of fiveteenNodes) {
      let reading = {
        timestamp: this.attr("timestamp", fiveteenNode),
        mean: this.parseFloat(this.attr("mean", fiveteenNode))
      };
      this
        .log`a reading for ${reading.timestamp} has been added with a mean of ${reading.mean}`;

      this.readings.push(reading);
    }
  }
}

module.exports = DayOverview;
