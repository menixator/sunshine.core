const Sunshine = require("../lib/sunshine");
const config = require('../lib/config').fromEnv();

let bot = new Sunshine({
  username: config.get('username'),
  password: config.get('password')
});


bot
  .login()
  .then(async () => {
    let plants = await bot.getPlants();
    let yearOverview = await bot.yearOverview(plants.list[0].oid);
    console.log(yearOverview)
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });