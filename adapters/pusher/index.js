// Pusher Config
const PushNotifications = require('@pusher/push-notifications-server');

// Go to Pusher dashboard to get these
const pusher = new PushNotifications({
    instanceId: '<instance id>',
    secretKey: '<secret key>'
});

// See https://pusher.com/docs/beams/reference/server-sdk-node/
// For more options.
const notificationBuilder = ({ device, token, extra, request, logger }) => {
  logger.info("Building Notification");
  logger.debug({
    device,
    token, // Pusher interest to send to the device
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
  // See https://pusher.com/docs/beams/concepts/device-interests/
  // And https://pusher.com/docs/beams/reference/server-sdk-node/#publishtointerests
  return pusher.publishToInterests([message.token], message.body);
};

module.exports = {client:pusher, adapter};
