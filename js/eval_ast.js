var log = require('./debug').log;
var inspect = require('./debug').inspect;
var env;

function EVAL(ast) {
  if (ast.type === 'seq') {
    var list = ast.seq.map(EVAL);
    if (ast.seqType === 'list') 
      return list[0].apply(null, list.slice(1).map(function(a) { return a.value; }));
    else return { type: 'seq', seqType: ast.seqType, seq: list };
  }
  else if (ast.type === 'symbol') {
    if (!env[ast.value]) throw new Error("Unknown symbol " + ast.value);
    else return env[ast.value];
  }
  else return ast;
}

module.exports = function(ast, someEnv) {
  env = someEnv;
  return EVAL(ast);
};

function test() {
  var reader = require('./reader');
  var str = "(+ 1 2 (+ 2 3))";
  str = "(+ 1 2 )";
  str = "[1 (+ 1.2 2) { :bla \"bla\" (+ 1 2 (- 3 4))} ]";
  var ast = reader.read(str).exp;
  inspect(ast);
  return module.exports(ast, require('./repl_env'));
}

// inspect(test());

