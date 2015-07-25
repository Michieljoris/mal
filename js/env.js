var log = require('./util').log;
var inspect = require('./util').inspect;

var values = require('./util').values;

function bind(env, symbols, expressions, evaluate) {
  var newEnv = Object.create(env);
  symbols.forEach(function(symbol, i) {
    newEnv[symbol.value || symbol] = evaluate ? EVAL(expressions[i], env) : expressions[i];
  });
  return newEnv;
}

function bindEnv(env1, env2) {
  return bind(env1, Object.keys(env2), values(env2));
}

module.exports = {
  bind: bind,
  bindEnv: bindEnv
};
