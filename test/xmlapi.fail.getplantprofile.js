const Sunshine = require("../lib/interface");
const config = require("../lib/config").fromEnv();

let bot = new Sunshine({
  username: config.get("username"),
  password: config.get("password")
});

bot
  .login()
  .then(async res => {
    let plants = await bot.getPlants();
    console.log((await bot.getPlant('c49e2aa2-a4ec-47a4-95d0-673cbab622b9')).toJSON());
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
