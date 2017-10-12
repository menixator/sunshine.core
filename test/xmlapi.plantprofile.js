const Sunshine = require("../lib/sunshine");
const config = require("../lib/config").fromEnv();

let bot = new Sunshine({
  username: config.get("username"),
  password: config.get("password")
});

bot
  .login()
  .then(async res => {
    let plants = await bot.getPlants();
    console.log((await bot.getPlant(plants.list[0].oid)).toJSON());
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
