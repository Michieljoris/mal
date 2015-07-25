var EVAL = require('./eval');

function special(fn) {
  fn.special = true;
  return fn;
};

var specialAtoms = {
  "def!": special(function(env, args) {
    return { ast: env[args[0].value] = EVAL(args[1], env) };
  }),
  "let*": special(function(env, args) {
    var newEnv = Object.create(env);
    var bindings = args[0].seq;
    while (bindings.length) {
      //TODO: check for even, symbol/value pairs..
      newEnv[bindings.shift().value] = EVAL(bindings.shift(), newEnv);
    }
    return { ast: args[1] || { type: 'nil', value: 'nil'}, env: newEnv };
  }),
  "do": special(function(env, args) {
    args.slice(0, args.length-1).forEach(function(ast) {
      EVAL(ast, env);
    });
    var last = args.slice(args.length-1);
    return { ast: last[0] || { type: 'nil', value: 'nil'}};
  }),
  "if": special(function(env, args) {
    var cond = EVAL(args[0], env);
    if (cond.type !== 'nil' && cond.type !== 'false') return { ast: args[1] };
    else return { ast: args[2] || { type: 'nil', value: 'nil'}};
  }),
  "fn*": special(function(env, args) {
    var params = args[0].seq;
    var body = args[1];
    var fn = function(expressions) {
      return EVAL(body, bind(env, params, expressions, 'eval expressions'));
    };
    return {
      ast: body,
      env: env,
      fn: fn,
      params: params
    };
  })
};

module.exports = specialAtoms;
