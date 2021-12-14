
// Obtain your credentials json and database address at firebase's console
const credentials = {
  // is recommended that this credential json key have a random name and is not version controlled
  key: "./service-account-key.json",
  database: "https://<app name>.firebaseio.com",
};

// Firebase config
const firebase = require("firebase-admin");
firebase.initializeApp({
  credential: firebase.credential.cert(require(credentials.key)),
  databaseURL: credentials.database,
});


// See https://www.techotopia.com/index.php/Sending_Firebase_Cloud_Messages_from_a_Node.js_Server
// For more options.
const notificationBuilder = ({ device, token, extra, request, logger }) => {
  logger.info("Building Notification");
  logger.debug({
    device,
    token, // FCM token from Firebase SDK. Not the native platform token.
    extra,
    query: request.query,
  });

  let info = {
    title: "",
    body: "",
  };

  if (extra) {
    info = {
      title: extra.sitefullname || "",
      body: extra.smallmessage || "",
    };
  }

  const notification = {
    notification: {
      title: info.title,
      body: info.body,
    },
    token: token,
  };

  logger.info("Notification built");
  logger.debug(notification);

  return notification;
};

// Adapter Protocol
const adapter = {
  name: 'adapter:firebase',
  notification : {},
};

adapter.notification.build = notificationBuilder;

adapter.notification.send = async ({message, logger}) => {
  // Send a message to the device corresponding to the provided
  // registration token.
  // https://firebase.google.com/docs/cloud-messaging/send-message#send_messages_to_specific_devices
  return firebase
    .messaging()
    .send(message);
};

module.exports = {client:firebase, adapter};
