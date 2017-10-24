const round = require("./round");

let fix = value => {
  return round.round10(value, -2);
};

let humanize = value => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

exports.power = reading => {
  let { value } = reading;

  if (value > 1000) {
    return Object.assign(reading, {
      humanized: {
        unit: "MW",
        value: humanize(fix(value / 1000))
      }
    });
  }

  return Object.assign(reading, {
    humanized: {
      unit: "kW",
      value: humanize(fix(value))
    }
  });
};

exports.energy = reading => {
  let { value } = reading;

  if (value > 1000) {
    return Object.assign(reading, {
      humanized: {
        unit: "MWh",
        value: humanize(fix(value / 1000))
      }
    });
  }

  return Object.assign(reading, {
    humanized: {
      unit: "kWh",
      value: humanize(fix(value))
    }
  });
};

exports.co2Avoided = reading => {
  let { value } = reading;

  if (value > 1000000) {
    return Object.assign(reading, {
      humanized: {
        unit: "t",
        value: humanize(fix(value / 1000000))
      }
    });
  }

  if (value > 1000) {
    return Object.assign(reading, {
      humanized: {
        unit: "kg",
        value: humanize(fix(value / 1000))
      }
    });
  }

  return Object.assign(reading, {
    humanized: { unit: "g", value: humanize(fix(value)) }
  });
};

exports.revenue = reading => {
  let { value } = reading;

  return Object.assign(reading, {
    humanized: { value: humanize(fix(value)), unit: "$" }
  });
};
