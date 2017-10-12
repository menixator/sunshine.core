const Sunshine = require("../lib/sunshine");

let bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
});

bot
  .login()
  .then(async () => {
    let plants = await bot.getPlants();
    let allData = await bot.allData(plants.list[0].oid, "month");
    console.log(allData.toJSON())
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
