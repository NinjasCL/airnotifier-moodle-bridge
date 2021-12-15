// Comment out unused adapters
const enabled = ["firebase", "pusher"];

const adapters = [];
const all = [];

enabled.forEach(name => {
  const adapter = require(`./${name}`);
  adapters.push(adapter.adapter);
  all.push(adapter);
});

module.exports = {adapters, all, enabled};
