const Interface = require("../lib/interface");
const config = require('../lib/config').fromEnv();

let iface = new Interface({
  username: config.get('username'),
  password: config.get('password')
});

iface
  .login()
  .then(async (res) => {
    console.log("logged in!");
    let plants = await iface.getPlants()
    console.log(plants.toJSON())
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
