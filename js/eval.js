if (typeof MAL === 'undefined') MAL = {};
// var TESTING = true;
var TESTING = false;
var counter = 0;
  var reader = require('./reader_printer');
MAL.EVAL = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var bind = env.bind;

  function isMacroCall(env, ast) {
    var fn;
    return ast && ast.type === 'list' &&
      ast[0] && ast[0].type === 'symbol' &&
      (fn = env[ast[0].toString()]) && fn.isMacro && fn;
  }

  function macroExpand(env, ast) {
    // log('--------------------------------------------------------------------');
    var macroFn;
    while ((macroFn = isMacroCall(env, ast))) {
      // inspect(macroFn.env);
      ast = EVAL(macroFn.body, bind(macroFn.env, macroFn.params, ast.slice(1)));

    // log(reader.print(ast));
    }
    return ast;
  }
  
  function EVAL(ast, env) {
    // log('EVAL CALLED');
    // if (counter>1) return;;
    // inspect(env);
    // log(ast);
    // log('-------');
    var count = 0;
    while (true && count++ < 100000) {
    // log('AST');
    // log(reader.print(ast));
      if (ast === null) return null; //silly javascript, on object that's not an object..
      if (ast.constructor.name === 'Array') {
        //lists -> apply
        if (ast.type === 'list') {
          ast = macroExpand(env, ast);
          if (!ast || ast.constructor.name !== 'Array' || ast.type !== 'list') return ast;
          // log(ast);
          var fn = EVAL(ast[0], env);
          // log(fn);
          var args = ast.slice(1);
          if (fn.special) {
            //Do whatever you want with the unevaluated args
            var result = fn(env, args);
            // log(result);
            if (result.body) return result; //this is a lisp function
            if (!result.tco) return result.ast;
            //Don't return anything, just loop till something does (tco)..
            ast = result.ast; env = result.env || env;
          } else {
            args = args.map(function(ast) { return EVAL(ast, env); });
            // log(args);
            // log(typeof fn);
            if (typeof fn === 'function') {
              var r =  fn.apply(null, args); //javascript function
              // inspect(r);
              return r;
            }
            //Loop and eval the body of the mal fn with env set to the env the
            //function was defined in and its params bind to the passed in args
            ast = fn.body;
            env = bind(Object.create(fn.env), fn.params, args);
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

  EVAL.macroExpand = macroExpand;
  return EVAL;

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
function test() {
  var log = require('./util').log;
  var inspect = require('./util').insp;

  var env = require('./envUtils').bindEnv(require('./special'), require('./core'));

  env.eval = function(ast) {
    return MAL.EVAL(ast, env);
  };

  var reader = require('./reader_printer');
  // var env = require('./core');

  function rep(str) {
    log('-----------testing------------------');
    var result = MAL.EVAL(reader.read(str), env);
    log('Result of: ' + str);

    // inspect(result);
    log(reader.print(result));
    log('                                 <result end>');
  }
  // rep('(+ 1 2)');
  // rep('( (fn* (& more) (count more)) 1 2 3)');


  var threadMacro = 
    [
      " (defmacro! -> ",
      "   (fn* (x & xs) ",
      "    (if (empty? xs) ",
      "    x ",
      "    (let* (form (first xs) ",
      "           more (rest xs)) ",
      "      (if (empty? more) ",
      "        (if (list? form) ",
      "          `(~(first form) ~x ~@(rest form)) ",
      "          (list form x)) ",
      "        `(-> (-> ~x ~form) ~@more)))))) ",
    ].join('\n');

  // rep('(quasiquote (+ (splice-unquote  (list 2 3 4))))');
  // rep('(macroexpand (-> 7))');

  // rep('(macroexpand (-> (list 7 8 9) first))');
  // rep('(def! f (fn* (b) (let* (a b) a)))');
  // rep('(f 4)');
  // rep('(f 4)');

  rep(threadMacro);
  rep('(-> (list 7 8 9) first)');
  rep('(-> (list 7 8 9) first)');

  // rep(threadMacro);

  // rep('(macroexpand (-> (list 7 8 9) (first)))');

  // rep('(macroexpand (-> (list 7 8 9) rest rest))');
  // rep('(macroexpand (-> (list 7 8 9) rest rest))');

  rep('(macroexpand (-> 1 (+ 2) (+ 3)))');

  rep('(-> (list 7 8 9) rest (rest) first (+ 7))');

// (-> 7)
// ;=>7
// (-> (list 7 8 9) first)
// ;=>7
// (-> (list 7 8 9) (first))
// ;=>7
// (-> (list 7 8 9) first (+ 7))
// ;=>14
// (-> (list 7 8 9) rest (rest) first (+ 7))
// ;=>16

  // rep('(rest [19 20 2])');

  // (rest [])
  // ;=>()
  // (rest [10])
  // ;=>()
  // (rest [10 11 12])
  // ;=>(11 12)
  // rep('(if true false)');
  // rep('(if true false false)');
  // rep('(read-string "(1 2 (3 4) nil)")');
  // rep("(def! load-file (fn* (f) (read-string (str \"(do \" (slurp f) \")\"))))");
  // rep('(def! load-file (fn* (f) (str "(do " (slurp f) ")")))');
  // rep("(def! load-file (fn* (f) (slurp f) ))");
  // rep("(def! load-file (fn* (f) (eval (read-string (str \"(do \" (slurp f) \")\")))))");
  // rep('(load-file "../tests/incB.mal")');
  // rep('(quasiquote 1)');
  // rep('(quasiquote (1 2 3))');
  // rep('(def! lst (quote (2 3)))');
  // rep('(quasiquote (1 (splice-unquote lst) 3))');

  // rep('(def! a 1)');
  // rep('(quasiquote (1 ~a 3))');
  // rep('(cons 1 [2 3])');
  // rep('(def! a [1 2])');
  // rep('(concat [1] a (list 4 5))');
  // rep('a');
  // rep('(let* (a 2) (eval (+ a 2)))');
  // rep('(eval (+ a 2))');
  // rep('"bla"');
  // rep('(inc5 4)');
  // rep('(str "(do" )');
  // rep('(def! ok (list + 2 2))');
  // rep('ok');

  // rep('(eval ok)');
}

if (TESTING) test();
// test("(def! not (fn* (a) (if a false true)))");
// test('(not false)');
// test('(= (list 1 2) [1 2])');
// test('(str "abc")');
// test('(let* (a (list + 2 2)) a)');
// tes

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
