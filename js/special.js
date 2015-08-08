if (typeof MAL === 'undefined') MAL = {};
MAL.special = (function(env) {
  var EVAL = env.EVAL;
  var bind = env.bind;

  function special(fn) {
    fn.special = true;
    return fn;
  };

  function isNull(arg) {
      return typeof arg !== 'undefined' ? arg : null;
  }

  return {
    "def!": special(function(env, args) {
      return { ast: env[args[0].toString()] = EVAL(args[1], env) };
    }),
    "let*": special(function(env, args) {
      var newEnv = Object.create(env);
      var bindings = args[0];
      while (bindings.length) {
        //TODO: check for even, symbol/value pairs..
        newEnv[bindings.shift().toString()] = EVAL(bindings.shift(), newEnv);
      }
      var ast = typeof args[1] !== 'undefined' ? args[1] : null;
      return { ast: ast, env: newEnv, tco: true };
    }),
    "do": special(function(env, args) {
      args.slice(0, args.length-1).forEach(function(ast) {
        EVAL(ast, env);
      });
      var last = args.slice(args.length-1)[0];
      var ast = typeof last !== 'undefined' ? last : null;
      return { ast: ast, tco: true };
    }),
    "if": special(function(env, args) {
      var cond = EVAL(args[0], env);
      if (cond !== null && cond !== false) return { ast: isNull(args[1]), tco: true };
      else return { ast: isNull(args[2]), tco: true };
    }),
    "fn*": special(function(env, args) {
      var params = args[0];
      var body = args[1];
      var fn = function(expressions) {
        return EVAL(body, bind(env, params, expressions));
      };
      return {
        ast: body,
        env: env,
        fn: fn,
        params: params
      };
    })
  };

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    bind: inNode ? require('./envUtils').bind : MAL.envUtils.bind,
    EVAL: inNode ?  require('./eval') : MAL.EVAL
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.special; }
