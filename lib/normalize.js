let fix = value => {
  return value.toFixed(2);
};

let humanize = value => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

exports.power = value => {
  if (value > 1000000) {
    return {
      value,
      humanizedUnit: "MWh",
      humanized: humanize(fix(value / 1000000))
    };
  }

  if (value > 1000) {
    return {
      value,
      humanizedUnit: "KWh",
      humanized: humanize(fix(value / 1000))
    };
  }

  return { value, humanized: humanize(fix(value)), humanizedUnit: "Wh" };
};

exports.energy = value => {
  if (value > 1000000) {
    return {
      value,
      humanizedUnit: "MW",
      humanized: humanize(fix(value / 1000000))
    };
  }

  if (value > 1000) {
    return {
      value,
      humanizedUnit: "KW",
      humanized: humanize(fix(value / 1000))
    };
  }

  return { value, humanized: humanize(fix(value)), humanizedUnit: "W" };
};

exports.co2Avoided = value => {
  if (value > 1000) {
    return {
      value,
      humanizedUnit: "t",
      humanized: humanize(fix(value / 1000))
    };
  }

  return { value, humanized: humanize(fix(value)), humanizedUnit: "Kg" };
};


exports.revenue = value => {
  return {value, humanized: humanize(fix(value)), humanizedUnit: '$' };
};