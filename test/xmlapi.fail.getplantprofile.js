const Interface = require("../lib/interface");
const config = require("../lib/config").fromEnv();

let iface = new Interface({
  username: config.get("username"),
  password: config.get("password")
});

iface
  .login()
  .then(async res => {
    let plants = await iface.getPlants();
    console.log((await iface.getPlant('c49e2aa2-a4ec-47a4-95d0-673cbab622b9')).toJSON());
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
