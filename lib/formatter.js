const chalk = require("chalk");
const debug = require("debug");
const LOGGERS = new Map();

let getLogger = function(nsp) {
  if (!LOGGERS.has(nsp)) {
    LOGGERS.set(nsp, debug(nsp));
  }
  return LOGGERS.get(nsp);
};

module.exports = function(namespace) {
  return function(strings, ...args) {
    let formattedArgs = args.map(arg => {
      let type = Object.prototype.toString
        .call(arg)
        .slice("[object ".length, -1);
      switch (type) {
        case "String":
          if (arg === '@@') return '';
          return `'${chalk.green(arg)}'`;
        case "Null":
          return chalk.magenta(arg);
        case "Number":
          return chalk.blue(arg);
        case "Undefined":
          return chalk.yellow(arg);
        case "Object":
          return chalk.cyan(Object.keys(arg).reduce((str, key)=> `${str} ${key}=${arg[key]}`, ''));
        case "Error":
          return chalk.red(
            `<${arg.constructor.name || "Error"}${ arg.code ? chalk.yellow(`{${arg.code}}`) : '@@'}: ${arg.message}>`
          );
        case "Default":
          return arg;
      }
    });

    let unMuxedStrings = strings.slice(0);
    let unMuxedArgs = formattedArgs.slice(0);
    let mux = [];

    while (unMuxedStrings.length + unMuxedArgs.length > 0) {
      if (unMuxedStrings.length) mux.push(unMuxedStrings.shift());
      if (unMuxedArgs.length) mux.push(unMuxedArgs.shift());
    }

    return getLogger(namespace)(mux.join(""));
  };
};
