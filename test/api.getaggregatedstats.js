const config = require("../lib/config").fromEnv();
const Interface = require("../lib/interface");
const Mediator = require("../lib/mediator");
const moment = require("moment");

let iface = new Interface({
  username: config.get("username"),
  password: config.get("password")
});

let mediator = new Mediator(iface);

iface
  .login()
  .then(async () => {
    let powerReading = await mediator.getAggregatedStatistics("revenue", 1474277072000, 'year');
    console.log(JSON.stringify(powerReading, null, 2));
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
