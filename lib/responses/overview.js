const Data = require("./data");

class Overview extends Data {
  toJSON() {
    return {
      summary: this.summary,
      unit: this.unit,
      timestamp: this.timestamp,
      readings: this.readings
    };
  }

  parseSummary(period) {
    if (!this.dataNode) {
      let err = new Error("data node is missing");
      this.log`ParseError: ${err}`;
      throw err;
    }

    this.summary = null;
    
    let summaryChan = this.find(
      // This is used for everythting . . .
      `channel[attribute::name="Total yield"][attribute::meta-name="Energy"]/${period}[@absolute and @difference]/..`,
      this.dataNode
    );

    if (!summaryChan) return false;

    let summary = this.find(
      `${period}[@absolute and @difference]`,
      summaryChan
    );

    this.log`summary for ${period} is ${!!summary ? "@@" : "not"} present`;
    if (summary) {
      this.summary = {
        absolute: this.parseFloat(this.attr("absolute", summary)),
        difference: this.parseFloat(this.attr("difference", summary)),
        unit: this.attr("unit", summaryChan)
      };
    } else {
      this.summary = null;
    }
    this.log`summary: ${this.summary}`;
  }
}

module.exports = Overview;
