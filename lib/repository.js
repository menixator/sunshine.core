const _ = require("lodash");

class Repository {
  constructor({ singular, namespace, converter, convertedUnit, ...meta }) {
    if (!namespace) throw new Error("namespace");
    this.namespace = namespace;
    this.meta = meta;
    this.singular = !!singular;
    this.plants = new Map();
    this.dataPool = new Map();
    this.converter = converter || null;
    if (typeof converter === "number") this.converter = val => val * converter;

    this.convertedUnit = convertedUnit || null;
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
      let valueToPush = this.converter
        ? this.converter(reading.value)
        : reading.value;

      if (this.singular) {
        if (this.dataPool.has(timestamp))
          throw new Error("clashing values are present");
        this.dataPool.set(timestamp, valueToPush);
        continue;
      }

      if (!this.dataPool.has(timestamp)) {
        this.dataPool.set(timestamp, []);
      }

      this.dataPool.get(timestamp).push({ oid, value: valueToPush });
    }
    return this;
  }

  toJSON() {
    if (this.plantLength === 0) throw new Error("no plants were added");

    let json = {
      namespace: this.namespace,
      meta: {
        singular: this.singular,
        ...this.meta,
        unit: this.convertedUnit ? this.convertedUnit : this.meta.unit
      },
      dataPool: Array.from(this.dataPool.entries()).sort((a,b)=>a[0]-b[0])
    };

    if (this.singular) {
      let onlyOid = this.plants.keys().next().value;
      json.plant = this.plants.get(onlyOid);
      json.plant.oid = onlyOid;
    } else {
      json.plants = Array.from(this.plants.entries());
    }
    return json;
  }
}

module.exports = Repository;
