var log = require('./debug').log;
var inspect = require('./debug').inspect;

var specialAtoms = {
  "def!": function(env, args) {
    return env[args[0].value] = EVAL(args[1], env);
  },
  "let*": function(env, args) {
    var newEnv = Object.create(env);
    var bindings = args[0].seq;
    while (bindings.length) {
      //TODO: check for even, symbol/value pairs..
      newEnv[bindings.shift().value] = EVAL(bindings.shift(), newEnv);
    }
    return { ast: args[1], env: newEnv };
  },
  "do": function(env, args) {
    args.slice(0, args.length-1).forEach(function(ast) {
      EVAL(ast, env);
    });
    var last = args.slice(args.length-1);
    return { ast: last[0] };
  },
  "if": function(env, args) {
    var cond = EVAL(args[0], env);
    if (cond.type !== 'nil' && cond.type !== 'false') return { ast: args[1] };
    else return { ast: args[2] };
  },
  "fn*": function(env, args) {
    var params = args[0].seq;
    var body = args[1];
    var fn = function(expressions) {
      return EVAL(body, bind(env, params, expressions));
    };
    return {
      fn: fn,
      body: body,
      params: params,
      env: env
    };
  }
};

function bind(env, symbols, expressions) {
  var newEnv = Object.create(env);
  symbols.forEach(function(symbol, i) {
    newEnv[symbol.value] = EVAL(expressions[i], env);
  });
  return newEnv;
}

function EVAL(ast, env) {
  var count = 0;
  while (true && count++ < 100) {
    if (ast.type === 'seq') {
      //lists -> apply
      if (ast.seqType === 'list') {
        var fn = EVAL(ast.seq[0], env);
        var args = ast.seq.slice(1);
        var specialAtom = specialAtoms[fn];
        if (specialAtom) {
          //Do whatever you want with the unevaluated args
          var result = specialAtom(env, args);
          if (result.fn) return result;
          //Don't return anything, just loop till something does..
          ast = result.ast; env = result.env || env;
        } else {
          args = args.map(function(ast) { return EVAL(ast, env); });
          if (fn.fn) {
            ast = result.body;
            env = bind(result.fn.env, result.fn.params, args);
          }
          else return fn(args);
        }
      }
      //Vectors and hashmaps -> evaluate elements
      else return { type: 'seq', seqType: ast.seqType,
                    seq: ast.seq.map(function(ast) { return EVAL(ast, env); }) };
    }
    //Symbols -> retrieve value from environment
    else if (ast.type === 'symbol') {
      if (!env[ast.value]) throw new Error("Unknown symbol " + ast.value);
      return env[ast.value];
    }
    //numbers, booleans, keywords, nil -> return as is
    else return ast || { type: 'nil', value: 'nil' };
  }
  //If nothing is returned, loop infinitely till something is..
}

module.exports = function(ast, someEnv) {
  return EVAL(ast, someEnv);
};


//Test
function test(str) {
  var reader = require('./reader_printer');
  // var str = "(+ 1 2 (+ 2 3))";
  // // str = "(+ 1 2 )";
  // // str = "(let* (a 6 b (+ a 2)) (+ a b))";
  // str = "(def! a 6)";
  // str = "[1 (+ 1.2 2) { :bla \"bla\" (+ 1 2 (- 3 4))} ]";
  var ast = reader.read(str).exp;
  // log(str);
  // log(reader.print(ast));
  inspect(ast);
  return module.exports(ast, require('./core'));
}

// ;; Testing closures
var str = "( ( (fn* (a) (fn* (b) (+ a b))) 5) 7)";
// ;=>12

str = "(def! not (fn* (a) (if a false true)))";

str = "(let* (a 6 b (+ a 2)) (+ a b))";
inspect(test(str));
// str = "(def! gen-plus5 (fn* () (fn* (b) (+ 5 b))))";
// inspect(test(str));

// str = "(def! plus5 (gen-plus5))";
// inspect(test(str));
// // inspect(test(str));
// str = "(plus5 7)";
// inspect(test(str));
// ;=>12

// (def! gen-plusX (fn* (x) (fn* (b) (+ x b))))
// (def! plus7 (gen-plusX 7))
// (plus7 8)
// ;=>15

// var str = "(/ (- (+ 5 (* 2 3)) 3) 4)";
// str = "(+ 3 2)";
// // str = "(def! y (+ 1 7))";
// // str = "((fn* [a b] (* a b)) 16 2)";
// str = "(count nil)";
// str = "(= (list) (list 1))";
// inspect(test(str));
// // var r = test("(def! a 2)");
// var l = test("(let* (a 3) a)");
// var r2 = test("a");
// log('----------');
// inspect(r);
// inspect(l);
// inspect(r2);

