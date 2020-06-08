/*
MIT License
-----------

Copyright (c) 2020 Camilo Castro (https://ninjas.cl)
Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

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
  listen: "0.0.0.0", // restrict access to this ip range
  whitelist: [], // leave empty to allow all ips.

  // Obtain your credentials json and database address at firebase's console
  firebase: {
    // is recommended that this credential json key have a random name and is not version controlled
    credential: "./service-account-key.json",
    database: "https://<app name>.firebaseio.com",
  },
};

// Server Config
// See https://github.com/fastify/fastify/tree/master/docs
// for more config options
const server = require("fastify")({
  logger: true,
  // IgnoreTrailingSlash is needed to support calls from the moodle airnotifier plugin
  ignoreTrailingSlash: true,
});

// moodle airnotifier plugin send requests as application/x-www-form-urlencoded
server.register(require("fastify-formbody"));

// This is a special function to give format to the notification before sending it.
// See https://www.techotopia.com/index.php/Sending_Firebase_Cloud_Messages_from_a_Node.js_Server
// For more options.
// Extra param is filled inside message_output_airnotifier.php file. Contains the main notification data.
const notificationBuilder = ({ device, token, extra, request }) => {
  server.log.info("Building Notification");
  server.log.debug({
    device,
    token, // FCM token from Firebase SDK. Not the native platform token.
    extra,
    query: request.query,
  });
  
  let info = {
    title: '',
    body: ''
  };
  
  if(extra) {
    info = {
     title: extra.sitefullname || '',
     body: extra.smallmessage || ''
    };
  }

  const notification = {
    notification: {
      title: info.title,
      body: info.body,
    },
    token: token,
  };
  
  server.log.info("Notification built");
  server.log.debug(notification);
  
  return notification;
};

// Firebase config
const firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert(require(config.firebase.credential)),
  databaseURL: config.firebase.database,
});

// REST Endpoints

// The same url as AirNotifier for Push Notifications
server.post("/api/v2/push", (request, reply) => {
  server.log.info("Got Push Request");

  reply.type("application/json");

  const { headers } = request;

  if (
    headers["x-an-app-key"] !== config.headers.key ||
    headers["x-an-app-name"] !== config.headers.name
  ) {
    server.log.info("Headers Mismatch Error", headers);
    return reply
      .code(400)
      .send({ success: false, error: "Bad Headers", headers });
  }

  if (config.whitelist.length > 0) {
    if (!config.whitelist.contains(headers["host"])) {
      server.log.info("Whitelist Mismatch Error", headers);
      return reply
        .code(400)
        .send({ success: false, error: "Not whitelisted", headers });
    }
  }

  const { body } = request;

  // This payload is from Moodle AirNotifier Plugin
  //  contains {device, token, extra } objects inside
  const { device, token, extra } = body;

  const message = notificationBuilder({ device, token, extra, request });

  server.log.info("Sending Message", message);
  // Send a message to the device corresponding to the provided
  // registration token.
  // https://firebase.google.com/docs/cloud-messaging/send-message#send_messages_to_specific_devices

  return firebase
    .messaging()
    .send(message)
    .then((response) => {
      // Response is a message ID string.
      server.log.info("Successfully sent message:", response);
      return reply.code(202).send({ success: true, message, response });
    })
    .catch((error) => {
      server.log.info("Error sending message:", error);
      return reply.code(400).send({ success: false, message, error });
    });
});

// These routes are for completeness of the AirNotifier API
// But since we are using firebase, they are not needed to be implemented
const okResponse = (request, reply, info = {}) =>
  reply
    .type("application/json")
    .code(200)
    .send({
      version: "1.0.0",
      headers: request.headers,
      body: request.body,
      query: request.query,
      status: "ok", // moodle plugin expects this property to be present
      success: true,
      ...info,
    });

server.get("/", (request, reply) => {
  server.log.info("/ endpoint triggered", request.headers);
  return okResponse(request, reply);
});

server.post("/api/v2/tokens", (request, reply) => {
  server.log.info("Added Token", request.body);
  return okResponse(request, reply);
});

server.delete("/api/v2/tokens/*", (request, reply) => {
  server.log.info("Deleted Token", request.query);
  return okResponse(request, reply);
});

// Old API
server.post("/tokens/*", (request, reply) => {
  server.log.info("Requested Token", request.query);
  return okResponse(request, reply);
});

server.post("/accesskeys/*", (request, reply) => {
  server.log.info("Requested Access Key", request.query);
  // accesskey is expected to be present in the response
  return okResponse(request, reply, { accesskey: "ok" });
});

// Special Handlers

server.setNotFoundHandler((request, reply) => {
  server.log.info("Not found triggered", {
    headers: request.headers,
    body: request.body,
  });

  return reply
    .type("application/json")
    .code(404)
    .send({ success: false, error: "404 Not Found" });
});

server.setErrorHandler((error, request, reply) => {
  server.log.info("Got Error triggered", {
    headers: request.headers,
    body: request.body,
    error,
  });

  return reply
    .type("application/json")
    .code(500)
    .send({ success: false, error: "500 Server Error" });
});

// Run the server, specify the listener address too!
server.listen(config.port, config.listen, (err, address) => {
  if (err) {
    server.log.error(err);
  }
  server.log.info(`Server listening on ${address}`);
});
