// Generates a unique id
// for use as the value of X-An-App-Key header
// in your moodle plugin setting
const { uuid } = require("uuidv4");
console.log(uuid());
