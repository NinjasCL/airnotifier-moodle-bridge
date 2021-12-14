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

const adapters = require("./adapters").adapters;

const settings = require("./config");
const config = settings.config;
const server = settings.server;

// moodle airnotifier plugin send requests as application/x-www-form-urlencoded
server.register(require("fastify-formbody"));

// REST Endpoints

// The same url as AirNotifier for Push Notifications
server.post("/api/v2/push", async (request, reply) => {
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

  let json = body;

  if (!body.token) {
    // Server sent an akward json format
    const keys = Object.keys(body);
    let raw = "";
    keys.forEach((key) => {
      raw += key + body[key];
    });

    json = JSON.parse(raw);
  }

  // This payload is from Moodle AirNotifier Plugin
  // contains {device, token, extra } objects inside
  const { device, token, extra } = json;

  // Send the notification to all the available adapters
  const logger = server.log;
  const tasks = [];
  const responses = [];

  for(const adapter in adapters) {

    const message = adapter.notification.build({ device, token, extra, request, logger });

    server.log.info("Sending Message", message);

    tasks.push(
      adapter.notification.send({
        message, 
        logger
      }).then(response => responses.push({
        adapter:adapter.name,
        message,
        response
      }
    )));
  }
  
  return Promise.all(tasks).then((res) => {
    // Response is a message ID string.
    server.log.info("Successfully sent message(s):", responses);
    return reply.code(202).send({ success: true, data: { responses }});
  })
  .catch((error) => {
    server.log.info("Error sending message(s):", error);
    return reply.code(400).send({ success: false, data: { responses }, error });
  });
});

// These routes are for completeness of the AirNotifier API
// But since we are using the adapters, they are not needed to be implemented
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
