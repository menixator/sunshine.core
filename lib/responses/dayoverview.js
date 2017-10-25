const Data = require("./overview");
const moment = require("moment");

class DayOverview extends Data {
  toJSON() {
    return {
      summary: this.summary,
      unit: this.unit,
      timestring: this.timestring,
      timestamp: this.timestamp,
      readings: this.readings,
      discontinuity: this.discontinuity
    };
  }

  get latest() {
    return this.readings.length === 0
      ? undefined
      : this.readings[this.readings.length - 1];
  }

  parse() {
    this.dataNode = this.findOne(
      "overview-day-fifteen-total",
      this.contextNode
    );
    this.parseSummary("day");

    let powerChan = this.findOne(
      `channel[attribute::meta-name="Power"]`,
      this.dataNode
    );

    this.findError(powerChan);

    this.unit = this.attr("unit", powerChan);
    let powerReadings = this.findOne("day", powerChan);

    this.timestring = this.attr("timestamp", powerReadings);
    let instant = moment(this.timestring, "DD/MM/YYYY").startOf("day");

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

    if (this.readings.length > 0) {
      let latestMoment = moment(this.latest.timestamp);
      let now = moment();

      if (
        now.diff(latestMoment, "days") > 0 ||
        now.date() !== latestMoment.date()
      ) {
        this.discontinuity = 0;
      } else {
        let latestTimestamp = this.latest.timestamp;
        let now = Date.now();
        let closestInterval = now - now % (15 * 60 * 1000);
        this.discontinuity =
          (closestInterval - latestTimestamp) / (15 * 60 * 1000);
      }
    } else {
      this.discontinuity = -1;
    }
  }
}

module.exports = DayOverview;
