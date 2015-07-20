// require("babel-core").transform("code", {});

var readline = require('./node_readline');

// read
function READ(str) {
  return require('./reader').read(str).exp;
}

// eval
function EVAL(ast, env) {
  return ast;
}

// print
function PRINT(exp) {
  return require('./reader').print(exp);
}

// repl
var rep = function(str) { return PRINT(EVAL(READ(str), {})); };

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
