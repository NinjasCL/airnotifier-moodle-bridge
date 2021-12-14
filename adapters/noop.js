// Example Adapter

// Adapter Protocol
const adapter = {
  name: 'adapter:my-adapter',
  notification : {},
};

// This is a special function to give format to the notification before sending it.
// Extra param is filled inside message_output_airnotifier.php file.
// Check https://github.com/moodle/moodle/blob/master/message/output/airnotifier/message_output_airnotifier.php
// Contains the main notification data.
adapter.notification.build = ({ device, token, extra, request, logger }) => {};

// Send the message using the sender object
// passing the message built with the previous function
adapter.notification.send = async ({message, logger}) => {};

// Export at least the adapter object
module.exports = {client:{}, adapter};
