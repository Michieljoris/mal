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
      return list[0](list.slice(1).map(function(a) { return a.value; }));
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
  log(reader.print(ast));
  inspect(ast);
  return module.exports(ast, require('./repl_env'));
}

// var str = "(/ (- (+ 5 (* 2 3)) 3) 4)";
// // str = "(/ 3 2)";
// str = "(def! y (+ 1 7))";
// inspect(test(str));
// var r = test("(def! a 2)");
// var l = test("(let* (a 3) a)");
// var r2 = test("a");
// log('----------');
// inspect(r);
// inspect(l);
// inspect(r2);

