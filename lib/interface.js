const request = require("request");
const formatter = require("./formatter");
const log = formatter("sunshine:interface");
const normalize = require("./normalize");
const requests = require("./requests");
const moment = require("moment");
const round = require("./round");

const CARBON_GRAM_AVOIDED_PER_KWH = 700;

const USD_PER_KWH = 0.42;

class APIInterface {
  constructor({ host, username, password, maxInstances }) {
    this.host = host || APIInterface.DEFAULT_HOST;
    this.log = log;
    this.username = username;
    this.password = password;
    this.token = null;
  }

  async getPlantPowerReading(oid) {
    let dayOverview = await this.dayOverview(oid);

    let now = Date.now();
    let closestFifteenMinute = moment(now - now % (15 * 60 * 1000)).valueOf();

    if (dayOverview.readings.length === 0)
      return {
        latest: { value: 0, unit: dayOverview.unit },
        timestamp: -1,
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
      latest: { value: latest.mean, unit: dayOverview.unit },
      timestamp: latestReadingMoment.valueOf(),
      offBy
    };
  }

  async getPlantEnergy(oid) {
    let lastDataExact = await this.lastDataExact(oid);
    let unit = lastDataExact.unit;

    return {
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

  async getPlantInfo(oid) {
    let energy = await this.getPlantEnergy(oid);
    let power = await this.getPlantPowerReading(oid);
    let co2Avoided = {
      total: {
        value: CARBON_GRAM_AVOIDED_PER_KWH * energy.total.value,
        unit: "g"
      },
      today: {
        value: CARBON_GRAM_AVOIDED_PER_KWH * energy.day.value,
        unit: "g"
      }
    };

    let revenue = {
      total: {
        value: USD_PER_KWH * energy.total.value,
        unit: "$"
      },
      today: {
        value: USD_PER_KWH * energy.day.value,
        unit: "$"
      }
    };
    return { timestamp: Date.now(), energy, power, co2Avoided, revenue };
  }

  async aggregate() {
    let now = Date.now();

    let lastInterval = moment(now - now % (15 * 60 * 1000)).valueOf();

    let aggregated = {
      power: { value: 0, unit: "kWh" },
      energy: {
        total: {
          value: 0,
          unit: "kWh"
        },
        today: {
          value: 0,
          unit: "kWh"
        }
      }
    };
    let readings = [];

    let plants = this.getPlants();
    for (let plant of await plants) {
      let reading = await this.getPlantInfo(plant.oid);
      let { energy, power } = reading;

      aggregated.power.value += power.latest.value;
      aggregated.energy.total.value += energy.total.value;
      this.log`${plant.name} power.now = ${power.latest
        .value} kW (${power.offBy > 0 ? -power.offBy : "@@"})`;
      this.log`${plant.name} energy.today = ${energy.day.value} kWh`;
      this.log`${plant.name} energy.total = ${energy.total.value} kWh`;
      aggregated.energy.today.value += energy.day.value;

      reading.oid = plant.oid;
      reading.name = plant.name;

      readings.push(reading);
    }

    aggregated.co2Avoided = {
      total: {
        value: round.round10(
          CARBON_GRAM_AVOIDED_PER_KWH * aggregated.energy.total.value,
          -2
        ),
        unit: "g"
      },
      today: {
        value: round.round10(
          CARBON_GRAM_AVOIDED_PER_KWH * aggregated.energy.today.value,
          -2
        ),
        unit: "g"
      }
    };

    aggregated.revenue = {
      total: {
        value: round.round10(USD_PER_KWH * aggregated.energy.total.value, -2),
        unit: "$"
      },
      today: {
        value: round.round10(USD_PER_KWH * aggregated.energy.today.value, -2),
        unit: "$"
      }
    };

    aggregated.power.value = round.round10(aggregated.power.value, -2);
    aggregated.energy.total.value = round.round10(
      aggregated.energy.total.value,
      -2
    );
    aggregated.energy.today.value = round.round10(
      aggregated.energy.today.value,
      -2
    );

    return {
      timestamp: Date.now(),
      lastPowerInterval: lastInterval,
      aggregated: aggregated,
      plants: readings
    };
  }
}
module.exports = APIInterface;
