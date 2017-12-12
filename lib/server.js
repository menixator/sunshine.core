const express = require("express");
const http = require("http");
const APIInterface = require("./interface");
const io = require("socket.io");
const formatter = require("./formatter");
const Mediator = require("./mediator");
let config = require("./config");
const fs = require("fs");
const path = require("path");

let log = formatter("sunshine:http");
let app = express();
let server = http.createServer(app);
let drawer = io(server);

const AGGREGATION_ROOM = "aggregation";
const PLANT_ROOM_PREFIX = "plant:";
const AGGREGATION_ROOM_SUBSCRIBE_EVENT = "sunny::aggregation.subscribe";
const AGGREGATION_EVENT = "sunny::aggregation.tick";
const AGGREGATION_ERROR = "sunny:aggregation.error";

const PLANT_EVENT = "sunny::plant.tick";
const PLANT_ERROR = "sunny::plant.error";

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
  if (!Object.prototype.hasOwnProperty.call(drawer.sockets.adapter.rooms, room)) {
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

      if (!mediator.isAggregationPolling) mediator.startAggregationPolling();
      if (mediator.hasCache())
        sock.emit(AGGREGATION_EVENT, {
          status: "ok",
          payload: mediator.getCache()
        });
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

  sock.on(PLANT_SUBSCRIBE_EVENT, async ({ oid }) => {
    let roomId = PLANT_ROOM_PREFIX + oid;
    log`socket(${sock.id}) wants to start subscribing to plant room: ${roomId}`;
    sock.join(roomId, function(err) {
      if (err)
        return log`failed to add ${sock.id} to from plant room(${roomId}) room due to err: ${err}`;

      log`adding plant to mediator`;
      // TODO: error handling. Plant with `oid` might not exist.
      mediator.focusPlant(oid);

      if (mediator.cache.plants.has(oid) && mediator.cache.plants.get(oid) !== null) {
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

mediator.on(Mediator.SINGLE_PLANT_ERROR, function(plantData) {
  log`emitting error for ${plantData.oid}`;
  drawer.in(PLANT_ROOM_PREFIX + plantData.oid).emit(PLANT_ERROR, plantData);
});

app.use(function(req, res, next) {
  log`${req.method} ${req.url}`;
  next();
});

if (config.isDev()) {
  app.use("/api", function(req, res, next) {
    res.set("Access-Control-Allow-Origin", "*");
    next();
  });
}

app.get("/api/plants", async (req, res, next) => {
  return wrapResponse(req, res, iface.getPlants(), payload =>
    payload.list.map(plant => {
      return { name: plant.name, oid: plant.oid };
    })
  );
});

app.get("/api/stats/power/aggregated", async (req, res, next) => {
  if (!req.query.timestamp) {
    req.query.timestamp = Date.now().toString();
  }

  let timestamp = parseInt(req.query.timestamp, 10);

  if (isNaN(timestamp)) return next(new Error("timestamp is not a number"));

  return wrapResponse(req, res, mediator.getAggregatedPlantPowerReadings(timestamp));
});

app.get(
  /^[/]api[/]stats[/]power[/]([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/,
  async (req, res, next) => {
    let oid = req.params[0];
    if (!req.query.timestamp) {
      req.query.timestamp = Date.now().toString();
    }

    let timestamp = parseInt(req.query.timestamp, 10);

    if (isNaN(timestamp)) return next(new Error("timestamp is not a number"));

    return wrapResponse(req, res, mediator.getPlantPowerReadings(oid, timestamp));
  }
);

app.get(
  /^[/]api[/]stats[/](energy|co2-avoided|revenue)[/]aggregated$/,
  async (req, res, next) => {
    if (!req.query.timestamp) {
      req.query.timestamp = Date.now().toString();
    }

    if (!req.query.interval) {
      return next(new Error("interval is missing"));
    }

    let timestamp = parseInt(req.query.timestamp, 10);

    if (isNaN(timestamp)) return next(new Error("timestamp is not a number"));

    let statisticType = req.params[0];

    return wrapResponse(
      req,
      res,
      mediator.getAggregatedStatistics(statisticType, timestamp, req.query.interval)
    );
  }
);

app.get(
  /^[/]api[/]stats[/](energy|co2-avoided|revenue)[/]([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/,
  async (req, res, next) => {
    if (!req.query.timestamp) {
      req.query.timestamp = Date.now().toString();
    }

    if (!req.query.interval) {
      return next(new Error("interval is missing"));
    }

    let timestamp = parseInt(req.query.timestamp, 10);

    if (isNaN(timestamp)) return next(new Error("timestamp is not a number"));

    let statisticType = req.params[0];
    let oid = req.params[1];

    return wrapResponse(
      req,
      res,
      mediator.getPlantStats(statisticType, oid, timestamp, req.query.interval)
    );
  }
);

app.get(
  /^[/]api[/]plants[/]([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/,
  async (req, res, next) => {
    return wrapResponse(req, res, mediator.iface.getPlant(req.params[0]));
  }
);

app.get("/api/statistics", async (req, res, next) => {
  return wrapResponse(req, res, mediator.getSpreadsheetStatistics());
});

app.get("/api/dayOverview", async (req, res, next) => {
  let timestamp = parseInt(req.query.timestamp, 10);

  if (isNaN(timestamp)) return next(new Error("timestamp is not a number"));

  return wrapResponse(req, res, mediator.getDayOverview(timestamp));
});

async function wrapResponse(req, res, promise, cb) {
  try {
    let payload = await promise;
    return res.json({
      status: "ok",
      errors: [],
      payload: cb ? cb(payload) : payload
    });
  } catch (err) {
    console.error(err)
    return res.json({ status: "fail", errors: [err.message], payload: null });
  }
}

app.use("/", express.static(path.join(__dirname, "../build")));

module.exports = {
  app,
  http: server,
  mediator,
  iface,
  drawer
};
