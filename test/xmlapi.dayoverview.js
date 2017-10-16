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

    console.log(plants.toJSON());

    for (let plant of plants.list) {
      let overview = await iface.dayOverview(plant.oid);
      console.log(overview.toJSON());
    }

    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
