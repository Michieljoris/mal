var log = require('./util').log;
var inspect = require('./util').inspect;
var bind = require('./envUtils').bind;

function EVAL(ast, env) {
  var count = 0;
  while (true && count++ < 100000) {
    if (ast.type === 'seq') {
      //lists -> apply
      if (ast.seqType === 'list') {
        // log(ast);
        var fn = EVAL(ast.seq[0], env);
        // log(fn);
        var args = ast.seq.slice(1);
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
      else return { type: 'seq', seqType: ast.seqType,
                    seq: ast.seq.map(function(ast) { return EVAL(ast, env); }) };
    }
    //Symbols -> retrieve value from environment
    else if (ast.type === 'symbol') {
      if (!env[ast.value]) throw new Error("Unknown symbol " + ast.value);
      return env[ast.value];
    }
    //numbers, booleans, keywords, nil -> return as is
    else return ast || { type: 'nil', value: 'nil' };
  }
  //If nothing is returned, loop infinitely till something is..
}

module.exports = EVAL;



//Test
var reader = require('./reader_printer');

function test(str) {
  var result = EVAL(reader.read(str), env);
  log('Result: >>>>>>>>>>>>>>> ' + str);

  inspect(result);
  log(reader.print(result));
  log('                                 <result end>');
}

var str;

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

