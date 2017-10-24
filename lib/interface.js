const request = require("request");
const formatter = require("./formatter");
const log = formatter("sunshine:interface");
const requests = require("./requests");
const moment = require("moment");
const round = require("./round");

const CARBON_GRAM_AVOIDED_PER_KWH = 700;

const USD_PER_KWH = 0.42;

class APIInterface {
  constructor({ username, password }) {
    this.log = log;
    this.username = username;
    this.password = password;
    this.token = null;
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
}

APIInterface.CARBON_GRAM_AVOIDED_PER_KWH = CARBON_GRAM_AVOIDED_PER_KWH;
APIInterface.USD_PER_KWH = USD_PER_KWH;

module.exports = APIInterface;
