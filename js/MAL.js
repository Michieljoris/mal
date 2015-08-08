var MAL = {
  init: function() {
    MAL.env = MAL.envUtils.bindEnv(MAL.special, MAL.core);
    MAL.repl("(def! not (fn* (a) (if a false true)))");
    MAL.env.eval = function(ast) {
      return MAL.EVAL(ast, MAL.env);
};
  },
  repl: function (str) {
    var READ = MAL.reader_printer.read;
    var EVAL = MAL.EVAL;
    var PRINT = MAL.reader_printer.print;
    var repl = PRINT(EVAL(READ(str), MAL.env));
    return repl;
  }
};
