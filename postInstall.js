
const fs = require("fs");
const path = require("path");

const TARGET = path.resolve (__dirname + '/../../plugin-config-data/sk-tidal-dashboard.json');

const SOURCE = "sk-tidal-dashboard.json";

if (fs.existsSync(TARGET)) {
  console.log(TARGET, "exists, no action");
} else {
  console.log(TARGET, "does not exist");
  fs.copyFile(SOURCE, TARGET, (err) => {
    if (err) throw err;
    console.log("Template file", SOURCE, "was copied to", TARGET);
  });
}

