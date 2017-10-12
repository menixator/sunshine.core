const Data = require("./data");

class AllData extends Data {
  toJSON() {
    return {
      name: this.name,
      metaName: this.metaName,
      unit: this.unit,
      timestamp: this.timestamp,
      data: this.data
    };
  }

  parse() {
    let chan = this.findOne("Energy/channel", this.contextNode);
    let attrs = this.attr(["name", "meta-name", "unit"], chan);

    this.name = attrs.name;
    this.metaName = attrs["meta-name"];
    this.unit = attrs.unit;

    let infiniteChan = this.findOne("infinite", chan);

    this.timestamp = this.attr("timestamp", infiniteChan);

    this.data = [];

    let monthNodes = this.findAll("month", infiniteChan);

    for (let monthNode of monthNodes) {
      if (
        !(
          monthNode.hasAttribute("absolute") &&
          monthNode.hasAttribute("difference")
        )
      )
        continue;
      let month = {
        timestamp: this.attr("timestamp", monthNode),
        absolute: this.parseFloat(this.attr("absolute", monthNode)),
        difference: this.parseFloat(this.attr("difference", monthNode))
      };
      this
        .log`month ${month.timestamp} added. difference=${month.difference}, absolute=${month.absolute}`;
      this.data.push(month);
    }
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}

module.exports = AllData;
