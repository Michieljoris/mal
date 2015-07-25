var util = require('util');
var debug = true;

function inspect(obj) {
  if (debug) console.log(util.inspect(obj, { depth:30, colors: true }));
}

function log() {
  if (debug) console.log.apply(console, arguments);
}

function values(obj) { return Object.keys(obj).map(function(key) { return obj[key] }); };

var unboundSlice = Array.prototype.slice;
var slice = Function.prototype.call.bind(unboundSlice);

module.exports = {
  inspect: inspect,
  log: log,
  slice: slice,
  values: values
};
