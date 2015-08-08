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

  function isPair(arg) {
    return arg && ~['vector', 'list'].indexOf(arg.type) && arg.length;;
  }

  function symbol(str) {
    var symbol = new String(str);
    symbol.type = 'symbol';
    return symbol;
  }

  function isSymbol(ast, symbolName) {
    return ast && ast.type === 'symbol' && ast.toString() === symbolName;
  }

  function list(arr) {
    arr.type = 'list';
    return arr;
  }

  var functions =  {
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
    }),
    "quote": special(function(env, args) {
      return { ast: args[0] };
    }),
    "quasiquote": special(function(env, args) {
      var ast = args[0];
      // console.log('ast=', ast);
      if (!isPair(ast)) {
        ast = [symbol('quote'), ast];
      }
      else if(isSymbol(ast[0], 'unquote')) ast = ast[1];
      else if (isPair(ast[0]) && isSymbol(ast[0][0], 'splice-unquote')) {
        ast = [symbol('concat'),
               ast[0][1], 
               list([symbol('quasiquote'),
                     list(ast.slice(1))])
              ];
      }
      else {
        // console.log('consing', ast, ast[0], ast[1], ast[2]);
        ast = list([symbol('cons'),
                    list([symbol('quasiquote'), ast[0]]),
                    list([symbol('quasiquote'),
                          list(ast.slice(1))])
                   ]);
        // console.log(ast);
      }

      ast.type = 'list';
      return { ast: ast, tco: true };
    })
  };
  return functions;
// if is_pair of ast is false: return a new list containing: a symbol named "quote" and ast.

// else if the first element of ast is a symbol named "unquote": return the second element of ast.

// if is_pair of first element of ast is true and the first element of first element of ast (ast[0][0]) is a symbol named "splice-unquote": return a new list containing: a symbol named "concat", the second element of first element of ast (ast[0][1]), and the result of calling quasiquote with the second through last element of ast.

// otherwise: return a new list containing: a symbol named "cons", the result of calling quasiquote on first element of ast (ast[0]), and result of calling quasiquote with the second through last element of ast.

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    bind: inNode ? require('./envUtils').bind : MAL.envUtils.bind,
    EVAL: inNode ?  require('./eval') : MAL.EVAL
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.special; }
