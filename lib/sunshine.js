const request = require("request");
const tough = require("tough-cookie");
const EventEmitter = require("events").EventEmitter;
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;
const formatter = require("./formatter");
const log = formatter("sunshine:bot");
const normalize = require("./normalize");
const requests = require("./requests");

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

const AGGREGATION_EVENT = 'aggregation::tick';
const SINGLE_PLANT_EVENT = 'plant::tick'

class Sunshine extends EventEmitter {
  constructor({ host, username, password, maxInstances }) {
    super();
    this.host = host || Sunshine.DEFAULT_HOST;

    this.username = username;
    this.password = password;

    this.aggregating = false;
    this.aggregationPromise = null;

    this.token = null;
    this.polling = false;

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
      this.log`there is already a polling proccess going on`;
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

    this.log`started solo scraping`;
    this.isSoloScraping = true;
    return process.nextTick(() => this.soloScrapeTick(20000));
  }

  // The worker for the soloScrape process.
  async soloScrapeTick(ms) {
    this.log`soloScrape ticked`;
    // Accumulate enough clients for a better thoughtput.

    let idx = 0;
    for (let plantOid of this.soloPlants.keys()) {
      try {
        let readings = await this.children[idx % this.children.length].readings(
          plantOid
        );
        this.log`solo scrape for ${plantOid} is done`;
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

  destroySoloScrapeInterval() {
    this.isSoloScraping = false;
    clearTimeout(this.soloScrapeInterval);
    this.log`solo scrape interval destroyed`;
  }

  // The holy grail of logging.
  log(...arg) {
    log(...arg);
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

  // A wrapper around `aggregationWorker()`
  async aggregate() {
    if (this.aggregating) {
      await this.aggregationPromise;
    }
    this.aggregating = true;

    let aggregateStart = Date.now();
    this.aggregating = true;

    let aggregationResult = await (this.aggregationPromise = this.aggregationWorker());
    this.log`aggregation successful. process took ${(Date.now() -
      aggregateStart) /
      1000} seconds`;

    this.aggregating = false;
    return aggregationResult;
  }

  // Works on to aggregate all the plants recieved through `getPlants()`
  async aggregationWorker() {
    let plants = await this.getPlants();

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
    this.log`starting the poll`;
    this.polling = true;

    // Stop soloScraping if it's going on.
    if (this.isSoloScraping) {
      this.log`destroying solo scrape interval to convert into leech scrape`;
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
      this.log`already aggregating. ignoring current tick`;
      return null;
    }

    let lastAggregation = await this.aggregate().catch(err => {
      this.log`aggregation failed due to err: ${err.stack}`;
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
      this.log`setting the timeout again`;
      this.interval = setTimeout(
        () => this.aggregationTick(interval),
        interval
      );
    }
  }

  // Stops the polling interval.
  // If there are solo scrapes,
  async stopAggregation() {
    this.log`stopping polling`;
    if (this.aggregating) {
      this.log`currently aggregating something waiting for it to finish`;
      await this.aggregationPromise;
    }
    this.polling = false;
    clearTimeout(this.interval);

    this.log`stopping the leech scrape`;
    // Let's stop the leech scraping.
    this.isLeechScraping = false;

    if (this.soloPlants.size > 0 && !this.isSoloScraping) {
      this.log`starting solo scrape`;
      this.createSoloScrapeInterval(20000);
    }
  }
}
module.exports = Sunshine;
