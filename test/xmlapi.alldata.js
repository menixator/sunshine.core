const Interface = require("../lib/interface");
const config = require("../lib/config").fromEnv();

let iface = new Interface({
  username: config.get("username"),
  password: config.get("password")
});

let KOC = "c49e2aa2-a4ec-47a4-95d0-673cbab622b0";

iface
  .login()
  .then(async () => {
    let allData = await iface.allData(KOC, "month");
    console.log(allData.toJSON());
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
    return iface.logout();
  })
  .catch(err => {
    console.error(err);
  });
