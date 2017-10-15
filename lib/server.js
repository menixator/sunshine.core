const express = require("express");
const http = require("http");
const APIInterface = require("./interface");
const path = require("path");
const io = require("socket.io");
const formatter = require("./formatter");
const Mediator = require("./mediator");
let config = require("./config");

let log = formatter("sunshine:http");
let app = express();
let server = http.createServer(app);
let drawer = io(server);

const AGGREGATION_ROOM = "aggregation";
const PLANT_ROOM_PREFIX = "plant:";
const AGGREGATION_ROOM_SUBSCRIBE_EVENT = "sunny::aggregation.subscribe";
const AGGREGATION_EVENT = "sunny::aggregation.tick";

const PLANT_EVENT = "sunny::plant.tick";

const AGGREGATION_ROOM_UNSUBSCRIBE_EVENT = "sunny::aggregation.unsubscribe";
const PLANT_SUBSCRIBE_EVENT = "sunny::plant.subscribe";
const PLANT_UNSUBSCRIBE_EVENT = "sunny::plant.unsubscribe";

var iface = new APIInterface({
  username: config.get("username"),
  password: config.get("password")
});

let mediator = new Mediator(iface);

// Gets the population of a room.
function getRoomPopulation(room) {
  if (
    !Object.prototype.hasOwnProperty.call(drawer.sockets.adapter.rooms, room)
  ) {
    return 0;
  }

  return drawer.sockets.adapter.rooms[room].length;
}

drawer.of("/").on("connection", sock => {
  log`new socket(${sock.id}) connected to ${"/"}`;
  mediator.unrigCache();

  sock.on(AGGREGATION_ROOM_SUBSCRIBE_EVENT, () => {
    log`socket(${sock.id}) wants to join the aggregation room`;
    sock.join(AGGREGATION_ROOM, function(err) {
      if (err)
        return log`failed to add ${sock.id} to aggregation room due to err: ${err}`;

      log`socket(${sock.id}) has joined the aggregation room. emitting poll status now.`;
      sock.emit("sunny::aggregation.status", !!mediator.isAggregationPolling);

      mediator.startAggregationPolling();
    });
  });

  sock.on(AGGREGATION_ROOM_UNSUBSCRIBE_EVENT, () => {
    log`socket(${sock.id}) wants to leave the aggregation room`;

    sock.leave(AGGREGATION_ROOM, function(err) {
      if (err)
        return log`failed to remove ${sock.id} from aggregation room due to err: ${err}`;

      // Adding a timeout to account for refreshes.
      if (getRoomPopulation(AGGREGATION_ROOM) === 0) {
        log`stopping aggregation`;
        mediator.stopAggregation();
      }
    });
  });

  sock.on(PLANT_SUBSCRIBE_EVENT, ({ oid }) => {
    let roomId = PLANT_ROOM_PREFIX + oid;
    log`socket(${sock.id}) wants to start subscribing to plant room: ${roomId}`;
    sock.join(roomId, function(err) {
      if (err)
        return log`failed to add ${sock.id} to from plant room(${roomId}) room due to err: ${err}`;

      log`adding plant to mediator`;
      // TODO: error handling. Plant with `oid` might not exist.
      mediator.focusPlant(oid);

      if (
        mediator.cache.plants.has(oid) &&
        mediator.cache.plants.get(oid) !== null
      ) {
        drawer
          .in(PLANT_ROOM_PREFIX + oid)
          .emit("sunny::plant.tick", mediator.cache.plants.get(oid));
      }
    });
  });

  sock.on(PLANT_UNSUBSCRIBE_EVENT, ({ oid }) => {
    let roomId = PLANT_ROOM_PREFIX + oid;
    log`socket(${sock.id}) wants to stop subscribing to plant room: ${roomId}`;

    sock.leave(roomId, function(err) {
      if (err)
        return log`failed to remove ${sock.id} from from plant room(${roomId}) room due to err: ${err}`;
      if (getRoomPopulation(roomId) === 0) {
        mediator.unfocusPlant(roomId.substr(PLANT_ROOM_PREFIX.length));
      }
    });
  });

  // Have to utilize the pre-disconnection event because
  // we need to know what plants were removed.
  sock.on("disconnecting", () => {
    for (var roomId in sock.rooms) {
      if (roomId === sock.id) continue;
      if (roomId === AGGREGATION_ROOM) {
        // Adding a timeout to account for refreshes.
        setTimeout(() => {
          if (getRoomPopulation(AGGREGATION_ROOM) === 0) {
            log`stopping aggregation`;
            mediator.stopAggregation();
          }
        }, 5000);
        continue;
      }

      if (roomId.indexOf(PLANT_ROOM_PREFIX) === 0) {
        // If this is the last socket in the room.
        if (getRoomPopulation(roomId) === 1) {
          log`socket(${sock.id}) is unsubscribing from ${roomId.substr(
            PLANT_ROOM_PREFIX.length
          )}`;
          mediator.unfocusPlant(roomId.substr(PLANT_ROOM_PREFIX.length));
        }
      }
    }
  });

  sock.on("disconnect", function() {
    log`${drawer.engine.clientsCount} client(s) are still connected`;
    if (drawer.engine.clientsCount === 0) {
      mediator.rigCache();
    }
  });
});

mediator.on(Mediator.AGGREGATION_EVENT, aggregation => {
  log`iface aggregation event recieved`;
  drawer
    .in(AGGREGATION_ROOM)
    .emit(AGGREGATION_EVENT, { status: "ok", payload: aggregation });
});

mediator.on(Mediator.SINGLE_PLANT_EVENT, function(plantData) {
  log`emitting plantData for ${plantData.oid}`;
  drawer.in(PLANT_ROOM_PREFIX + plantData.oid).emit(PLANT_EVENT, plantData);
});

module.exports = {
  app,
  http: server,
  mediator,
  iface,
  drawer
};
