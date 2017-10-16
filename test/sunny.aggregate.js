const Interface = require("../lib/interface");
const config = require('../lib/config').fromEnv();

let iface = new Interface({
  username: config.get('username'),
  password: config.get('password')
});

iface
  .login()
  .then(async () => {
    let powerReading = await iface.aggregate();
    console.log(JSON.stringify(powerReading, null, 2))
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
