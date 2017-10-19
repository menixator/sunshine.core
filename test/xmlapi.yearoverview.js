const Interface = require("../lib/interface");
const config = require('../lib/config').fromEnv();

let iface = new Interface({
  username: config.get('username'),
  password: config.get('password')
});


iface
  .login()
  .then(async () => {
    let plants = await iface.getPlants();
    let yearOverview = await iface.yearOverview(plants.list[2].oid);
    console.log(yearOverview.toJSON())
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });