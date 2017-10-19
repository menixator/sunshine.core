const _ = require("lodash");

class Repository {
  constructor({ namespace, ...meta }) {
    if (!namespace) throw new Error("namespace");
    this.namespace = namespace;
    this.meta = meta;
    this.plants = new Map();
    this.dataPool = new Map();
  }

  plantLength() {
    return this.plants.size;
  }

  readingLength() {
    return this.dataPool.size;
  }

  get unit() {
    return this.meta.unit;
  }

  add({ oid, dataPool, unit, ...extraneous }) {
    if (this.plants.has(oid)) {
      throw new Error("duplicate addition");
    }
    if (this.unit !== unit) throw new Error("unit mismatch");
    this.plants.set(oid, extraneous);

    for (let reading of dataPool) {
      let timestamp = reading.timestamp;
      if (!this.dataPool.has(timestamp)) {
        this.dataPool.set(timestamp, []);
      }

      this.dataPool.get(timestamp).push({ oid, value: reading.value });
    }
    return this;
  }

  toJSON() {
    if (this.plantLength === 0) throw new Error("no plants were added");

    return {
      namespace: this.namespace,
      meta: { ...this.meta },
      plants: Array.from(this.plants.entries()),
      dataPool: Array.from(this.dataPool.entries())
    };
  }
}

module.exports = Repository;
