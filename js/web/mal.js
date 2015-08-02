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
if (typeof MAL === 'undefined') MAL = {};
MAL.util = (function(env) {
  var debug = true;

  function inspect(obj) {
    if (debug) {
      if (env.inNode) console.log(env.Util.inspect(obj, { depth:30, colors: true }));
      else log(obj);
    }
  };

  function log() {
    if (debug) console.log.apply(console, arguments);
  }

  function values(obj) { return Object.keys(obj).map(function(key) { return obj[key] }); };

  var unboundSlice = Array.prototype.slice;
  var slice = Function.prototype.call.bind(unboundSlice);

  return {
    insp: inspect,
    log: log,
    slice: slice,
    values: values
  };
})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    Util: inNode ? require('util') : { inspect: console.log }
  };
})()); 

if (typeof module !== 'undefined') {
  module.exports = MAL.util;
}
if (typeof MAL === 'undefined') MAL = {};
MAL.envUtils = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var values = env.util.values;

  function bind(env, symbols, expressions) {
    var newEnv = Object.create(env);
    symbols.some(function(symbol, i) {
      if (symbol.toString() === '&') {
        symbol = symbols[i+1].toString() ;
        newEnv[symbol] = expressions.slice(i);
        newEnv[symbol].type = 'list';
        return true;
      }
      newEnv[symbols[i].toString()] = expressions[i];
      return false;
    });
    return newEnv;
  }

  function bindEnv(env1, env2) {
    return bind(env1, Object.keys(env2), values(env2));
  }

  return {
    bind: bind,
    bindEnv: bindEnv
  };
})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.envUtils; }
if (typeof MAL === 'undefined') MAL = {};
MAL.reader_printer = (function(env) {
  var log = env.util.log;
  var inspect = env.util.inspect;

  var tokensRe = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"|;.*|[^\s\[\]{}('"`,;)]*)/g;
  var openingTokensMap = { list: '(', 'vector': '[', 'hash': '{' };
  var closingTokensMap = { list: ')', 'vector': ']', 'hash': '}' };
  var closingTokens = ")}]";
  var readerMacros = { "'": "quote",
                       "`": "quasiquote",
                       "~" : "unquote",
                       "~@": "splice-unquote",
                       "@" : "deref",
                       "^" : "with-meta"
                     };
  var printReadably;

  function tokenize(str) {
    return str.match(tokensRe)
      .map(function(r) {
        return r.replace(/^[\s,]*/, '');
      })
      .filter(function(r) {
        return r && r[0] !== ';';
      });
  }

  function isSeqOpening(token) {
    var type;
    switch (token) {
     case '(' : type = 'list'; break;
     case '[' : type = 'vector'; break;
     case '{' : type = 'hash'; break;
    default: ;
    }
    if (type) {
      var result = [];
      result.type = type;
      return result;
    }
    return false;
  }

  function isSeqClosing(seq, token) {
    if (~closingTokens.indexOf(token)) {
      if (closingTokensMap[seq.type] !== token) throw "Unexpected \"" + token + "\"";
      return true;
    }
    return false;
  }

  function readExp(tokens) {
    // log(tokens);
    var error;
    var stack = [];
    var current = [];
    if (!tokens.length) throw "no tokens";
    do {
      var t = tokens.shift();
      var seq = isSeqOpening(t);
      var readerMacro = readerMacros[t];
      if (readerMacro) {
        // readerMacro = { type: 'seq', seqType: 'list', seq: [readAtom(readerMacro)]};
        readerMacro = [readAtom(readerMacro)];
        readerMacro.type = 'list';
        if (t === '^') {
          var meta = readExp(tokens);
          tokens = meta.tokens;
        }
        var exp = readExp(tokens);
        readerMacro.push(exp.exp);
        if (meta) readerMacro.push(meta.exp);
        tokens = exp.tokens;
        current.push(readerMacro);
      }
      else if (seq)  {
        current.push(seq);
        stack.push(current);
        current = seq;
      }
      else if (isSeqClosing(current, t)) {
        current = stack.pop();
      }
      else {
        current.push(readAtom(t));
      }
    } while (tokens.length && stack.length);

    if (stack.length) {
      var last = stack.pop();
      if (!stack.length) last = last[0];
      throw last.type + ' is missing closing \"' + closingTokensMap[last.type] + '\"';
    }
    return { exp: current[0], tokens: tokens };
  }

  function readAtom(token) {
    var tokenMap = { 'nil': null, 'true': true, 'false': false };
    var result = tokenMap[token];
    if (typeof result !== 'undefined') return result;
    if (token.match(/^\d+(\.\d+)?$/)) return Number.parseFloat(token);

    var type = 'symbol';
    var value = token;
      if (token[0] === ':') {
        type = 'keyword';
        value = token.slice(1); 
      }
    else if (token[0] === '"') {
      type = 'string';
      value = token.slice(1, token.length-1); 
    }
    result = new String(value);
    result.type = type;
    return result;
  }

  function printSeq(seq) {
    var str = seq.map(function(ast) { return printAst(ast); }).join(' ');
    return openingTokensMap[seq.type] + str + closingTokensMap[seq.type];
  }

  var print = {
    list: function(seq) { return printSeq(seq, 'list'); },
    vector: function(seq) { return printSeq(seq, 'vector'); },
    hash: function(seq) { return printSeq(seq, 'hash'); },
    keyword: function(keyword) { return ':' + keyword; },
    symbol: function(symbol) { return  symbol.toString(); },
    string: function printString(string) {
      return printReadably ?
        string.replace(/\\n/g, '\n').replace(/\\"/g, '"') : '"' + string  + '"';
    }
  };

  print[null] = function() { return 'nil' };
  print[false] = function() { return 'false' };
  print[0] = function() { return 0 };

  function printAst(ast, somePrintReadably) {
    if (ast) {
      if (typeof ast === 'object') {
        if (ast.fn) return ast.fn;
        return print[ast.type](ast);
      }
      return ast; //true
    }
    // log('ast', ast);
    return print[ast]();
  }

  return {
    print: function(ast, somePrintReadably) {
      printReadably = somePrintReadably;
      return printAst(ast); },
    read: function(str) {
      var tokens = tokenize(str);
      var result = readExp(tokens);
      if (!result.error && tokens.length) {
        result.error = "Surplus tokens";
      }
      if (result.error) throw(result.error);
      return result.exp;
    }
  };

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util
  };
})()); 

if (typeof module !== 'undefined') {
  module.exports = reader_printer;
}

  //test
  // function read(str) {
  //   var tokens = tokenize(str);
  //   // log(tokens);
  //   var result = module.exports.read(str);
  //   return result;
  // }

  // function test(str) {
  //   log(str);
  //   // printReadably = true;
  //   var result = module.exports.read(str);
  //   // log('In test, exp is:');
  //   inspect(result);
  //   log(module.exports.print(result));
  // }
// test('(1 2 3)');

// test('a');
// ;; Testing read of ^/metadata
// test('"\""');

// ^{"a" 1} [1 2 3]
// ;=>(with-meta [1 2 3] {"a" 1})

// test('(1 2, 3,,,,),,');
// test('[nil false true mysymbol :mykeyword 1 "mystring" (0 2 3 4)]');

// test('nil');
// test("(a b c )");
// test("'(a c  '(d e)  'f g)");

// test('^{"a" 1} [1 2 3] ');
// test('^{"a" 1} [1 2 3]');
// test('(+ 1 (+   2 3))');
// test('(123.456 :keyword symbol "string" [nil true false])');
// test('"myst\\\"ring"');
// test("(1 2 3)");
// test("'abc");
// test('"abc\\"def"');
// ;; Testing read of nil/true/false
// nil
// ;=>nil
// true
// ;=>true
// false
// ;=>false


// ;; Testing read of numbers
// 1
// ;=>1
// 7
// ;=>7
//   7   
// ;=>7


// ;; Testing read of symbols
// +
// ;=>+
// abc
// ;=>abc
//    abc   
// ;=>abc
// abc5
// ;=>abc5
// abc-def
// ;=>abc-def


// ;; Testing read of strings
// "abc"
// ;=>"abc"
//    "abc"   
// ;=>"abc"
// "abc (with parens)"
// ;=>"abc (with parens)"
// "abc\"def"
// ;=>"abc\"def"
// ;;;"abc\ndef"
// ;;;;=>"abc\ndef"
// ""
// ;=>""


// ;; Testing read of lists
// (+ 1 2)
// ;=>(+ 1 2)
// ((3 4))
// ;=>((3 4))
// (+ 1 (+ 2 3))
// ;=>(+ 1 (+ 2 3))
//   ( +   1   (+   2 3   )   )  
// ;=>(+ 1 (+ 2 3))
// (* 1 2)
// ;=>(* 1 2)
// (** 1 2)
// ;=>(** 1 2)

// ;; Test commas as whitespace
// (1 2, 3,,,,),,
// ;=>(1 2 3)

// ;; Testing read of quoting
// '1
// ;=>(quote 1)
// '(1 2 3)
// ;=>(quote (1 2 3))
// `1
// ;=>(quasiquote 1)
// `(1 2 3)
// ;=>(quasiquote (1 2 3))
// ~1
// ;=>(unquote 1)
// ~(1 2 3)
// ;=>(unquote (1 2 3))
// ~@(1 2 3)
// ;=>(splice-unquote (1 2 3))

// ;;
// ;; Testing reader errors
// ;;; TODO: fix these so they fail correctly
// (1 2
// ; expected ')', got EOF
// [1 2
// ; expected ']', got EOF
// "abc
// ; expected '"', got EOF

// ;;
// ;; -------- Optional Functionality --------

// ;; Testing keywords
// :kw
// ;=>:kw
// (:kw1 :kw2 :kw3)
// ;=>(:kw1 :kw2 :kw3)

// ;; Testing read of vectors
// [+ 1 2]
// ;=>[+ 1 2]
// [[3 4]]
// ;=>[[3 4]]
// [+ 1 [+ 2 3]]
// ;=>[+ 1 [+ 2 3]]
//   [ +   1   [+   2 3   ]   ]  
// ;=>[+ 1 [+ 2 3]]

// ;; Testing read of hash maps
// {"abc" 1}
// ;=>{"abc" 1}
// {"a" {"b" 2}}
// ;=>{"a" {"b" 2}}
// {"a" {"b" {"c" 3}}}
// ;=>{"a" {"b" {"c" 3}}}
// {  "a"  {"b"   {  "cde"     3   }  }}
// ;=>{"a" {"b" {"cde" 3}}}
// {  :a  {:b   {  :cde     3   }  }}
// ;=>{:a {:b {:cde 3}}}

// ;; Testing read of comments
//  ;; whole line comment (not an exception)
// 1 ; comment after expression
// ;=>1
// 1; comment after expression
// ;=>1

// ;; Testing read of ^/metadata
// ^{"a" 1} [1 2 3]
// ;=>(with-meta [1 2 3] {"a" 1})


// ;; Testing read of @/deref
// @a
// ;=>(deref a)



// var test = new String("test");
// test.type = "symbol";
// log(test);
// console.log(test +""); // prints out "test"
// console.log(test.test); // prints out "test inner"
// console.log(test.constructor.name); //String
// log(typeof []);
// log([].constructor.name); //Array
// var a = ['bla'];
// a.type = 'vector';
// log(a);
if (typeof MAL === 'undefined') MAL = {};
MAL.core = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var print = env.reader_printer.print; 

  return {
    '+' : function(args) { return args
                           .reduce(function(p,n) {
                             return  p + n; }); },
    '*' : function(args) { return args[0] * args[1]; },
    '-' : function(args) { return args[0] - args[1]; },
    '/' : function(args) { return args[0] / args[1]; },
    list: function(args) {
      args.type = 'list';
      return args;
    },
    "list?": function(args) {
      return args[0] && args[0].type === 'list' ? true : false;
    },
    "empty?": function(args) {
      return args[0].length  ? false : true;
    },
    "count": function(args) {
      if (args[0] === null) return 0;
      return args[0].length;
    },
    "=": function(args) {
      // log('=');
      // inspect(args);
      if (args[0] !== null && args[1] !== null) {
        var type1 = args[0].constructor.name;
        var type2 = args[1].constructor.name;
        if  (type1 !== type2) return false;
        if (type1 ==='Array') {
          if (args[0].length !== args[1].length) return false;
          else return args[0].every(function(arg, i)  {
            var arg2 = args[1][i];
            return module.exports['=']([arg, arg2]);
          });
        }
        if (type1 === 'String') {
          return args[0].type === args[1].type && args[0] + '' === args[1] + '';
        }
      }
      return args[0] === args[1]; //null, numbers, true and false
    },
    ">": function(args) {
      return args[0] > args[1];
    },
    ">=": function(args) {
      return args[0] >= args[1];
    },
    "<": function(args) {
      return args[0] < args[1];
    },
    "<=": function(args) {
      return args[0] <= args[1];
    },

    "str": function(args) {
      var str = args.map(function(arg) {
        return (arg && arg.constructor.name === 'String') ? arg + '' : print(arg);
      }).join('');
      str = new String(str);
      str.type = 'string';
      return str;
    },


    "pr-str": function(args) {
      var str = args.map(function(arg) {
        return print(arg);
      }).join(' ');
      str = str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
      str = new String(str);
      str.type = 'string';
      return str;
    },

    "println": function(args) {
      // inspect(args);
      var result = args.map(function(arg) {
        return print(arg, 'print readably');
      }).join(' ');
      console.log(result);
      return null;
    },

    "prn": function(args) {
      var result = args.map(function(arg) {
        return print(arg);
      }).join(' ');
      console.log(result);
      // if (args.length) console.log('"' + str + '"');
      return null;
    }
  };

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util,
    reader_printer: inNode ? require('./reader_printer') : MAL.reader_printer
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.core; }



// var a = [1,2,3,4];

// console.log(a.reduce(function(p,n) { return p + n; }));

// var r = module.exports['+'](1,2,3,4);
// console.log(r);

// var r = module.exports['+']([ {type: 'number', value: 1 } , {type: 'number', value: 2 }]);

if (typeof MAL === 'undefined') MAL = {};
MAL.EVAL = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var bind = env.bind;
  
  return function EVAL(ast, env) {
    var count = 0;
    while (true && count++ < 100000) {
      if (ast === null) return null; //silly javascript, on object that's not an object..
      if (ast.constructor.name === 'Array') {
        //lists -> apply
        if (ast.type === 'list') {
          // log(ast);
          var fn = EVAL(ast[0], env);
          // log(fn);
          var args = ast.slice(1);
          if (fn.special) {
            //Do whatever you want with the unevaluated args
            var result = fn(env, args);
            // log(result);
            if (result.fn) return result; //this is a lisp function
            //Don't return anything, just loop till something does (tco)..
            ast = result.ast; env = result.env || env;
          } else {
            args = args.map(function(ast) { return EVAL(ast, env); });
            // log(typeof fn);
            if (typeof fn === 'function') return fn(args); //javascript function
            ast = fn.ast;
            env = bind(fn.env, fn.params, args);
          }
        }
        //Vectors and hashmaps -> evaluate elements
        else {
          var seq = ast.map(function(ast) { return EVAL(ast, env); });
          seq.type = ast.type;
          return seq;
        }
      }
      //Symbols -> retrieve value from environment
      else if (ast.type === 'symbol') {
        var value = env[ast.toString()];
        if (typeof value === 'undefined') throw new Error("Unknown symbol " + ast);
        return value;
      }
      //numbers, booleans, keywords, strings -> return as is
      else return ast; 
    }
    //If nothing is returned, loop infinitely till something is..
  }

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util,
    bind: inNode ? require('./envUtils').bind : MAL.envUtils.bind
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.EVAL; }


//Test
function test(str) {
  var reader = require('./reader_printer');
  // var env = require('./core');

    var env = require('./envUtils').bindEnv(require('./special'), require('./core'));
  var log = require('./util').log;
    var inspect = require('./util').insp;
  log('-----------testing------------------');
  var result = MAL.EVAL(reader.read(str), env);
  log('Result: >>>>>>>>>>>>>>> ' + str);

  inspect(result);
  log(reader.print(result));
  log('                                 <result end>');
}

// test("(def! not (fn* (a) (if a false true)))");
// test('(not false)');
// test('( (fn* (& more) (count more)) 1 2 3)');
// test('(= nil nil)');
// test('(list)');
// test('(empty? (list 1))');
// test('((fn* (a b) a) 1)');
// test('(fn* (a b) a)');
// test('+');
// test('(let* (z 9) z)');
// test('(def! a 1)');
// test('a');
// var str;
// test('(+ 1 2)');
// make test^js^step0

// ;; Testing closures
// var str = "( ( (fn* (a) (fn* (b) (+ a b))) 5) 7)";
// ;=>12

// str = "(def! not (fn* (a) (if a false true)))";

// str = "(let* (a 6 b (+ a 2)) (+ a b))";
// inspect(env);
// str = '1';
// test(str);
// test('(not nil)');

// inspect(test(str));
// str = '\\"';
// str = '\\n';
// log(str);
// var re = /\\"/g;
// log(str.replace(re, '\n'));
// log(str.replace(re, '"'));



// var str = "(+ 1 2 (+ 1 1))";
function doTests() {

  // str = "( (fn* (& more) (count more)) 1 2 3)";
  str = '(str "bla")';
  str = '(str 1 "ab" 3)';
  str = '(println "\\"")';
  // str = '(str "\\"")';
  // str = '(prn)';
  test(str);

  str = '(str "\\"")';
  test(str);
// ;=>3
// ( (fn* (& more) (count more)) 1)
// ;=>1
// ( (fn* (& more) (count more)) )
// ;=>0
// ( (fn* (a & more) (count more)) 1 2 3)
// ;=>2
// ( (fn* (a & more) (count more)) 1)
// ;=>0
  // str = "(def! a 2)";

  // inspect(test(str));
  // // test(str);
  // // inspect(env);
  // str = "(+ 1 a)";
  // // log(env.a);

  // // test(str);

  // inspect(test(str));
  // str = "(def! gen-plus5 (fn* () (fn* (b) (+ 5 b))))";
  // // test(str);
  // inspect(test(str));

  // str = "(def! plus5 (gen-plus5))";
  // // test(str);
  // inspect(test(str));
  // // inspect(test(str));
  // str = "(plus5 7)";

  // // test(str);
  // inspect(test(str));

  // str = "(def! sum2 (fn* (n acc) (if (= n 0) acc (sum2 (- n 1) (+ n acc)))))";
  
  // test(str);

  // str = "(sum2 10 0)";

  // test(str);
  // inspect(test(str));
  // ;=>55

  // str = "(def! res2 nil)";
  // test(str);
  // // ;=>nil
  // str = "(def! res2 (sum2 10000 0))";
  // str = "(sum2 1000 0)";
  // test(str);


  // str = "res2";
  // test(str);
  // ;=>50005000
}

// var env = require('./envUtils').bindEnv(require('./special'), require('./core'));
// doTests();




  // // str = "(+ 1 2 )";
  // // str = "(let* (a 6 b (+ a 2)) (+ a b))";
  // str = "(def! a 6)";
  // str = "[1 (+ 1.2 2) { :bla \"bla\" (+ 1 2 (- 3 4))} ]";
// str = "(def! gen-plus5 (fn* () (fn* (b) (+ 5 b))))";
// test(str);
// inspect(test(str));

// str = "(def! plus5 (gen-plus5))";
// test(str);
// inspect(test(str));
// // inspect(test(str));
// str = "(plus5 7)";

// test(str);
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
// Object.defineProperty( String.prototype, 'prop', {
//   get: function () {  console.log('debug');
//                       inspect(this);
//                      return this._prop;
//                      // this function is the getter
//                    },
//     set: function(name) {

//                       inspect(this);
//       // inspect(name);
//       log(this + "");
//       this._prop = name;

//                       inspect(this);
//     }
// }); 

// var a = "foo";
// log(a);
// a.prop = "bar";
// log(a);
// log(a.prop);
// nil, false, true
// "bla".type = string, symbol, keyword
// [].type = list, vector, hash
// var person = 'bl';
// Object.defineProperty(person, 'fullName', {
//     get: function() {
//         return firstName + ' ' + lastName;
//     },
//     set: function(name) {
//         var words = name.split(' ');
//         this.firstName = words[0] || '';
//         this.lastName = words[1] || '';
//     }
// });
if (typeof MAL === 'undefined') MAL = {};
MAL.special = (function(env) {
  var EVAL = env.EVAL;
  var bind = env.bind;

  function special(fn) {
    fn.special = true;
    return fn;
    };

    return {
      "def!": special(function(env, args) {
        return { ast: env[args[0].toString()] = EVAL(args[1], env) };
      }),
      "let*": special(function(env, args) {
        var newEnv = Object.create(env);
        var bindings = args[0];
        while (bindings.length) {
          //TODO: check for even, symbol/value pairs..
          newEnv[bindings.shift().toString()] = EVAL(bindings.shift(), newEnv);
        }
        return { ast: args[1] || null, env: newEnv };
      }),
      "do": special(function(env, args) {
        args.slice(0, args.length-1).forEach(function(ast) {
          EVAL(ast, env);
        });
        var last = args.slice(args.length-1);
          return { ast: last[0] || null};
      }),
      "if": special(function(env, args) {
        var cond = EVAL(args[0], env);
        if (cond !== null && cond !== false) return { ast: args[1] };
        else return { ast: args[2] || null};
      }),
      "fn*": special(function(env, args) {
        var params = args[0];
        var body = args[1];
        var fn = function(expressions) {
          return EVAL(body, bind(env, params, expressions));
        };
        return {
          ast: body,
          env: env,
          fn: fn,
          params: params
        };
      })
    };

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    bind: inNode ? require('./envUtils').bind : MAL.envUtils.bind,
    EVAL: inNode ?  require('./eval') : MAL.EVAL
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.special; }
