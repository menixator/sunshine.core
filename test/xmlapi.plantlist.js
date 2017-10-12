const Sunshine = require("../lib/sunshine");

let bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
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
