const Base = require("./base");

class Data extends Base {
  parseFloat(val) {
    let parsed = parseFloat(val, 10);
    if (isNaN(val)) {
      return 0;
    }
    return parsed;
  }

  kiloWattHourToWattHour(val) {
    return this.parseFloat(val) * 1000;
  }
}

module.exports = Data;
