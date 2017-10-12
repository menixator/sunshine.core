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

    console.log(plants.toJSON());

    for (let plant of plants.list) {
      let overview = await bot.dayOverview(plant.oid);
      console.log(overview.toJSON());
    }

    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
