const Base = require("./base");
const XRegExp = require("xregexp");

class PlantProfile extends Base {
  toJSON() {
    return {
      name: this.name,
      peakPower: this.peakPower,
      location: this.location,
      startDate: this.startDate,
      data: this.data,
      inverters: this.inverters,
      coms: this.coms
    };
  }

  parse() {
    this.name = this.findOneText("name", this.contextNode);

    this.peakPower = {
      value: this.findOneText("peak-power", this.contextNode),
      unit: this.attr("unit", "peak-power", this.contextNode)
    };

    this.location = this.findOneText("city-country", this.contextNode);
    this.startDate = this.findOneText("start-date", this.contextNode);

    this.data = {};

    let channels = this.findAll("production-data/channel", this.contextNode);

    for (let channel of channels) {
      switch (this.attr("meta-name", channel)) {
        case "Energy":
          this.parseChannel(channel, "energyPerAnnum").annum = true;
          break;

        case "CO2-Reduction":
          this.parseChannel(channel, "co2ReductionPerAnnum").annum = true;
          break;

        default:
          this.log`unknown channel ${this.ptr(
            channel
          )} with meta-name: ${this.attr("meta-name", channel)}`;
          throw new Error(
            `unknown channel with meta-name: ${this.attr("meta-name", channel)}`
          );
      }
    }

    this.inverters = [];

    let inverters = this.findAll("inverters/inverter", this.contextNode);

    for (let inverter of inverters) {
      this.inverters.push({
        count: parseInt(this.attr("count", inverter)),
        icon: this.attr("deviceIcon", inverter),
        descr: inverter.textContent
      });
    }

    this.coms = [];
    let coms = this.findAll("communicationProducts/communicationProduct", this.contextNode);

    for (let com of coms) {
      this.coms.push({
        count: parseInt(this.attr("count", com)),
        icon: this.attr("deviceIcon", com),
        descr: com.textContent
      });
    }
  }

  parseChannel(channel, key) {
    // TODO: Reaplce
    if (this.data.hasOwnProperty(key)) {
      throw new Error(
        `a data hash with the key ${key} has already been defined`
      );
    }

    let value = channel.textContent;
    let fallBackUnit = this.attr("unit", channel);

    let chan = {
      metaName: this.attr("meta-name", channel),
      name: this.attr("name", channel),
      readings: []
    };

    chan.approximated = !!value.match(/approx/i);
    chan.annual = !!value.match(/annum|annually/);

    XRegExp.forEach(value, PlantProfile.VALUE_PARSER, (match, idx) => {
      let reading = {
        value: parseFloat(match.value.replace(/,/g, ""), 10)
      };

      if (match.units) {
        reading.units = match.units.trim().split("/");
      } else {
        reading.units = [];
      }
      chan.readings.push(reading);
    });

    if (chan.readings.length === 1 && chan.readings[0].units.length === 0) {
      chan.readings.units.push(fallBackUnit);
    }

    for (let i = chan.readings.length - 1; --i > 0; ) {
      if (chan.readings[i].units.length === 0) {
        chan.readings.splice(i, 1);
      }
    }

    this.data[key] = chan;
    return chan;
  }
}

PlantProfile.VALUE_PARSER = XRegExp(
  `
(?<value>[\\d,]+(?:\\.\\d*)?)
(?<units> \\s* [a-z]{1,} (\\s*[/]\\s*[a-z]{1,}) *)?
`,
  "xig"
);
module.exports = PlantProfile;
