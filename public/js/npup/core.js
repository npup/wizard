// Set up basic namespace and bootstrap namespacing functionality
var npup;
if (!npup) {npup = {};}


// Namespace utility
npup.ns = (function () {
  "use strict";
  var nonBlank = /\S+/;
  return function(path) {
    if (typeof path != "string") {throw Error("Namespace path must be a non-empty string (was "+({}).toString.call(path)+" "+path+")");}
    var parts = path.split("."), len, idx, leaf, context = window, root = parts[0], UNDEFINED = void 0;
    if (!nonBlank.test(root)) {throw Error("Namespace root must not be a blank/empty string (was '"+root+"')");}
    for (idx=0, len=parts.length; idx<len; ++idx) {
      leaf = parts[idx];
      if (context[leaf]==UNDEFINED) {context[leaf] = {};}
      else if (({}).toString.call(context[leaf])!="[object Object]") {
        throw Error("Could not overwrite existing non-object prop "+parts.slice(0, idx+1).join(".")+" (was ["+context[leaf]+"])");
      }
      context = context[leaf];
    }
    return context;
  };
})();


/* Polyfills, extending natives */
if (typeof String.prototype.trim!="function") {
  String.prototype.trim = function() {return this.replace(/^\s+/, "").replace(/\s+$/, "");};
}

if (typeof Function.prototype.bind!="function") {
  Function.prototype.bind = function (ctx) {
    var that = this
      , outerArgs = arguments.length>1 ? ([]).slice.call(arguments, 1) : [];
    return function () {
      return that.apply(ctx, outerArgs.concat(([]).slice.call(arguments)));
    };
  };
} 
