const Data = require("./overview");
const moment = require("moment");

class DayOverview extends Data {
  toJSON() {
    return {
      summary: this.summary,
      unit: this.unit,
      timestring: this.timestring,
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

    this.timestring = this.attr("timestamp", powerReadings);
    let instant = moment(this.timestring, "DD/MM/YYYY").startOf('day');

    this.timestamp = instant.valueOf();


    let fiveteenNodes = this.findAll(
      "fiveteen[@timestamp][@mean]",
      powerReadings
    );

    this.readings = [];

    for (let fiveteenNode of fiveteenNodes) {
      let reading = {
        timestring: this.attr("timestamp", fiveteenNode),
        mean: this.parseFloat(this.attr("mean", fiveteenNode))
      };

      let readingInstant = moment(
        this.timestring + " " + reading.timestring,
        "DD/MM/YYYY HH:mm"
      );

      reading.timestamp = readingInstant.valueOf();

      this.readings.push(reading);
    }
  }
}

module.exports = DayOverview;
