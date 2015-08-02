if (typeof MAL === 'undefined') MAL = {};
MAL.util = (function(env) {
  var debug = true;

  function inspect(obj) {
    if (debug) {
      if (env.inNode) console.log(env.Util.inspect(obj, { depth:30, colors: true }));
      else log(obj);
    }
  };

  function log() {
    if (debug) console.log.apply(console, arguments);
  }

  function values(obj) { return Object.keys(obj).map(function(key) { return obj[key] }); };

  var unboundSlice = Array.prototype.slice;
  var slice = Function.prototype.call.bind(unboundSlice);

  return {
    insp: inspect,
    log: log,
    slice: slice,
    values: values
  };
})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    Util: inNode ? require('util') : { inspect: console.log }
  };
})()); 

if (typeof module !== 'undefined') {
  module.exports = MAL.util;
}
