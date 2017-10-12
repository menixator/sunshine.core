const Sunshine = require("../lib/sunshine");

let bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
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
