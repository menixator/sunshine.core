const Sunshine = require("../lib/sunshine");

let bot = new Sunshine({
  username: "ahmed.miljau@gmail.com",
  password: "cipeqeza"
});

bot
  .login()
  .then(async (res) => {
    console.log(res.toJSON())
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
