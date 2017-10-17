const Data = require("./overview");
const moment = require("moment");

class YearOverview extends Data {
  parse() {
    this.dataNode = this.findOne("overview-year-total", this.contextNode);
    this.parseSummary("year");

    let energyChan = this.findOne(
      `channel[attribute::name="Total yield" and attribute::meta-name="Energy"]/year/month/../..`,
      this.dataNode
    );

    this.unit = this.attr("unit", energyChan);

    let yearNode = this.findOne("year", energyChan);

    this.timestring = this.attr("timestamp", yearNode);
    let yearInstant = moment(this.timestring, "YYYY");
    this.timestamp = yearInstant.valueOf();

    let monthNodes = this.findAll("month[@timestamp][@absolute]", yearNode);

    this.readings = [];

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
