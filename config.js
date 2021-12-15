// Secret config User and Key to send notifications
const config = {
  // Configure these headers the same as in AirNotifier Moodle Settings
  headers: {
    // X-An-App-Name header set in the Moodle Plugin Settings.
    name: "X-An-App-Name",
    // X-An-App-Key header set in the Moodle Plugin Settings.
    // Is recommended to generate a secure random key like an uuidv4
    // execute: npm run uuid
    // to get a random unique id.
    key: "X-An-App-Key",
  },

  port: 3000, // port to listen. default is 3000 for node servers
  listen: "0.0.0.0", // restrict access to this ip range. 0.0.0.0 means all ips allowed
  whitelist: [], // leave empty to allow all ips.
};

// Server Config
// See https://github.com/fastify/fastify/tree/master/docs
// for more config options
const server = require("fastify")({
  logger: {
    level: "debug",
  },
  // IgnoreTrailingSlash is needed to support calls from the moodle airnotifier plugin
  ignoreTrailingSlash: true,
});

// moodle airnotifier plugin send requests as application/x-www-form-urlencoded
server.register(require("fastify-formbody"));

module.exports = {server, config};
