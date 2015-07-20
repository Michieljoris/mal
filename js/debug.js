var util = require('util');
var debug;
debug = true;
function inspect(obj) {
  if (debug) console.log(util.inspect(obj, { depth:20, colors: true }));
}

function log() {
  if (debug) console.log.apply(console, arguments);
}


module.exports = {
  inspect: inspect,
  log: log
};
