const request = require("request");
const formatter = require("./formatter");
const log = formatter("sunshine:interface");
const requests = require("./requests");
const moment = require("moment");
const round = require("./round");

class APIInterface {
  constructor({ username, password }) {
    this.log = log;
    this.username = username;
    this.password = password;
    this.token = null;
  }

  async idleLogoutGuard(promise, method, args) {
    try {
      return await promise;
    } catch (err) {
      if (
        err.code === "authentication-error" &&
        err.message.match(
          /Exception while checking Authentication. \| No RasObject or AuthOID for User \[.+?\] found./
        )
      ) {
        this.log`not logged in! idle guard is kicking in.`;
        this.token = null;
        await this.login();
        return await this[method](...args);
      }
      throw err;
    }
  }

  async lastDataExact(oid, date) {
    return await this.idleLogoutGuard(
      new requests.LastDataExact(this.token, oid, date).perform(),
      "lastDataExact",
      [oid, date]
    );
  }

  async yearOverview(oid, date) {
    date = date || new Date();
    return await this.idleLogoutGuard(
      new requests.YearOverview(this.token, oid, date).perform(),
      "yearOverview",
      [oid, date]
    );
  }

  async monthOverview(oid, date) {
    date = date || new Date();
    return await this.idleLogoutGuard(
      new requests.MonthOverview(this.token, oid, date).perform(),
      "monthOverview",
      [oid, date]
    );
  }

  async dayOverview(oid, date) {
    date = date || new Date();
    return await this.idleLogoutGuard(
      new requests.DayOverview(this.token, oid, date).perform(),
      "dayOverview",
      [oid, date]
    );
  }

  async allData(oid, interval) {
    return await this.idleLogoutGuard(
      new requests.AllData(this.token, oid, interval).perform(),
      "allData",
      [oid, interval]
    );
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
    return await this.idleLogoutGuard(
      new requests.PlantList(this.token).perform(),
      "getPlants",
      []
    );
    // return await ;
  }

  async getPlant(oid) {
    return await this.idleLogoutGuard(
      new requests.PlantProfile(this.token, oid).perform(),
      "getPlant",
      [oid]
    );
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

module.exports = APIInterface;
