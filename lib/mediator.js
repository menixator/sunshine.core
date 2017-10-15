const { EventEmitter } = require("events");

const config = require('./config');

const AGGREGATION_EVENT = "aggregation::tick";
const AGGREGATION_ERROR = "aggregation::error";
const SINGLE_PLANT_EVENT = "plant::tick";
const SINGLE_PLANT_ERROR = "plant::error";

class Mediator extends EventEmitter {
  constructor(iface) {
    this.iface = iface;


    this.aggregationPollTimeout = null;
    this.plantPollTimeout = null;

    this.plantPolling = false;
    this.pollingPlants = new Set();
    this.aggregationPolling = false;

    this.leechPolling = false;

    this.cache = {
      aggregation: null,
      plants: new Map()
    };
  }

  

  startAggregationPolling() {}

  startPlantInformationPolling() {}
}


Mediator.AGGREGATION_INTERVAL = config.get('aggregationInterval');
Mediator.PLANT_FETCH_INTERVAL = config.get('plantFetchInterval');