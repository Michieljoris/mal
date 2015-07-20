var unboundSlice = Array.prototype.slice;
var slice = Function.prototype.call.bind(unboundSlice);

module.exports =  {
  '+' : function(args) { 
    return { type: 'number',
             value: args.reduce(function(p,n) { return p + n; }) };
  },

  '*' : function(args) { 
    return { type: 'number',
             value:args[0] * args[1]
             // value: args.reduce(function(p,n) { return p * n; })
           };
  },
  '-' : function(args) { 
    return { type: 'number',
             value:args[0] - args[1]
           };
  },
  '/' : function(args) { 
    return { type: 'number',
             value:args[0] / args[1]
           };
  }
};


// var a = [1,2,3,4];

// console.log(a.reduce(function(p,n) { return p + n; }));

// var r = module.exports['+'](1,2,3,4);
// console.log(r);
