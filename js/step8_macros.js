var log = require('./util').log;
var inspect = require('./util').inspect;

// require("babel-core").transform("code", {});

var readline = require('./node_readline');

var READ = require('./reader_printer').read;
var EVAL = require('./eval');
var PRINT = require('./reader_printer').print;

var env = require('./envUtils').bindEnv(require('./special'), require('./core'));

env.eval = function(ast) {
  return EVAL(ast, env);
};

// repl
var repl = function(str) { return PRINT(EVAL(READ(str), env)); };

repl("(def! not (fn* (a) (if a false true)))");
repl("(def! load-file (fn* (f) (eval (read-string (str \"(do \" (slurp f) \")\")))))");

repl("(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list 'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw \"odd number of forms to cond\")) (cons 'cond (rest (rest xs)))))))");
repl("(defmacro! or (fn* (& xs) (if (empty? xs) nil (if (= 1 (count xs)) (first xs) `(let* (or_FIXME ~(first xs)) (if or_FIXME or_FIXME (or ~@(rest xs))))))))");


var threadMacro = 
  [
    " (defmacro! -> ",
    " (fn* (x & xs) ",
    " (if (empty? xs) ",
    " x ",
    " (let* (form (first xs) ",
    " more (rest xs)) ",
    " (if (empty? more) ",
    " (if (list? form) ",
    " `(~(first form) ~x ~@(rest form)) ",
    " (list form x)) ",
    " `(-> (-> ~x ~form) ~@more)))))) ",
  ].join('');

repl(threadMacro);

var args = process.argv.slice(2);

var fileName = args[0];
args = args.slice(1).join(' ');
env['*ARGV*'] = (EVAL(READ('(list '+ args + ')'), env));

if (fileName) {
  repl("(load-file \"" + fileName + "\")");
}
else {
  // // repl loop
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
}
