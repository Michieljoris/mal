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

