const Sunshine = require("../lib/sunshine");
const config = require('../lib/config').fromEnv();

let bot = new Sunshine({
  username: config.get('username'),
  password: config.get('password')
});

bot
  .login()
  .then(async () => {
    console.log("logged in!");
    let plants = await bot.getPlants();
    let monthOverview = await bot.monthOverview(plants.list[0].oid);

    console.log(monthOverview.toJSON())

    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });