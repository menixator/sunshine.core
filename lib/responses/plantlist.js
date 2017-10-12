const Base = require("./base");

class PlantList extends Base {
  toJSON() {
    return {
      name: this.name,
      plants: this.list
    };
  }

  parse() {
    this.name = this.attr("name", this.contextNode);
    let length = parseInt(this.attr("count", this.contextNode), 10);
    this.log`${length} plants recieved`;
    let plantNodes = this.findAll("plant", this.contextNode);

    let plants = [];

    for (let node of plantNodes) {
      let plant = {
        name: this.attr("name", node),
        oid: this.attr("oid", node),
        identifier: this.attr("identifier", node),
        state: this.attr("state", node)
      };
      this.log`plant(${plant.name}) with oid ${plant.oid} retrieved`;
      plants.push(plant);
    }

    this.list = plants;
  }

  get length() {
    return this.list.length;
  }

  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }
}

module.exports = PlantList;
