
const fs = require("fs");

const TARGET = "/home/pi/.signalk/plugin-config-data/sk-tidal-dashboard.json";
const SOURCE = "sk-tidal-dashboard.json";

if (fs.existsSync(TARGET)) {
  console.log(TARGET, "exists");
} else {
  console.log(TARGET, "does not exist");
  fs.copyFile(SOURCE, TARGET, (err) => {
    if (err) throw err;
    console.log(SOURCE, "was copied to", TARGET);
  });
}
