var util = require('util');
var debug;
// debug = true;
function inspect(obj) {
  if (debug) console.log(util.inspect(obj, { depth:20, colors: true }));
}

function log() {
  if (debug) console.log.apply(console, arguments);
}

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
  return type ? { type: 'seq', seqType: type, seq: [] } : false;
}

function isSeqClosing(seq, token) {
  if (~closingTokens.indexOf(token)) {
    if (closingTokensMap[seq.seqType] !== token) throw "Unexpected \"" + token + "\"";
    return true;
  }
  return false;
}

function readAtom(token) {
  return { type: 'atom', atom: token };
}

function readExp(tokens) {
  var error;
  var stack = [];
  var current = { seq: [] };
  do {
    var t = tokens.shift();
    var seq = isSeqOpening(t);
    var readerMacro = readerMacros[t];
    if (readerMacro) {
      readerMacro = { type: 'seq', seqType: 'list', seq: [readAtom(readerMacro)]};
      if (t === '^') {
        var meta = readExp(tokens);
        tokens = meta.tokens;
      }
      var exp = readExp(tokens);
      readerMacro.seq.push(exp.exp);
      if (meta) readerMacro.seq.push(meta.exp);
      tokens = exp.tokens;
      current.seq.push(readerMacro);
    }
    else if (seq)  {
      current.seq.push(seq);
      stack.push(current);
      current = seq;
    }
    else if (isSeqClosing(current, t)) {
      current = stack.pop();
    }
    else {
      current.seq.push(readAtom(t));
    }
  } while (tokens.length && stack.length);

  if (stack.length) {
    var last = stack.pop();
    if (!stack.length) last = last.seq[0];
    throw last.type + ' is missing closing \"' + closingTokensMap[last.seqType] + '\"';
  }
  return { exp: current.seq[0], tokens: tokens };
}

function printAtom(atom) {
  return atom.atom;
}

function printSeq(seq) {
  var str = seq.seq.map(printExp).join(' ');
  return openingTokensMap[seq.seqType] + str + closingTokensMap[seq.seqType];
}

var print = {
  atom: printAtom,
  seq: printSeq
};

function printExp(exp) {
  return print[exp.type](exp);
}

module.exports =  {
  print: printExp,
  read: function(str) {
    var tokens = tokenize(str);
    var result = readExp(tokens);
    if (!result.error && result.tokens.length ) {
      result.error = "Surplus tokens";
    }
    return result;
  }
};

function test(str) {
  var exp = module.exports.read(str);
  log('In test, exp is:');
  inspect(exp);
  log(printExp(exp.exp));
  log(str);
}

// ;; Testing read of ^/metadata
// ^{"a" 1} [1 2 3]
// ;=>(with-meta [1 2 3] {"a" 1})

// test('(1 2, 3,,,,),,');
// test('nil');
// test("(a b c )");
// test("'(a c  '(d e)  'f g)");

// test('^{"a" 1} [1 2 3] ');
// test('^{"a" 1} [1 2 3]');
test('(+ 1 (+   2 3))');
// test("'abc");

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
