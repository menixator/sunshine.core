const { EventEmitter } = require("events");

const config = require("./config");
const formatter = require("./formatter");

let log = formatter("sunshine:mediator");

const AGGREGATION_EVENT = "aggregation::tick";
const AGGREGATION_ERROR = "aggregation::error";
const SINGLE_PLANT_EVENT = "plant::tick";
const SINGLE_PLANT_ERROR = "plant::error";

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

    this.cache = {
      aggregation: null,
      plants: new Map()
    };

    this.cacheClearTimeout = null;
    //  TODO: add to config
    this.cacheClearInterval = 5 * 60 * 1000;

    this.aggregationInterval = Mediator.AGGREGATION_INTERVAL * 1000;
    this.plantFetchInterval = Mediator.PLANT_FETCH_INTERVAL * 1000;
    log`mediator created. will fetch plants every: ${this.plantFetchInterval /
      1000} seconds. will aggregate every: ${this.aggregationInterval /
      1000} seconds`;
  }

  destroy() {
    this.unrigCache();
    this.clearCache();
    this.stopAggregation();
    this.stopFocusedPoll();
  }

  clearCache() {
    this.cache = {
      aggregation: null,
      plants: new Map()
    };
  }

  rigCache() {
    this.unrigCache();

    this.cacheClearTimeout = setTimeout(() => {
      this.clearCache();
    }, this.cacheClearInterval);
  }

  unrigCache() {
    clearTimeout(this.cacheClearTimeout);
    this.cacheClearTimeout = null;
  }

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

  startAggregationPolling() {
    // if we're already aggregation polling, return false.
    if (this.isAggregationPolling) {
      log`already polling. ignoring`;
      return false;
    }

    // If we're plant polling, convert them all into leech polling.
    if (this.isFocusedPolling) {
      log`we're plant polling. stopping the interval and turning on leech poll`;
      this.stopFocusedPoll();

      this.isLeechPolling = true;
    }

    this.isAggregationPolling = true;

    if (!this.hasCache()) {
      return this.aggregationTick();
    }

    log`started aggregationPoll`;
    this.aggregationPollTimeout = setTimeout(() => {
      this.aggregationTick();
    }, this.aggregationInterval);
  }

  async aggregationTick() {
    log`aggregation tick!`;
    clearTimeout(this.aggregationPollTimeout);
    this.aggregationPollTimeout = null;

    let aggregation = await this.iface.aggregate();

    this.cache.aggregation = aggregation;
    // TODO: plant cache.
    // TODO: error handling.

    // TODO: leechscrape errors.
    // handle leechscrapes.
    if (this.isLeechPolling) {

      for (let data of aggregation.plants){
        this.emit(SINGLE_PLANT_EVENT, data);
      }
    }

    this.emit(AGGREGATION_EVENT, aggregation);

    if (!this.isAggregationPolling) {
      log`aggregation timeout broken.`;
      this.aggregationPollTimeout = null;
      return false;
    }

    this.aggregationPollTimeout = setTimeout(() => {
      this.aggregationTick();
    }, this.aggregationInterval);
  }

  stopAggregation() {
    if (!this.isAggregationPolling) {
      log`tried to stop an aggregation that's not happening.`;
      return false;
    }
    this.isAggregationPolling = false;
    clearTimeout(this.aggregationPollTimeout);
    this.aggregationPollTimeout = null;
    this.isLeechPolling = false;

    if (this.focusedPool.size > 0) {
      log`converting leech poll into focused poll`;
      this.startFocusedPoll();
    }
  }

  async focusPlant(oid) {
    if (this.focusedPool.has(oid)) {
      log`focusedPool already has ${oid}`;
      return false;
    }

    try {
      let plant = this.iface.getPlant(oid);
      this.focusedPool.add(oid);

      if (this.isAggregationPolling) {
        // Started leech polling.
        this.isLeechPolling = true;
      } else {
        if (!this.isFocusedPolling) this.startFocusedPoll(oid);
      }
    } catch (err) {
      log`failed to add ${oid} to focusedPool due to ${err}`;
      throw err;
    }
  }

  unfocusPlant(oid) {
    // check if it's indeed in the poll.
    if (!this.focusedPool.has(oid)) {
      log`${oid} isnt in the focusedpool`;
    }

    this.focusedPool.delete(oid);

    if (this.focusedPool.size === 0) {
      log`no more oids in the focusedPool. stopping focused poll and the leech poll`;
      if (this.isFocusedPolling) this.stopFocusedPoll();
      if (this.isLeechPolling) this.isLeechPolling = false;
    }
    return true;
  }

  startFocusedPoll(addedOid = null) {
    if (this.isAggregationPolling) {
      log`we're already aggregation polling. turning on leech scrape and returning`;

      this.isLeechPolling = true;
      return false;
    }

    if (this.focusedPool.size === 0) {
      log`nothing to focused poll. returning.`;
      return false;
    }

    this.isFocusedPolling = true;

    log`turned on focused polling`;

    if (addedOid && !this.hasCache(addedOid)) {
      return this.focusedPollTick(addedOid);
    }

    // TODO: change plantFetchInterval to focusedPoll interval.
    this.focusedPollTimeout = setTimeout(() => {
      this.focusedPollTick();
    }, this.plantFetchInterval);
  }

  async focusedPollTick(addedOid = null) {
    log`focused poll tick`;

    clearTimeout(this.focusedPollTimeout);
    this.focusedPollTimeout = null;

    // FOCUSED POLLING GOES ON HERE.

    if (!this.isFocusedPolling) {
      log`focusedPoll was broken.`;
      return false;
    }

    this.focusedPollTimeout = setTimeout(() => {
      this.focusedPollTick();
    }, this.plantFetchInterval);
  }

  stopFocusedPoll() {
    log`stopping focused poll.`;
    clearInterval(this.focusedPollTimeout);
    this.focusedPollTimeout = null;
  }
}

Mediator.AGGREGATION_EVENT = AGGREGATION_EVENT;
Mediator.AGGREGATION_ERROR = AGGREGATION_ERROR;
Mediator.SINGLE_PLANT_EVENT = SINGLE_PLANT_EVENT;
Mediator.SINGLE_PLANT_ERROR = SINGLE_PLANT_ERROR;

Mediator.AGGREGATION_INTERVAL = config.get("aggregationInterval");
Mediator.PLANT_FETCH_INTERVAL = config.get("plantFetchInterval");

module.exports = Mediator;
