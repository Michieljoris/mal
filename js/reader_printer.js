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
      if (typeof ast === 'function') {
        return '[JS-Fn]';
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
  module.exports = MAL.reader_printer;
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
