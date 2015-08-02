var log = require('./util').log;
var inspect = require('./util').inspect;

var values = require('./util').values;

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

module.exports = {
  bind: bind,
  bindEnv: bindEnv
};
