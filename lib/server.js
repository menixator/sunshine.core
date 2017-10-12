const express = require("express");
const http = require("http");
const Sunshine = require("./sunshine");
const path = require("path");
const io = require("socket.io");
const debug = require("debug");

let log = debug("sunshine:http");
let app = express();
let server = http.createServer(app);
let socks = io(server);

// const AGGREGATION_ROOM = 'aggregation';
// const PLANT_ROOM_PREFIX='plant:';
// const AGGREGATION_ROOM_SUBSCRIBE='sunny::aggregation.subscribe';

var bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
});

// Gets the population of a room.
function getRoomPopulation(room) {
  if (
    !Object.prototype.hasOwnProperty.call(socks.sockets.adapter.rooms, room)
  ) {
    return 0;
  }

  return socks.sockets.adapter.rooms[room].length;
}

let cacheClearTimeout = null;

socks.of("/").on("connection", sock => {
  if (cacheClearTimeout) clearTimeout(cacheClearTimeout);

  sock.on("sunny::aggregation.subscribe", () => {
    log(`socket(${sock.id}) wants to join the aggregation room`);
    sock.join("aggregation", function(err) {
      if (err)
        return log(
          `failed to add ${sock.id} to aggregation room due to err: ${err.message}`
        );

      log(
        `socket(${sock.id}) has joined the aggregation room. emitting poll status now.`
      );
      sock.emit("sunny::aggregation.status", !!bot.polling);

      if (!bot.polling) {
        log(`making the bot start the aggregation now`);
        bot.startAggregation(20000);
      } else {
        log(`bot was already aggregating. good bot.`);
      }

      var initialEvent = bot.toAggregationEvent();

      if (initialEvent) {
        log("sending initial event");
        sock.emit("sunny::aggregation.tick", initialEvent);
      }
    });
  });

  sock.on("sunny::aggregation.unsubscribe", () => {
    log(`socket(${sock.id}) wants to leave the aggregation room`);

    sock.leave("aggregation", function(err) {
      if (err)
        return log(
          `failed to remove ${sock.id} from aggregation room due to err: ${err.message}`
        );

      // Adding a timeout to account for refreshes.
      if (getRoomPopulation("aggregation") === 0) {
        log(`stopping aggregation`);
        bot.stopAggregation();
      }
    });
  });

  sock.on("sunny::plant.subscribe", ({ oid }) => {
    let roomId = "plant:" + oid;
    log(
      `socket(${sock.id}) wants to start subscribing to plant room: ${roomId}`
    );
    sock.join(roomId, function(err) {
      if (err)
        return log(
          `failed to add ${sock.id} to from plant room(${roomId}) room due to err: ${err.message}`
        );

      log(`adding plant to bot`);
      bot.addSoloPlant(oid);

      if (bot.cache.plants.has(oid) && bot.cache.plants.get(oid) !== null) {
        socks
          .in("plant:" + oid)
          .emit("sunny::plant.tick", bot.cache.plants.get(oid));
      }
    });
  });

  sock.on("sunny::plant.unsubscribe", ({ oid }) => {
    let roomId = "plant:" + oid;
    log(
      `socket(${sock.id}) wants to stop subscribing to plant room: ${roomId}`
    );

    sock.leave(roomId, function(err) {
      if (err)
        return log(
          `failed to remove ${sock.id} from from plant room(${roomId}) room due to err: ${err.message}`
        );
      if (getRoomPopulation(roomId) === 0) {
        bot.removeSoloPlant(roomId.substr("plant:".length));
      }
    });
  });

  // Have to utilize the pre-disconnection event because
  // we need to know what plants were removed.
  sock.on("disconnecting", () => {
    for (var roomId in sock.rooms) {
      if (roomId === sock.id) continue;
      if (roomId === "aggregation") {
        // Adding a timeout to account for refreshes.
        setTimeout(() => {
          if (getRoomPopulation("aggregation") === 0) {
            log(`stopping aggregation`);
            bot.stopAggregation();
          }
        }, 5000);
        continue;
      }

      if (roomId.indexOf("plant:") === 0) {
        // If this is the last socket in the room.
        if (getRoomPopulation(roomId) === 1) {
          log(
            `socket(${sock.id}) is unsubscribing from ${roomId.substr(
              "plant:".length
            )}`
          );
          bot.removeSoloPlant(roomId.substr("plant:".length));
        }
      }
    }
  });

  sock.on("disconnect", function() {
    console.log(socks.engine.clientsCount , 'client(s) are connected')
    if (socks.engine.clientsCount === 0) {
      if (cacheClearTimeout) clearTimeout(cacheClearTimeout);
      cacheClearTimeout = setTimeout(() => {
        if (socks.engine.clientsCount === 0) {
          log('clearing bot cache');
          this.cache = {
            aggregation: null,
            plants: new Map()
          };
        }
      }, 10000);
    }
  });
});

bot.on("aggregation", function(value) {
  log("bot aggregation event recieved");
  socks.in("aggregation").emit("sunny::aggregation.tick", value);
});

bot.on("solo_scrape", function(value) {
  log(`emitting solo_scrape data for ${value.oid}`);
  socks.in("plant:" + value.oid).emit("sunny::plant.tick", value);
});

// app.set("view engine", "pug");
// app.use("/public", express.static(path.join(__dirname, "../public")));

// app.get("/", function(req, res) {
//   res.render("index");
// });

app.bot = bot;

app.server = server;

module.exports = app;
