const { EventEmitter } = require("events");

const CARBON_KILOGRAM_AVOIDED_PER_KWH = 0.7;
const USD_PER_KWH = 0.42;

const moment = require("moment");

const config = require("./config");
const formatter = require("./formatter");

let log = formatter("sunshine:mediator");
const Repository = require("./repository");

const AGGREGATION_EVENT = "aggregation::tick";
const AGGREGATION_ERROR = "aggregation::error";
const SINGLE_PLANT_EVENT = "plant::tick";
const SINGLE_PLANT_ERROR = "plant::error";
const normalize = require("./normalize");

class Mediator extends EventEmitter {
  constructor(iface) {
    super();
    this.iface = iface;

    this.aggregationPollTimeout = null;
    this.focusedPollTimeout = null;

    this.isFocusedPolling = false;
    this.focusedPool = new Set();
    this.isAggregationPolling = false;

    this.isLeechPolling = false;

    this.log = log;

    this.cache = {
      aggregation: null,
      plants: new Map()
    };

    this.cacheClearTimeout = null;
    //  TODO: add to config
    this.cacheClearInterval = 5 * 60 * 1000;

    this.aggregationInterval = Mediator.AGGREGATION_INTERVAL * 1000;
    this.plantFetchInterval = Mediator.PLANT_FETCH_INTERVAL * 1000;
    this.log`mediator created. will fetch plants every: ${this.plantFetchInterval /
      1000} seconds. will aggregate every: ${this.aggregationInterval / 1000} seconds`;
  }

  // Destroys a mediator. Tries to do it's best to clean up after itself.
  destroy() {
    this.unrigCache();
    this.clearCache();
    this.stopAggregation();
    this.stopFocusedPoll();
  }

  // Clears the saved up cache. This will happen if no clients are
  // connected for the amount of time in `clearCacheInterval`
  clearCache() {
    this.log`cache has been cleared`;
    this.cache = {
      aggregation: null,
      plants: new Map()
    };
  }

  // Rigs the cache to expire.
  rigCache() {
    this.unrigCache();
    this.log`cache has been rigged to expire in ${this.cacheClearInterval /
      1000} seconds}`;
    this.cacheClearTimeout = setTimeout(() => {
      this.clearCache();
    }, this.cacheClearInterval);
  }

  // Stops the cache from expiring. This happens if a client does connect after it's been rigged.
  unrigCache() {
    this.log`cache has been unrigged`;
    clearTimeout(this.cacheClearTimeout);
    this.cacheClearTimeout = null;
  }

  // Helper to check if a plant information is present in the cache.
  hasCache(plantOid) {
    if (!plantOid) {
      return this.cache.aggregation !== null;
    }

    if (this.cache.plants.has(plantOid)) {
      let cacheEntry = this.cache.plants.get(plantOid);

      if (cacheEntry) return true;
    }

    return false;
  }

  // Gets an item from cache.
  getCache(plantOid) {
    if (!plantOid) {
      return this.cache.aggregation;
    }

    if (this.cache.plants.has(plantOid)) {
      let cacheEntry = this.cache.plants.get(plantOid);

      if (cacheEntry) return cacheEntry;
    }

    return null;
  }

  // Starts an aggregation poll. Required for the dashboard.
  startAggregationPolling() {
    // if we're already aggregation polling, return false.
    if (this.isAggregationPolling) {
      this.log`already polling. ignoring`;
      return false;
    }

    // If we're plant polling, convert them all into leech polling.
    if (this.isFocusedPolling) {
      this.log`we're plant polling. stopping the interval and turning on leech poll`;
      this.stopFocusedPoll();

      this.isLeechPolling = true;
    }

    this.isAggregationPolling = true;

    if (!this.hasCache()) {
      this.log`no aggregation cache present`;
      return this.aggregationTick();
    }

    this.emit(AGGREGATION_EVENT, this.getCache());

    this.log`started aggregationPoll`;
    this.aggregationPollTimeout = setTimeout(() => {
      this.aggregationTick();
    }, this.aggregationInterval);
  }

  // The actual aggregation happens here.
  async aggregationTick() {
    this.log`aggregation tick!`;
    clearTimeout(this.aggregationPollTimeout);
    this.aggregationPollTimeout = null;

    let aggregation = await this.aggregate();

    this.cache.aggregation = aggregation;
    // TODO: plant cache.
    // TODO: error handling.

    // TODO: leechscrape errors.
    // handle leechscrapes.
    if (this.isLeechPolling) {
      for (let data of aggregation.plants) {
        this.emit(SINGLE_PLANT_EVENT, data);
        this.cache.plants.set(data.oid, data);
      }
    } else {
      for (let plant of aggregation.plants) {
        this.cache.plants.set(plant.oid, plant);
      }
    }

    this.emit(AGGREGATION_EVENT, aggregation);

    if (!this.isAggregationPolling) {
      this.log`aggregation timeout broken.`;
      this.aggregationPollTimeout = null;
      return false;
    }

    this.aggregationPollTimeout = setTimeout(() => {
      this.aggregationTick();
    }, this.aggregationInterval);
  }

  // Stops an aggregation loop.
  stopAggregation() {
    if (!this.isAggregationPolling) {
      this.log`tried to stop an aggregation that's not happening.`;
      return false;
    }
    this.isAggregationPolling = false;
    clearTimeout(this.aggregationPollTimeout);
    this.aggregationPollTimeout = null;
    this.isLeechPolling = false;

    if (this.focusedPool.size > 0) {
      this.log`converting leech poll into focused poll`;
      this.startFocusedPoll();
    }
  }

  // Focuses on a specific plant.
  // Emits the plant's specific information rather than an aggregated version.
  async focusPlant(oid) {
    if (this.focusedPool.has(oid)) {
      this.log`focusedPool already has ${oid}`;
      return false;
    }
    this.log`checking if ${oid} is legit`;
    try {
      let plant = await this.iface.getPlant(oid);
      this.focusedPool.add(oid);

      if (this.isAggregationPolling) {
        // Started leech polling.
        this.isLeechPolling = true;
      } else {
        if (!this.isFocusedPolling) this.startFocusedPoll(oid);
      }
    } catch (err) {
      this.log`failed to add ${oid} to focusedPool due to ${err}`;
      this.emit(SINGLE_PLANT_ERROR, { oid, err: err.message });
    }
  }

  // Stops polling plant data for a specific plant.
  unfocusPlant(oid) {
    // check if it's indeed in the poll.
    if (!this.focusedPool.has(oid)) {
      this.log`${oid} isnt in the focusedpool`;
      return false;
    }

    this.focusedPool.delete(oid);

    if (this.focusedPool.size === 0) {
      this.log`no more oids in the focusedPool. stopping focused poll and the leech poll`;
      if (this.isFocusedPolling) this.stopFocusedPoll();
      if (this.isLeechPolling) this.isLeechPolling = false;
    }
    return true;
  }

  // Starts polling plant data.
  startFocusedPoll(addedOid = null) {
    if (this.isAggregationPolling) {
      this.log`we're already aggregation polling. turning on leech scrape and returning`;

      this.isLeechPolling = true;
      return false;
    }

    if (this.focusedPool.size === 0) {
      this.log`nothing to focused poll. returning.`;
      return false;
    }

    this.isFocusedPolling = true;

    this.log`turned on focused polling`;

    if (addedOid) {
      if (!this.hasCache(addedOid)) {
        this.log`newly added oid ${addedOid} isnt in the cache`;
        return this.focusedPollTick(addedOid);
      } else {
        this.log`emitting an event from the cache`;
        this.emit(SINGLE_PLANT_EVENT, this.getCache(addedOid));
      }
    }

    // TODO: change plantFetchInterval to focusedPoll interval.
    this.focusedPollTimeout = setTimeout(() => {
      this.focusedPollTick();
    }, this.plantFetchInterval);
  }

  // Actual polling happens here.
  async focusedPollTick(addedOid = null) {
    this.log`focused poll tick`;

    clearTimeout(this.focusedPollTimeout);
    this.focusedPollTimeout = null;

    for (let oid of addedOid ? [addedOid] : this.focusedPool) {
      this.log`focused polling ${oid}`;
      try {
        let profile = await this.iface.getPlant(oid);
        let info = await this.getPlantInfo(oid);
        info.oid = oid;
        info.name = profile.name;

        this.emit(SINGLE_PLANT_EVENT, info);
        this.cache.plants.set(oid, info);
      } catch (err) {
        this.emit(SINGLE_PLANT_ERROR, { oid: oid, error: err.message });
      }
    }

    if (!this.isFocusedPolling) {
      this.log`focusedPoll was broken.`;
      return false;
    }

    this.focusedPollTimeout = setTimeout(() => {
      this.focusedPollTick();
    }, this.plantFetchInterval);
  }

  // Stops focusedpoll completely.
  stopFocusedPoll() {
    this.log`stopping focused poll.`;
    clearTimeout(this.focusedPollTimeout);
    this.focusedPollTimeout = null;
    this.isFocusedPolling = false;
  }

  // Gets the aggregated power readings for all the plants for a specific day.
  async getAggregatedPlantPowerReadings(timestamp) {
    timestamp = moment(timestamp || new Date());

    let plants = await this.iface.getPlants();

    let repo = new Repository({
      namespace: "Aggregated::Power",
      timestamp: timestamp.valueOf(),
      interval: "DAY",
      unit: "kW",
      type: "power"
    });

    for (let plant of plants) {
      await this.getPlantPowerReadings(plant.oid, timestamp, repo, {
        name: plant.name
      });
    }
    return repo;
  }

  async getSpreadsheetStatistics() {
    // [PEAK POWER] | TODAY YIELD | YESTERDAYYIELD| MONTH YEILD | TOTAL YIELD SINCE INSTALLATION | SPECIFIC YIELD MONTH  | SPECIFIC YIELD YEAR
    let { iface } = this;
    let plants = await iface.getPlants();

    let date = new Date();

    let total = {
      peakPower: { value: 0, unit: "kWp" },
      yield: {
        today: {
          value: 0,
          unit: "kWh"
        },
        yesterday: {
          value: 0,
          unit: "kWh"
        },
        month: {
          value: 0,
          unit: "kWh"
        },
        year: {
          value: 0,
          unit: "kWh"
        },
        total: {
          value: 0,
          unit: "kWh"
        }
      },
      specificYield: {
        month: {
          value: 0,
          unit: "kWh/kWp"
        },
        year: {
          value: 0,
          unit: "kWh/kWp"
        }
      }
    };

    let rows = [];

    for (let [idx, plant] of plants.entries()) {
      // Get plant profile
      let { oid } = plant;

      let profile = await iface.getPlant(oid);

      let monthOverview = await iface.monthOverview(oid, date);
      let yearOverview = await iface.yearOverview(oid, date);

      let todayOverview = monthOverview.readings[monthOverview.readings.length - 1];
      let yesterdayOverview = monthOverview.readings[monthOverview.readings.length - 2];

      let { peakPower } = profile;

      let row = {
        name: plant.name,
        oid: plant.oid,
        peakPower: profile.peakPower,
        yield: {
          today: {
            value: todayOverview.difference,
            unit: monthOverview.unit
          },
          yesterday: {
            value: yesterdayOverview.difference,
            unit: monthOverview.unit
          },
          month: {
            value: monthOverview.summary.difference,
            unit: monthOverview.summary.unit
          },
          year: {
            value: yearOverview.summary.difference,
            unit: yearOverview.summary.unit
          },
          total: {
            value: todayOverview.absolute,
            unit: monthOverview.unit
          }
        },
        specificYield: {
          month: {
            value: monthOverview.summary.difference / peakPower.value,
            unit: `${monthOverview.summary.unit}/${peakPower.unit}`
          },
          year: {
            value: yearOverview.summary.difference / peakPower.value,
            unit: `${yearOverview.summary.unit}/${peakPower.unit}`
          }
        }
      };
      rows.push(row);

      // Add everything.
      total.peakPower.value += peakPower.value;
      total.yield.today.value += row.yield.today.value;
      total.yield.yesterday.value += row.yield.yesterday.value;
      total.yield.month.value += row.yield.month.value;
      total.yield.year.value += row.yield.year.value;
      total.yield.total.value += row.yield.total.value;

      total.specificYield.month.value += row.specificYield.month.value;
      total.specificYield.year.value += row.specificYield.year.value;
    }

    return { total, rows };
  }

  async getAggregatedStatistics(statisticType, timestamp, interval) {
    if (["energy", "co2-avoided", "revenue"].indexOf(statisticType) === -1)
      throw new Error("unknown statistic " + statisticType);

    if (!interval) throw new Error("interval is missing");

    if (["month", "year"].indexOf(interval.toLowerCase()) === -1)
      throw new Error("invalid interval");
    timestamp = moment(timestamp || new Date());

    let converter = null;
    let convertedUnit = null;
    let namespace = "Energy";

    switch (statisticType) {
      case "co2-avoided":
        converter = CARBON_KILOGRAM_AVOIDED_PER_KWH;
        namespace = "Co2-avoided";
        convertedUnit = "kg";
        break;

      case "revenue":
        namespace = "Revenue";
        converter = USD_PER_KWH;
        convertedUnit = "$";
        break;
    }

    let repo = new Repository({
      namespace: "Aggregated::" + namespace,
      timestamp: timestamp.valueOf(),
      interval: interval.toUpperCase(),
      unit: "kWh",
      converter,
      convertedUnit,
      rate: converter,
      type: statisticType
    });

    let plants = await this.iface.getPlants();

    for (let plant of plants) {
      await this.getPlantStats(statisticType, plant.oid, timestamp, interval, repo, {
        name: plant.name
      });
    }
    return repo;
  }

  async getPlantStats(statisticType, oid, timestamp, interval, repo, baseMeta = null) {
    if (["energy", "co2-avoided", "revenue"].indexOf(statisticType) === -1)
      throw new Error("unknown statistic " + statisticType);

    if (!interval) throw new Error("interval is missing");

    if (["month", "year"].indexOf(interval.toLowerCase()) === -1)
      throw new Error("invalid interval");

    timestamp = moment(timestamp || new Date());

    let res = await this.iface[interval === "month" ? "monthOverview" : "yearOverview"](
      oid,
      timestamp.valueOf()
    );

    if (!repo) {
      let converter = null;
      let convertedUnit = null;
      let namespace = "Energy";

      switch (statisticType) {
        case "co2-avoided":
          converter = CARBON_KILOGRAM_AVOIDED_PER_KWH;
          namespace = "Co2-avoided";
          convertedUnit = "kg";
          break;

        case "revenue":
          namespace = "Revenue";
          converter = USD_PER_KWH;
          convertedUnit = "$";
          break;
      }
      repo = new Repository({
        namespace: `Plant::${namespace}`,
        singular: true,
        timestamp: timestamp.valueOf(),
        interval: interval.toUpperCase(),
        unit: res.unit,
        converter,
        convertedUnit,
        type: statisticType
      });
    }
    if (baseMeta === null || !{}.hasOwnProperty.call(baseMeta, "name")) {
      let profile = await this.iface.getPlant(oid);
      baseMeta = { name: profile.name };
    }
    repo.add({
      oid,
      unit: res.unit,
      dataPool: res.readings.map(reading => {
        return {
          timestamp: reading.timestamp,
          value: reading.difference
        };
      }),
      ...baseMeta
    });
    return repo;
  }

  async getPlantPowerReadings(oid, timestamp, repo, baseMeta = null) {
    timestamp = timestamp || new Date();

    timestamp = moment(timestamp);

    let res = await this.iface.dayOverview(oid, timestamp);

    repo =
      repo ||
      new Repository({
        singular: true,
        namespace: "Plant::Power",
        timestamp: timestamp.valueOf(),
        interval: "DAY",
        unit: res.unit
      });

    // { name, oid, dataPool, unit, ...extraneous }

    if (baseMeta === null || !{}.hasOwnProperty.call(baseMeta, "name")) {
      let profile = await this.iface.getPlant(oid);
      baseMeta = { name: profile.name };
    }

    repo.add({
      oid,
      discontinuity: res.discontinuity,
      unit: res.unit,
      dataPool: res.readings.map(reading => {
        return {
          timestamp: reading.timestamp,
          value: reading.mean
        };
      }),
      ...baseMeta
    });

    return repo;
  }

  async aggregate(date) {
    let realTime = typeof date !== "number";

    let now = realTime ? Date.now() : date;

    this.log`${realTime
      ? "This is a contemporary aggregation"
      : "This is not a contemporary aggregation"}`;
    let lastInterval = moment(now - now % (15 * 60 * 1000)).valueOf();

    let aggregated = {
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

    if (realTime) aggregated.power = { value: 0, unit: "kW" };

    let readings = [];

    let plants = this.iface.getPlants();
    for (let plant of await plants) {
      let reading;
      try {
        reading = await this.getPlantInfo(plant.oid, now, realTime);
      } catch (err) {
        if (realTime && this.isLeechPolling && this.focusedPool.has(plant.oid)) {
          this.emit(SINGLE_PLANT_ERROR, { oid: plant.oid, error: err.message });
        }
        this.log`failed to aggregate ${plant.oid} due to ${err}`;
        continue;
      }
      let { energy, power } = reading;

      if (realTime) aggregated.power.value += power.latest.value;

      aggregated.energy.total.value += energy.total.value;

      if (realTime)
        this.log`${plant.name} power.now = ${power.latest
          .value} kW (${power.discontinuity > 0 ? -power.discontinuity : "@@"})`;
      this.log`${plant.name} energy.today = ${energy.day.value} kWh`;
      this.log`${plant.name} energy.total = ${energy.total.value} kWh`;
      aggregated.energy.today.value += energy.day.value;

      reading.oid = plant.oid;
      reading.name = plant.name;

      readings.push(reading);
    }

    aggregated.co2Avoided = {
      total: normalize.co2Avoided({
        value: CARBON_KILOGRAM_AVOIDED_PER_KWH * aggregated.energy.total.value,
        unit: "kg"
      }),
      today: normalize.co2Avoided({
        value: CARBON_KILOGRAM_AVOIDED_PER_KWH * aggregated.energy.today.value,
        unit: "kg"
      })
    };

    aggregated.revenue = {
      total: normalize.revenue({
        value: USD_PER_KWH * aggregated.energy.total.value,
        unit: "$"
      }),
      today: normalize.revenue({
        value: USD_PER_KWH * aggregated.energy.today.value,
        unit: "$"
      })
    };

    if (realTime) aggregated.power = normalize.power(aggregated.power);

    aggregated.energy.total = normalize.energy(aggregated.energy.total);
    aggregated.energy.today = normalize.energy(aggregated.energy.today);

    return {
      timestamp: now,
      lastPowerInterval: lastInterval,
      aggregated: aggregated,
      plants: readings
    };
  }

  async getPlantInfo(oid, date, realTime) {
    date = date || Date.now();

    let energy = await this.getPlantEnergy(oid, date);

    let power = null;

    if (realTime) power = await this.getPlantPowerReading(oid, date);

    let co2Avoided = {
      total: normalize.co2Avoided({
        value: CARBON_KILOGRAM_AVOIDED_PER_KWH * energy.total.value,
        unit: "kg"
      }),
      today: normalize.co2Avoided({
        value: CARBON_KILOGRAM_AVOIDED_PER_KWH * energy.day.value,
        unit: "kg"
      })
    };

    let revenue = {
      total: normalize.revenue({
        value: USD_PER_KWH * energy.total.value,
        unit: "$"
      }),
      today: normalize.revenue({
        value: USD_PER_KWH * energy.day.value,
        unit: "$"
      })
    };
    return { timestamp: date, energy, power, co2Avoided, revenue };
  }

  async getPlantEnergy(oid, date) {
    date = date || Date.now();
    let lastDataExact = await this.iface.lastDataExact(oid, date);
    let unit = lastDataExact.unit;
    return {
      total: normalize.energy({
        value: (lastDataExact.day && lastDataExact.day.absolute) || 0,
        unit
      }),
      day: normalize.energy({
        value: (lastDataExact.day && lastDataExact.day.difference) || 0,
        unit
      }),
      hour: normalize.energy({
        value: (lastDataExact.hour && lastDataExact.hour.difference) || 0,
        unit
      })
    };
  }

  async getPlantPowerReading(oid, date) {
    date = date || new Date();
    let dayOverview = await this.iface.dayOverview(oid, date);

    if (dayOverview.readings.length === 0)
      return {
        latest: normalize.power({ value: 0, unit: dayOverview.unit }),
        timestamp: -1,
        discontinuity: 0
      };


    let latest = dayOverview.latest;

    return {
      latest: normalize.power({ value: latest.mean, unit: dayOverview.unit }),
      timestamp: latest.timestamp,
      discontinuity: dayOverview.discontinuity
    };
  }

  // Gets the information to render dashboard statistics for a particular day.
  // It cant be the same day.
  async getDayOverview(timestamp) {
    return await this.aggregate(timestamp);
  }
}

Mediator.AGGREGATION_EVENT = AGGREGATION_EVENT;
Mediator.AGGREGATION_ERROR = AGGREGATION_ERROR;
Mediator.SINGLE_PLANT_EVENT = SINGLE_PLANT_EVENT;
Mediator.SINGLE_PLANT_ERROR = SINGLE_PLANT_ERROR;

Mediator.AGGREGATION_INTERVAL = config.get("aggregationInterval");
Mediator.PLANT_FETCH_INTERVAL = config.get("plantFetchInterval");

module.exports = Mediator;
