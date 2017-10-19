const Interface = require("../lib/interface");
const config = require("../lib/config").fromEnv();
const moment = require('moment');

let iface = new Interface({
  username: config.get("username"),
  password: config.get("password")
});

// INTERVAL = 'MONTH'

class AggregatedDataPool extends Map {
  pushReading(timestamp, reading, oid) {
    if (!this.has(timestamp)) {
      this.set(timestamp, []);
    }

    let pool = this.get(timestamp);

    pool.push({ value: reading.absolute, oid });
  }

  toJSON() {
    let output = [];

    for (let [key, value] of this.entries()) {
      let data = {
        timestamp: key,
        values: value
      };
      output.push(data);
    }
    return output;
  }

  push({ oid, name }, readings) {
    for (let reading of readings) {
      this.pushReading(reading.timestamp, reading, { oid, name });
    }
  }
}

iface
  .login()
  .then(async () => {
    let plants = await iface.getPlants();

    let pool = new AggregatedDataPool();
    let oidMappings = {};

    let date = moment().startOf('month');

    for (let plant of plants) {
      let data = await iface.monthOverview(plant.oid, date.toDate());
      oidMappings[plant.oid] = plant.name;
      pool.push(plant.oid, data.readings);
    }

    console.log({
      unit: "kWh",
      interval: 'MONTH',
      pointer: date.valueOf(),
      plants: oidMappings,
      dataPool: pool.toJSON()
    });
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
