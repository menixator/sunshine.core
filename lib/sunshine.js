const request = require("request");
const cheerio = require("cheerio");
const debug = require("debug");
const tough = require("tough-cookie");
const EventEmitter = require("events").EventEmitter;
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;

const normalize = require("./normalize");

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

// TODO: remove this shit.
class CounterMap extends Map {
  constructor() {
    super();
  }

  increment(id) {
    if (!this.has(id)) return this.set(id, 0);
    this.set(id, this.get(id) + 1);
    return this;
  }

  decrement(id) {
    if (this.has(id)) {
      let count = this.get(id);
      if (count - 1 === 0) {
        this.delete(id);
      } else {
        this.set(id, count - 1);
      }
    }
    return this;
  }
}

class Sunshine extends EventEmitter {
  // Sanitizes values with commas.
  static sanitizeValue(str) {
    if (str === undefined) {
      return 0;
    }
    let val = parseFloat(str.replace(/\s|,/g, "").trim(), 10);
    if (isNaN(val)) return 0;
    return val;
  }

  constructor({ host, username, password, maxInstances }) {
    super();
    this.id = Sunshine.COUNTER++;
    this.host = host || Sunshine.DEFAULT_HOST;
    this.username = username;
    this.password = password;
    this.jar = request.jar();
    this.maxInstances = maxInstances || 10;

    this.children = [];
    this.aggregating = false;
    this.aggregationPromise = null;
    this.requesting = false;
    this.requestPromise = null;
    this.loggedIn = false;
    this.polling = false;

    this._logger = debug(`sunshine:bot[${this.id}]`);

    this.soloPlants = new Map();

    this.cache = {
      aggregation: null,
      plants: new Map()
    };

    // If polling isnt running, then soloscraping.
    this.isSoloScraping = false;
    // Leechscraping is `true` when we leech off the results of
    // the aggregation process to gather a single plant's data.
    this.isLeechScraping = false;

    this.soloScrapeInterval = null;
  }

  emitSoloData(data) {
    if (this.soloPlants.has(data.oid) && this.soloPlants.get(data.oid) !== true)
      this.soloPlants.set(data.oid, true);
    this.emit("solo_scrape", data);
  }

  reportPlantError(oid, err) {
    this.emit("solo_scrape_error", oid, err.message);
  }

  punishNonexistence() {
    for (let [oid, exists] of this.soloPlants.entries()) {
      if (!exists) {
        this.reportPlantError(oid, new Error("plant doesn't exist"));
      }
    }
  }

  addSoloPlant(id) {
    this.soloPlants.set(id, false);

    // If a polling process is running, turn on leech scraping.
    // However, this might prove inefficient as the aggregation
    // might have **just** occured. The user will have to wait
    // for the next tick of the aggregation process.
    //
    // TODO: Maybe gather up the data from `lastAggregation`
    // and emit it out?
    if (this.polling) {
      this.log(`there is already a polling proccess going on`);
      if (!this.isLeechScraping) this.isLeechScraping = true;
      return true;
    }

    // Start a solo scraping process.
    if (!this.isSoloScraping) {
      this.createSoloScrapeInterval(20000);
    }
    return true;
  }

  removeSoloPlant(arg) {
    [].concat(arg).forEach(id => this.soloPlants.delete(id));
    // Stop leech scraping and solo scraping if the `Set` is empty.
    if (this.soloPlants.size === 0) {
      if (this.isSoloScraping) this.destroySoloScrapeInterval();
      this.isLeechScraping = false;
    }
  }

  // Creates a solo-scrape process.
  createSoloScrapeInterval(ms) {
    if (this.soloPlants.size === 0) {
      return false;
    }

    this.log(`started solo scraping`);
    this.isSoloScraping = true;
    return process.nextTick(() => this.soloScrapeTick(20000));
  }

  // The worker for the soloScrape process.
  async soloScrapeTick(ms) {
    this.log(`soloScrape ticked`);
    // Accumulate enough clients for a better thoughtput.
    await this.allocate(this.soloPlants.size);

    let idx = 0;
    for (let plantOid of this.soloPlants.keys()) {
      try {
        let readings = await this.children[idx % this.children.length].readings(
          plantOid
        );
        this.log(`solo scrape for ${plantOid} is done`);
        readings.oid = plantOid;
        this.cache.plants.set(readings.oid, readings);
        this.emitSoloData(readings);
      } catch (err) {
        this.reportPlantError(plantOid, err);
      }
    }

    // Due to the nature of the process, I was forced to use
    // timeouts instead of intervals. The process takes around
    // `~20` seconds on my PC so I'm assuming it will at least take
    // `~10` seconds. As the interval is (supposed to be) a changable
    // value, the tick processes will clash with each other.
    //
    // TODO: check for clashes.
    //
    // TODO: changable interval value.
    if (this.isSoloScraping) {
      this.soloScrapeInterval = setTimeout(() => this.soloScrapeTick(ms), ms);
    }
  }

  destroySoloScrapeInterval() {
    this.isSoloScraping = false;
    clearTimeout(this.soloScrapeInterval);
    this.log(`solo scrape interval destroyed`);
  }

  // The holy grail of logging.
  log(...arg) {
    this._logger(...arg);
  }

  async request(...args) {
    if (this.requesting && this.requestPromise !== null) {
      this.log("waiting for a request to complete");
      await this.requestPromise;
    }

    this.requesting = true;
    this.requestPromise = new Promise((resolve, reject) => {
      request(...args, (err, res) => {
        this.requesting = false;
        this.requestPromise = null;
        if (err) return reject(err);
        return resolve(res);
      });
    });

    return await this.requestPromise;
  }

  // Login with the username and password provided.
  async login() {
    if (this.loggedIn) {
      return null;
    }
    this.log(`logging in as ${this.username}`);

    let res = await this.request({
      method: "POST",
      uri: this.host + Sunshine.ENDPOINT_LOGIN,
      form: {
        __EVENTTARGET: "",
        ctl00$ContentPlaceHolder1$Logincontrol1$LoginBtn: "Login",
        ctl00$ContentPlaceHolder1$Logincontrol1$txtPassword: this.password,
        ctl00$ContentPlaceHolder1$Logincontrol1$txtUserName: this.username
      },
      headers: {
        "user-agent": Sunshine.FAKE_AGENT
      },
      strictSSL: false,
      jar: this.jar
    }).catch(err => {
      this.log(`failed to log in ${err.message}`);
      throw err;
    });

    if (res.headers.location && res.headers.location === "/Plants") {
      this.log(`logged in`);
      this.loggedIn = true;
      return null;
    }
    throw new Error("failed to log in");
  }

  // Gets a list of all the available plants.
  //
  // TODO: pagination more than one page will break this.
  async getPlants() {
    let res = await this.request({
      method: "GET",
      uri: this.host + "/Plants/GetPlantList",
      jar: this.jar,
      qs: Sunshine.PLANT_QUERY
    });

    if (res.statusCode !== 200) throw new Error("failed to get any response");
    let body = null;

    try {
      body = JSON.parse(res.body);
    } catch (err) {
      this.log(`failed to parse response`);
      throw new Error("failed to parse response from server");
    }
    if (
      !body ||
      !body.aaData ||
      {}.toString.call(body.aaData) !== "[object Array]"
    ) {
      throw new Error("no plants found");
    }

    let plants = [];

    body.aaData.forEach(plant => {
      let new_plant = {};
      for (let key in Sunshine.PLANT_DETAILS_MAP) {
        new_plant[key] = plant[Sunshine.PLANT_DETAILS_MAP[key]];
      }
      plants.push(new_plant);
    });
    this.log(`${plants.length} plant(s) recieved`);
    return plants;
  }

  // ## Good Ol' HTML Scraping

  // Gets the readings from the individual plant page.
  async readings(oid) {
    // Sunnyportal does this weird thing where it controls
    // the selected plant through a cookie. This has to be called
    // to get around that.
    // However, since the plant's front page is customizable, it
    // might redirect to some other page.
    //
    // TODO: Check if redirect was to the right page.
    let res = await this.request({
      method: "GET",
      uri: this.host + "/RedirectToPlant/" + oid,
      jar: this.jar,
      headers: {
        "user-agent": Sunshine.FAKE_AGENT
      }
    }).catch(err => {
      this.log("failed to aggregate. reason: " + err.message);
      throw err;
    });

    if (res.statusCode !== 200) throw new Error("unexpected response");

    let $ = cheerio.load(res.body);
    let name = $("#TitleLeftMenuNode_1").attr("title");
    this.log(`scrape overview page for ${name}(${oid})`);
    let co2Widget =
      "#ctl00_ContentPlaceHolder1_UserControlShowDashboard1_carbonWidget_";
    let revWidget =
      "#ctl00_ContentPlaceHolder1_UserControlShowDashboard1_revenueWidget_";
    let revToday = Sunshine.sanitizeValue(
      $(revWidget + "revenuePeriodValue").text()
    );
    let revTotal = Sunshine.sanitizeValue(
      $(revWidget + "revenuePeriodTotalValue").text()
    );

    let co2AvoidedToday = Sunshine.sanitizeValue(
      $(co2Widget + "carbonReductionValue").text()
    );
    let co2AvoidedTodayUnit = $(co2Widget + "carbonReductionUnit").text();
    let co2AvoidedTotal = Sunshine.sanitizeValue(
      $(co2Widget + "carbonReductionTotalValue").text()
    );
    let co2AvoidedTotalUnit = $(co2Widget + "carbonReductionTotalUnit").text();

    let energyWidget =
      "#ctl00_ContentPlaceHolder1_UserControlShowDashboard1_energyYieldWidget_";

    let energyToday = Sunshine.sanitizeValue(
      $(energyWidget + "energyYieldValue").text()
    );
    let energyTodayUnit = $(energyWidget + "energyYieldUnit").text();
    let energyTotal = Sunshine.sanitizeValue(
      $(energyWidget + "energyYieldTotalValue").text()
    );
    let energyTotalUnit = $(energyWidget + "energyYieldTotalUnit").text();

    return Object.assign(
      {
        name: name,
        revenue: {
          today: normalize.revenue(revToday),
          total: normalize.revenue(revTotal)
        },
        co2Avoided: {
          today: normalize.co2Avoided(
            co2AvoidedToday * (CO2_UNITS[co2AvoidedTodayUnit] || 1)
          ),
          total: normalize.co2Avoided(
            co2AvoidedTotal * (CO2_UNITS[co2AvoidedTotalUnit] || 1)
          )
        },
        energy: {
          today: normalize.energy(
            energyToday * (ENERGY_UNITS[energyTodayUnit] || 1)
          ),
          total: normalize.energy(
            energyTotal * (ENERGY_UNITS[energyTotalUnit] || 1)
          )
        }
      },
      // Bless you, async
      await this.getRealtimeReadings(oid)
    );
  }

  // Logs out the current session.
  async logout() {
    if (!this.loggedIn) {
      this.log("already logged out");
      return Promise.resolve(true);
    }

    return this.request({
      method: "GET",
      uri: this.host + "/Templates/Logout.aspx",
      jar: this.jar,
      headers: {
        "user-agent": Sunshine.FAKE_AGENT
      }
    }).then(res => {
      this.log("logged out=" + JSON.stringify(res.statusCode === 200));
      return res.statusCode === 200;
    });
  }

  // Logs out all the children and the parent session along with it.
  async logoutAll() {
    let promiseBucket = [this.logout()];

    for (let child in this.children) {
      promiseBucket.push(child.logoutAll());
    }

    return await Promise.all(promiseBucket);
  }

  // Allocates enough child instances of the `Sunshine` abstraction
  // to do concurrent scraping. This is limited by `this.maxInstnaces`.
  // However, since the initial one isn't counted, it's always `this.maxInstances+1`.
  async allocate(noOfPlants) {
    while (this.children.length < Math.min(this.maxInstances, noOfPlants)) {
      this.children.push(
        new Sunshine({
          host: this.host,
          username: this.username,
          password: this.password
        })
      );
    }
    return await Promise.all(
      this.children.slice(0, noOfPlants).map(child => child.login())
    );
  }

  // A wrapper around `aggregationWorker()`
  async aggregate() {
    if (this.aggregating) {
      await this.aggregationPromise;
    }
    this.aggregating = true;

    let aggregateStart = Date.now();
    this.aggregating = true;

    let aggregationResult = await (this.aggregationPromise = this.aggregationWorker());
    this.log(
      `aggregation successful. process took ${(Date.now() - aggregateStart) /
        1000} seconds`
    );

    this.aggregating = false;
    return aggregationResult;
  }

  // Works on to aggregate all the plants recieved through `getPlants()`
  async aggregationWorker() {
    let plants = await this.getPlants();

    await this.allocate(plants.length);

    let promiseBucket = [];

    for (let [idx, plant] of plants.entries()) {
      promiseBucket.push(
        this.children[idx % this.children.length]
          .readings(plant.oid)
          .then(readings => {
            this.cache.plants.set(plant.oid, readings);
            return Object.assign(plant, readings);
          })
      );
    }

    let plantsWithReadings = await Promise.all(promiseBucket);
    let aggregated = {
      timestamp: Date.now(),
      count: plantsWithReadings.length,
      energy: {
        today: 0,
        total: 0
      },
      revenue: {
        today: 0,
        total: 0
      },
      co2Avoided: {
        today: 0,
        total: 0
      },
      power: 0
    };
    aggregated.plants = plantsWithReadings;

    for (let aggregatedPlant of plantsWithReadings) {
      aggregated.energy.today += aggregatedPlant.energy.today.value;
      aggregated.energy.total += aggregatedPlant.energy.total.value;

      aggregated.revenue.today += aggregatedPlant.revenue.today.value;
      aggregated.revenue.total += aggregatedPlant.revenue.total.value;

      aggregated.co2Avoided.today += aggregatedPlant.co2Avoided.today.value;
      aggregated.co2Avoided.total += aggregatedPlant.co2Avoided.total.value;
      aggregated.power += aggregatedPlant.power.value;

      // Emit solo scrapes.
      if (this.isLeechScraping && this.soloPlants.has(aggregatedPlant.oid)) {
        this.emitSoloData(aggregatedPlant);
      }
    }

    this.punishNonexistence();

    aggregated.energy.today = normalize.energy(aggregated.energy.today);
    aggregated.energy.total = normalize.energy(aggregated.energy.total);

    aggregated.revenue.today = normalize.revenue(aggregated.revenue.today);
    aggregated.revenue.total = normalize.revenue(aggregated.revenue.total);

    aggregated.co2Avoided.today = normalize.co2Avoided(
      aggregated.co2Avoided.today
    );
    aggregated.co2Avoided.total = normalize.co2Avoided(
      aggregated.co2Avoided.total
    );
    aggregated.power = normalize.power(aggregated.power);
    return aggregated;
  }

  toAggregationEvent() {
    return this.cache.aggregation;
  }

  async startAggregation(interval) {
    if (this.polling) return false;
    this.log("starting the poll");
    this.polling = true;

    // Stop soloScraping if it's going on.
    if (this.isSoloScraping) {
      this.log(`destroying solo scrape interval to convert into leech scrape`);
      this.destroySoloScrapeInterval();
    }

    if (this.soloPlants.size > 0) {
      this.isLeechScraping = true;
    }

    process.nextTick(() => this.aggregationTick(interval));
    return true;
  }

  async aggregationTick(interval) {
    if (this.aggregating) {
      this.log(`already aggregating. ignoring current tick`);
      return null;
    }

    let lastAggregation = await this.aggregate().catch(err => {
      this.log(`aggregation failed due to err: ${err.stack}`);
      this.cache.aggregation = {
        status: "fail",
        error: err.message
      };
      this.emit("aggregation", this.toAggregationEvent());
      return null;
    });

    if (lastAggregation) {
      lastAggregation.timestamp = Date.now();

      this.cache.aggregation = {
        status: "ok",
        payload: lastAggregation,
        error: null
      };
      this.emit("aggregation", this.toAggregationEvent());
    }
    if (this.polling) {
      this.log(`setting the timeout again`);
      this.interval = setTimeout(
        () => this.aggregationTick(interval),
        interval
      );
    }
  }

  // Stops the polling interval.
  // If there are solo scrapes,
  async stopAggregation() {
    this.log(`stopping polling`);
    if (this.aggregating) {
      this.log(`currently aggregating something waiting for it to finish`);
      await this.aggregationPromise;
    }
    this.polling = false;
    clearTimeout(this.interval);

    this.log(`stopping the leech scrape`);
    // Let's stop the leech scraping.
    this.isLeechScraping = false;

    if (this.soloPlants.size > 0 && !this.isSoloScraping) {
      this.log(`starting solo scrape`);
      this.createSoloScrapeInterval(20000);
    }
  }

  // Not to be called on it's own.
  async getRealtimeReadings(oid) {
    this.log(`getting readings for ${oid}`);
    let timestamp = Date.now();
    let cookie = request.cookie("plantOid=" + encodeURIComponent(oid));

    this.jar.setCookie(cookie, this.host);

    let res = await this.request({
      method: "GET",
      uri: this.host + "/Dashboard?t=" + timestamp,
      jar: this.jar,
      headers: {
        "user-agent": Sunshine.FAKE_AGENT
      }
    });
    if (res.statusCode !== 200)
      throw new Error("failed to get plant information");
    let body = null;
    try {
      body = JSON.parse(res.body);
    } catch (err) {
      throw new Error("failed to parse response body");
    }
    if (body.OperationHealth === null) {
      body.OperationHealth = {
        Ok: -1,
        Warning: -1,
        Error: -1,
        Unknown: -1
      };
    }
    return {
      timestamp: timestamp,
      power: normalize.power(body.PV || 0),
      messages: {
        info: body.InfoMessages,
        warning: body.WarningMessages,
        error: body.ErrorMessages
      },
      health: {
        ok: body.OperationHealth.Ok,
        warning: body.OperationHealth.Warning,
        error: body.OperationHealth.Error,
        unknown: body.OperationHealth.Unknown
      }
    };
  }
}

Sunshine.ENDPOINT_LOGIN = "/Templates/Start.aspx";
Sunshine.DEFAULT_HOST = "https://www.sunnyportal.com";
// The server at sunny portal does `User-Agent` checks.
Sunshine.FAKE_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36";
Sunshine.PLANT_DETAILS_MAP = {
  oid: "PlantOid",
  name: "PlantName",
  peakPower: "PeakPowerValue",
  yieldToday: "YieldTodayValue",
  yieldYesterday: "YieldYesterdayValue",
  yieldMonth: "YieldMonthValue",
  yieldTotal: "YieldTotalValue",
  performanceMonth: "PerformanceMonthValue",
  performanceYear: "PerformanceYearValue"
};

// `POST` body to get all the plants. Word for word. Might need editing to
// get the next page.
Sunshine.PLANT_QUERY = {
  sEcho: "1",
  iColumns: "8",
  sColumns: ",,,,,,,",
  iDisplayStart: "0",
  iDisplayLength: "100",
  mDataProp_0: "Link",
  sSearch_0: "",
  bRegex_0: "false",
  bSearchable_0: "true",
  bSortable_0: "true",
  mDataProp_1: "PeakPower",
  sSearch_1: "",
  bRegex_1: "false",
  bSearchable_1: "true",
  bSortable_1: "true",
  mDataProp_2: "YieldToday",
  sSearch_2: "",
  bRegex_2: "false",
  bSearchable_2: "true",
  bSortable_2: "true",
  mDataProp_3: "YieldYesterday",
  sSearch_3: "",
  bRegex_3: "false",
  bSearchable_3: "true",
  bSortable_3: "true",
  mDataProp_4: "YieldMonth",
  sSearch_4: "",
  bRegex_4: "false",
  bSearchable_4: "true",
  bSortable_4: "true",
  mDataProp_5: "YieldTotal",
  sSearch_5: "",
  bRegex_5: "false",
  bSearchable_5: "true",
  bSortable_5: "true",
  mDataProp_6: "PerformanceMonth",
  sSearch_6: "",
  bRegex_6: "false",
  bSearchable_6: "true",
  bSortable_6: "true",
  mDataProp_7: "PerformanceYear",
  sSearch_7: "",
  bRegex_7: "false",
  bSearchable_7: "true",
  bSortable_7: "true",
  sSearch: "",
  bRegex: "false",
  iSortCol_0: "6",
  sSortDir_0: "asc",
  iSortingCols: "1"
};

Sunshine.COUNTER = 0;

module.exports = Sunshine;
