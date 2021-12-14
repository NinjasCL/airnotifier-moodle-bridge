// Pusher Config
const PushNotifications = require('@pusher/push-notifications-server');

// Go to Pusher dashboard to get these
const pusher = new PushNotifications({
    instanceId: '<instance id>',
    secretKey: '<secret key>'
});

// See https://www.techotopia.com/index.php/Sending_Firebase_Cloud_Messages_from_a_Node.js_Server
// For more options.
const notificationBuilder = ({ device, token, extra, request, logger }) => {
  logger.info("Building Notification");
  logger.debug({
    device,
    token, // Pusher Token from the SDK
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
    token,
    body: {
      apns: {
        aps: {
          alert: {
            title: info.title,
            body: info.body,
          },
        },
      },
      fcm: {
        notification: {
          title: info.title,
          body: info.body,
        },
      },
      web: {
        notification: {
          title: info.title,
          body: info.body,
        },
      }
    }
  };

  logger.info("Notification built");
  logger.debug(notification);

  return notification;
};

// Adapter Protocol
const adapter = {
  name: 'adapter:pusher',
  notification : {},
};

adapter.notification.build = notificationBuilder;

adapter.notification.send = async ({message, logger}) => {
  return pusher.publishToUsers([message.token], message.body);
};

module.exports = {client:pusher, adapter};
