var log = require('./debug').log;
var inspect = require('./debug').inspect;

// require("babel-core").transform("code", {});

var readline = require('./node_readline');
var evalAst = require('./eval_ast');
var coreEnv = require('./core');

// read
function READ(str) {
  return require('./reader_printer').read(str).exp;
}

// eval
function EVAL(ast, env) {
  return evalAst(ast, env);
}

// print
function PRINT(exp) {
  return require('./reader_printer').print(exp);
}

// repl
var rep = function(str) { return PRINT(EVAL(READ(str), coreEnv)); };

rep("(def! not (fn* (a) (if a false true)))");

// repl loop
while (true) {
  var line = readline.readline("user> ");
  if (line === null) { break; }
  try {
    if (line) { console.log(rep(line)); }
  } catch (exc) {
    if (exc.stack) { console.log(exc.stack); }
    else           { console.log(exc); }
  }
}
