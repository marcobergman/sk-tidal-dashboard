
const fs = require("fs");

const TARGET = "../../plugin-config-data/sk-waterlevels.json";
const SOURCE = "./sk-waterlevels.json";

if (fs.existsSync(TARGET)) {
  console.log(TARGET, "exists");
} else {
  console.log(TARGET, "does not exist");
  fs.copyFile(SOURCE, TARGET, (err) => {
    if (err) throw err;
    console.log(SOURCE, "was copied to destination.txt');
  });
}
