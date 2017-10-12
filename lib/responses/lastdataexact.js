const Data = require("./data");

class LastDataExact extends Data {
  toJSON() {
    return {
      name: this.name,
      metaName: this.metaName,
      unit: this.unit,
      day: this.day,
      hour: this.hour
    };
  }

  parse() {
    let chan = this.findOne("Energy/channel", this.contextNode);
    let attrs = this.attr(["name", "meta-name", "unit"], chan);

    this.name = attrs.name;
    this.metaName = attrs["meta-name"];
    this.unit = attrs.unit;

    let dayNode = this.find("day", chan);
    this.day = null;
    this.hour = null;

    if (dayNode) {
      let day = this.attr(
        ["timestamp", "absolute", "difference"],
        dayNode,
        chan
      );
      this.day = {
        timestamp: day.timestamp,
        absolute: this.parseFloat(day.absolute),
        difference: this.parseFloat(day.difference)
      };
    }

    let hourNode = this.find("hour", chan);
    if (hourNode) {
      let hour = this.attr(
        ["timestamp", "absolute", "difference"],
        hourNode,
        chan
      );

      this.hour = {
        timestamp: hour.timestamp,
        absolute: this.parseFloat(hour.absolute),
        difference: this.parseFloat(hour.difference)
      };
    }
  }
}

module.exports = LastDataExact;
