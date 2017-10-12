const Sunshine = require("../lib/sunshine");
const config = require('../lib/config').fromEnv();

let bot = new Sunshine({
  username: config.get('username'),
  password: config.get('password')
});

bot
  .login()
  .then(async () => {
    let powerReading = await bot.aggregate();
    console.log(JSON.stringify(powerReading, null, 2))
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
    return bot.logout();
  })
  .catch(err => {
    console.error(err);
  });
