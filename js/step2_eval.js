// require("babel-core").transform("code", {});

var readline = require('./node_readline');
var evalAst = require('./eval');
var env = require('./core');

// read
function READ(str) {
  return require('./reader_printer').read(str);
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
var rep = function(str) { return PRINT(EVAL(READ(str), env)); };

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
