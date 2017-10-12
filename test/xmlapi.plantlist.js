const Sunshine = require("../lib/sunshine");
const config = require('../lib/config').fromEnv();

let bot = new Sunshine({
  username: config.get('username'),
  password: config.get('password')
});

bot
  .login()
  .then(async (res) => {
    console.log("logged in!");
    let plants = await bot.getPlants()
    console.log(plants.toJSON())
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
