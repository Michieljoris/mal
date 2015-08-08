if (typeof MAL === 'undefined') MAL = {};
MAL.core = (function(env) {
  var log = env.util.log;
  var inspect = env.util.insp;
  var print = env.reader_printer.print; 
  var read = env.reader_printer.read; 
  var fs = env.fs;

  var functions =  {
    '+' : function() { var args = [].slice.call(arguments);
                       return args
                       .reduce(function(p,n) {
                         return  p + n; }); },
    '*' : function(a,b) { return a*b; },
    '-' : function(a,b) { return a-b; },
    '/' : function(a,b) { return a/b; },
    list: function() {
      var args = [].slice.call(arguments);
      args.type = 'list';
      return args;
    },
    "list?": function(l) { return l && l.type === 'list' ? true : false; },
    "empty?": function(l) { return l.length  ? false : true; },
    "count": function(l) { return l === null ? 0 : l.length; },
    "=": function(a,b) {
      // log('=');
      // inspect(args);
      if (a !== null && b !== null) {
        var type1 = a.constructor.name;
        var type2 = b.constructor.name;
        if  (type1 !== type2) return false;
        if (type1 ==='Array') {
          if (a.length !== b.length) return false;
          else return a.every(function(arg, i)  {
            var arg2 = b[i];
            return functions['='](arg, arg2);
          });
        }
        if (type1 === 'String') {
          return a.type === b.type && a + '' === b + '';
        }
      }
      return a === b; //null, numbers, true and false
    },
    ">": function(a,b) {return a > b;},
    ">=": function(a,b) {return a >= b;},
    "<": function(a,b) {return a < b;},
    "<=": function(a,b) {return a <= b;},

    "str": function() {
      var args = [].slice.call(arguments);
      var str = args.map(function(arg) {
        return (arg && arg.constructor.name === 'String') ? arg + '' : print(arg);
      }).join('');
      str = new String(str);
      str.type = 'string';
      return str;
    },

    "pr-str": function() {
      var args = [].slice.call(arguments);
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

    "println": function() {
      // inspect(args);
      var args = [].slice.call(arguments);
      var result = args.map(function(arg) {
        return print(arg, 'print readably');
      }).join(' ');
      console.log(result);
      return null;
    },

    "prn": function() {
      var args = [].slice.call(arguments);
      var result = args.map(function(arg) {
        return print(arg);
      }).join(' ');
      console.log(result);
      // if (args.length) console.log('"' + str + '"');
      return null;
    },

    slurp: function(fileName) {
      var str = fs.readFileSync(fileName + "", { encoding: 'utf8' });
      str = new String(str);
      str.type = 'string';
      return str;
    },

    'read-string': function(str) {
      return read(str);
    },

    cons: function(exp, list) {
      var result = [exp].concat(list);
      result.type = 'list';
      return result;
    },

    concat: function() {
      var args = [].slice.call(arguments);
      var result = args.reduce(function(p, n) {
        return p.concat(n);
      }, []);
      result.type = 'list';
      return result;
    }
  };
  return functions;

})((function() {
  var inNode = typeof module !== 'undefined';
  return {
    inNode: inNode,
    util: inNode ? require('./util') : MAL.util,
    reader_printer: inNode ? require('./reader_printer') : MAL.reader_printer,
    fs: inNode ? require('fs') : null
  };
})()); 

if (typeof module !== 'undefined') { module.exports = MAL.core; }



// var a = [1,2,3,4];

// console.log(a.reduce(function(p,n) { return p + n; }));

// var r = module.exports['+'](1,2,3,4);
// console.log(r);

// var r = module.exports['+']([ {type: 'number', value: 1 } , {type: 'number', value: 2 }]);

// console.log(MAL.core.concat());
