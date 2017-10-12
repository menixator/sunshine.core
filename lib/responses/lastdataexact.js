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

    let day = this.attr(["timestamp", "absolute", "difference"], "day", chan);
    let hour = this.attr(["timestamp", "absolute", "difference"], "hour", chan);

    this.day = {
      timestamp: day.timestamp,
      absolute: this.parseFloat(day.absolute),
      difference: this.parseFloat(day.difference)
    };

    this.hour = {
      timestamp: hour.timestamp,
      absolute: this.parseFloat(hour.absolute),
      difference: this.parseFloat(hour.difference)
    };
  }
}

module.exports = LastDataExact;
