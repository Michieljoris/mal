if (typeof MAL === 'undefined') MAL = {};
MAL.envUtils = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var values = env.util.values;

  function bind(env, symbols, expressions) {
    var newEnv = Object.create(env);
    symbols.some(function(symbol, i) {
      if (symbol.toString() === '&') {
        symbol = symbols[i+1].toString() ;
        newEnv[symbol] = expressions.slice(i);
        newEnv[symbol].type = 'list';
        return true;
      }
      newEnv[symbols[i].toString()] = expressions[i];
      return false;
    });
    return newEnv;
  }

  function bindEnv(env1, env2) {
    return bind(env1, Object.keys(env2), values(env2));
  }

  return {
    bind: bind,
    bindEnv: bindEnv
  };
})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.envUtils; }
