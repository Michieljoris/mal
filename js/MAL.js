var MAL = {
  init: function() {
    MAL.env = MAL.envUtils.bindEnv(MAL.special, MAL.core);
  },
  repl: function (str) {
  var READ = MAL.reader_printer.read;
  var EVAL = MAL.EVAL;
  var PRINT = MAL.reader_printer.print;
  return PRINT(EVAL(READ(str), MAL.env), 'readably');
  }
};
