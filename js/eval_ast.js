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
    return EVAL(args[1], newEnv);
  },
  "do": function(env, args) {
    var last;
    args.forEach(function(exp) {
      last = EVAL(exp, env);
    });
    return last || { type: 'symbol', value: 'nil' };
  },
  "if": function(env, args) {
    var cond = EVAL(args[0], env);
    if (cond.type !== 'nil' && cond.type !== 'false') return EVAL(args[1], env);
    else return args[2] ? EVAL(args[2], env) : { type: 'nil', value: 'nil' };
  },
  "fn*": function(env, args) {
    return function(expressions) {
      var newEnv = Object.create(env);
      args[0].seq.forEach(function(symbol, i) {
        newEnv[symbol.value] = expressions[i];
      });
      return EVAL(args[1], newEnv);
    };
    
  }
};

function EVAL(ast, env) {
  var list,fn;
  if (ast.type === 'seq') {
    list = ast.seq;
    if (ast.seqType === 'list') {
      var specialAtom = specialAtoms[list[0].value];
      if (specialAtom) return specialAtom(env, list.slice(1));
      list = ast.seq.map(function(ast) { return EVAL(ast, env); });
      return list[0](list.slice(1));
    }
    else {
      list = ast.seq.map(function(ast) { return EVAL(ast, env); });
      return { type: 'seq', seqType: ast.seqType, seq: list };
    }
  }
  else if (ast.type === 'symbol') {
    if (!env[ast.value]) throw new Error("Unknown symbol " + ast.value);
    return env[ast.value];
  }
  else return ast;
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
// inspect(test(str));
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

