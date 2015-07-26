var log = require('./util').log;
var inspect = require('./util').inspect;
var print = require('./reader_printer').print;

function boolean(v) {
  v = v ? 'true' : 'false';
  return { type: v, value: v };
}

module.exports =  {
  '+' : function(args) {
    return { type: 'number', value: args.map(function(arg) {
      return arg.value;
    }).reduce(function(p,n) {
      return  p + n; })
           };
  },
  '*' : function(args) { return { type: 'number',
                                  value:args[0].value * args[1].value };
                       },
  '-' : function(args) { return { type: 'number',
                                  value:args[0].value - args[1].value};
                       },
  '/' : function(args) { return { type: 'number',
                                  value:args[0].value / args[1].value};
                       },
  list: function(args) {
    return { type: 'seq', seqType: 'list', seq: args };
  },
  "list?": function(args) {
    return boolean(args[0].seqType === 'list');
  },
  "empty?": function(args) {
    return boolean(!args[0].seq.length);
  },
  "count": function(args) {
    return  { type: 'number', value: args[0].type === 'nil' ? 0 : args[0].seq.length };
  },
  "=": function(args) {
    // log('=');
    // inspect(args);
    if (args[0].type === 'seq' && args[1].type === 'seq') {
      if (args[0].seq.length !== args[1].seq.length) return boolean(false);
      else return boolean(args[0].seq.every(function(arg, i)  {
        var arg2 = args[1].seq[i];
        return module.exports['=']([arg, arg2]).type === 'true';
      }));
    }
    else return boolean(args[0].type === args[1].type && args[0].value === args[1].value);
  },
  ">": function(args) {
    return boolean(args[0].value > args[1].value);
  },
  ">=": function(args) {
    return boolean(args[0].value >= args[1].value);
  },
  "<": function(args) {
    return boolean(args[0].value < args[1].value);
  },
  "<=": function(args) {
    return boolean(args[0].value <= args[1].value);
  },

  "str": function(args) {
    var str = args.map(function(arg) {
      return arg.type === 'string' ? arg.value.slice(1, arg.value.length-1) : print(arg);
    }).join('');
    return { type: 'string', value: '"' + str + '"' };
  },


  "pr-str": function(args) {
    var str = args.map(function(arg) {
      return print(arg);
    }).join(' ');
    str = str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return { type: 'string', value: '"' + str + '"' };
  },

  "println": function(args) {
    // inspect(args);
    var result = args.map(function(arg) {
      return print(arg, 'print readably');
    }).join(' ');
    console.log(result);
    return { type: 'nil', value: 'nil' };
  },

  "prn": function(args) {
    var result = args.map(function(arg) {
      return print(arg);
    }).join(' ');
    console.log(result);
    // if (args.length) console.log('"' + str + '"');
    return { type: 'nil', value: 'nil' };
  }
};


// var a = [1,2,3,4];

// console.log(a.reduce(function(p,n) { return p + n; }));

// var r = module.exports['+'](1,2,3,4);
// console.log(r);

// var r = module.exports['+']([ {type: 'number', value: 1 } , {type: 'number', value: 2 }]);

