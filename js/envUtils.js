var log = require('./util').log;
var inspect = require('./util').inspect;

var values = require('./util').values;

function bind(env, symbols, expressions) {
  var newEnv = Object.create(env);
  symbols = symbols.map(function(symbol) { return symbol.value || symbol; });
  symbols.some(function(symbol, i) {
    if (symbol === '&') {
      newEnv[symbols[i+1]] = { type: 'seq', seqType: 'list', seq: expressions.slice(i) };
      return true;
    }
    newEnv[symbols[i]] = expressions[i];
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
