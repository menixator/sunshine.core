const Sunshine = require("../lib/sunshine");

let bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
});

bot
  .login()
  .then(async () => {
    console.log("logged in!");
    let plants = await bot.getPlants();
    let plant = await bot.monthOverview(plants.list[0].oid);

    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });