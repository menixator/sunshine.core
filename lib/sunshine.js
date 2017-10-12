const request = require("request");
const tough = require("tough-cookie");
const EventEmitter = require("events").EventEmitter;
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;
const formatter = require("./formatter");
const log = formatter("sunshine:bot");
const normalize = require("./normalize");
const requests = require("./requests");
const moment = require("moment");

// ## Unit Normalizers

// Energy's basic unit is `watt-hour`
const ENERGY_UNITS = {
  Wh: 1,
  kWh: 1000,
  MWh: 1000 * 1000,
  GWh: 1000 * 1000 * 1000
};

// Co2 mass is normalized to kilograms.
const CO2_UNITS = {
  g: 1 / 1000,
  kg: 1,
  t: 1000
};

const AGGREGATION_EVENT = "aggregation::tick";
const SINGLE_PLANT_EVENT = "plant::tick";

class Sunshine extends EventEmitter {
  constructor({ host, username, password, maxInstances }) {
    super();
    this.host = host || Sunshine.DEFAULT_HOST;
    this.log = log;
    this.username = username;
    this.password = password;
    this.token = null;
  }

  async getPlantPowerReading(oid) {
    let dayOverview = await this.dayOverview(oid);

    let now = Date.now();
    let closestFifteenMinute = moment(now - now % (15 * 60 * 1000));

    if (dayOverview.readings.length === 0)
      return {
        latest: { value: 0, unit: dayOverview.unit },
        timestring: closestFifteenMinute.format("DD/MM/YYYY HH:mm"),
        offBy: 0
      };

    let latest = dayOverview.readings[dayOverview.readings.length - 1];

    let latestReadingMoment = moment(
      dayOverview.timestring + " " + latest.timestring,
      "DD/MM/YYYY HH:mm"
    );
    let offBy = Math.max(
      (closestFifteenMinute.valueOf() - latestReadingMoment) / (15 * 60 * 1000),
      0
    );

    return {
      oid,
      latest: { value: latest.mean, unit: dayOverview.unit },
      timestamp: latestReadingMoment.valueOf(),
      offBy
    };
  }

  async getPlantEnergy(oid) {
    let lastDataExact = await this.lastDataExact(oid);
    let unit = lastDataExact.unit;

    return {
      oid,
      total: {
        value: (lastDataExact.day && lastDataExact.day.absolute) || 0,
        unit
      },
      day: {
        value: (lastDataExact.day && lastDataExact.day.difference) || 0,
        unit
      },
      hour: {
        value: (lastDataExact.hour && lastDataExact.hour.difference) || 0,
        unit
      }
    };
  }

  async lastDataExact(oid, date) {
    return await new requests.LastDataExact(this.token, oid, date).perform();
  }

  async yearOverview(oid, date) {
    date = date || new Date();
    return await new requests.YearOverview(this.token, oid, date).perform();
  }

  async monthOverview(oid, date) {
    date = date || new Date();
    return await new requests.MonthOverview(this.token, oid, date).perform();
  }

  async dayOverview(oid, date) {
    date = date || new Date();
    return await new requests.DayOverview(this.token, oid, date).perform();
  }

  async allData(oid, interval) {
    return await new requests.AllData(this.token, oid, interval).perform();
  }

  // Login with the username and password provided.
  async login() {
    if (this.token) {
      return this.token;
    }

    this.log`logging in as ${this.username}`;
    // service=authentication.
    let res = (this.token = await new requests.Authentication(
      this.username,
      this.password
    ).perform());

    this.token = res;
    return res;
  }

  // Gets a list of all the available plants.
  async getPlants() {
    return await new requests.PlantList(this.token).perform();
  }

  async getPlant(oid) {
    return await new requests.PlantProfile(this.token, oid).perform();
  }

  // Logs out the current session.
  async logout() {
    if (this.token === null) {
      this.log`already logged out`;
      return Promise.resolve(true);
    }

    let res = await new requests.Logout(this.token).perform();
    return res;
  }

  async aggregate() {
    let aggregated = {
      power: { value: 0, unit: "kWh" },
      energy: {
        total: {
          value: 0,
          unit: "kWh"
        },
        today: {
          value: 0,
          unit: "kwH"
        }
      }
    };
    let aggregatedPlants = [];

    let plants = this.getPlants();
    for (let plant of await plants) {
      let plantEnergy = await this.getPlantEnergy(plant.oid);
      let plantPower = await this.getPlantPowerReading(plant.oid);

      aggregated.power.value += plantPower.latest.value;
      aggregated.energy.total.value += plantEnergy.total.value;
      this.log`${plant.name} power.now = ${plantPower.latest.value} kW (${plantPower.offBy > 0 ?-plantPower.offBy : '@@'})`
      this.log`${plant.name} energy.today = ${plantEnergy.day.value} kWh`
      this.log`${plant.name} energy.total = ${plantEnergy.total.value} kWh`
      aggregated.energy.today.value += plantEnergy.day.value;

      aggregatedPlants.push({
        oid: plant.oid,
        name: plant.name,
        powerOffBy: plantPower.offBy
      });
    }

    return {
      aggregated: aggregated,
      plants: aggregatedPlants,
    };
  }
}
module.exports = Sunshine;
