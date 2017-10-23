const Data = require("./overview");
const moment = require("moment");

class YearOverview extends Data {
  toJSON() {
    return {
      readings: this.readings,
      timestamp: this.timestamp,
      unit: this.unit,
      summary: this.summary
    };
  }
  parse() {
    this.dataNode = this.findOne("overview-year-total", this.contextNode);
    this.parseSummary("year");

    let energyChan = this.find(
      `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]/year/month/../..`,
      this.dataNode
    );

    this.readings = [];

    this.empty = !energyChan;

    if (this.empty) {
      // No data for the given year.

      let emptyChan = this.findFirst(
        `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]`,
        this.dataNode
      );
      this.timestring = this.attr("timestamp", this.findOne("year", emptyChan));
      this.timestamp = moment(this.timestring, "YYYY").valueOf();
      this.unit = this.attr("unit", emptyChan);

      return this;
    }

    this.unit = this.attr("unit", energyChan);

    let yearNode = this.findOne("year", energyChan);

    this.timestring = this.attr("timestamp", yearNode);
    let yearInstant = moment(this.timestring, "YYYY");
    this.timestamp = yearInstant.valueOf();

    let monthNodes = this.findAll("month[@timestamp][@absolute]", yearNode);

    for (let monthNode of monthNodes) {
      let reading = {
        timestring: this.attr("timestamp", monthNode),
        absolute: this.parseFloat(this.attr("absolute", monthNode))
      };

      let readingInstant = moment(reading.timestring, "MM/YYYY");
      reading.timestamp = readingInstant.valueOf();

      this
        .log`a reading for ${reading.timestamp} has been added with a absolute of ${reading.absolute}`;

      this.readings.push(reading);
    }
  }
}

module.exports = YearOverview;
