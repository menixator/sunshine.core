const Interface = require("../lib/interface");
const config = require('../lib/config').fromEnv();

let iface = new Interface({
  username: config.get('username'),
  password: config.get('password')
});

iface
  .login()
  .then(async () => {
    console.log("logged in!");
    let plants = await iface.getPlants();
    let monthOverview = await iface.monthOverview(plants.list[0].oid);

    console.log(monthOverview.toJSON())

    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });