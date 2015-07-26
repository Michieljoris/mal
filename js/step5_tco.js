var log = require('./util').log;
var inspect = require('./util').inspect;

// require("babel-core").transform("code", {});

var readline = require('./node_readline');

var READ = require('./reader_printer').read;
var EVAL = require('./eval');
var PRINT = require('./reader_printer').print;

var env = require('./envUtils').bindEnv(require('./special'), require('./core'));

// repl
var repl = function(str) { return PRINT(EVAL(READ(str), env), 'readably'); };

repl("(def! not (fn* (a) (if a false true)))");

// repl loop
while (true) {
  var line = readline.readline("user> ");
  if (line === null) { break; }
  try {
    if (line) { console.log(repl(line)); }
  } catch (exc) {
    if (exc.stack) { console.log(exc.stack); }
    else           { console.log(exc); }
  }
}
