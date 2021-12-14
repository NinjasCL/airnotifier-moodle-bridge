const firebase = require("./firebase");
const pusher = require("./pusher");

const all = [firebase, pusher];

// Export the enabled adapters
const adapters = [
  firebase.adapter, 
  // pusher.adapter
];

module.exports = {adapters, all};
