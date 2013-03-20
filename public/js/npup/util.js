/*
*	Requires npup.dom
*/
npup.util = (function () {
  "use strict";
	var win = window, doc = win.document, loc = win.location;

  function getType(o) {
    if (o==null) {return o===null ? "[object Null]" : "[object Undefined]";}// IE 6-7-8 returns [object Object], Opera returns [object Window] (!)
    var type = ({}).toString.call(o);
    if (type==="[object Number]" && isNaN(o)) {return "[object NaN]";} // paving for NaN
    return type;
  }
	var isArray = (function () {
		if (getType(Array.isArray)=="[object Function]") {
			return Array.isArray;
		}
		else {
			return function (o) {return getType(o)=="[object Array]";};
		}
	})();

  function merge(base, target, override) {
    var baseType = getType(base), targetType = getType(target);
    if (baseType!="[object Object]" || targetType!=baseType) {
      throw new Error("Wrong argument types ("+baseType+", "+targetType+")");
    }
    for (var p in base) {
      if (base.hasOwnProperty(p)) {
        (override || !target.hasOwnProperty(p)) && (target[p] = base[p]);
      }
    }
    return target;
  }

  function clone(o) {return merge(o, {}, true);}

	var queryString = (function () {
		
		var fromQueryString = (function () {
			return function (qs) {
				qs = qs.replace(/^\?(.+)$/, "$1");
				var entries = qs.split(/\&/), result = {};
				for (var idx=0, len = entries.length; idx<len; ++idx) {
					var entry = entries[idx].split(/=/), key = entry[0], value = entry[1];
					(typeof value=="undefined") && (value = "");
					var existing = result[key];
					if (typeof existing != "undefined") {
						({}.toString.call(existing) == "[object Array]") || (existing = [existing]);
						existing.push(value);
						value = existing;
					}
					result[key] = value;
				}
				return result;
			};
		})();
		
		var toQueryString = (function () {
	    var getLegalType = (function () { // Data on types (generally) legal for nesting
	      var legalNestings = {
	        "[object String]": "string"
	        , "[object Number]": "number"
	        , "[object Array]": "array"
	        , "[object Undefined]": "undefined"
	        , "[object Null]": "null"
	        , "[object Boolean]": "boolean"
	        , "[object NaN]": false
	      };
	      return function (value) {return legalNestings[getType(value)];};
	    })();
	    return function toQueryString(o) {
	      if (o==null) {return "";}
	      var pairs = [], value, multiple, type = ({}).toString.call(o)
	        , arrayPassed = (type=="[object Array]"), numberPassed = (!arrayPassed && getLegalType(o)==="number");
	      if (numberPassed || type=="[object String]") {return encodeURIComponent(o);}
	      if (!(type=="[object Object]" || arrayPassed)) {throw new Error("Not an object: "+o);}
	      for (var key in o) {
	        if (!(o.hasOwnProperty(key))) {continue;}
	        key = encodeURIComponent(key);
	        value = o[key];
	        type = getLegalType(value);
	        if (!type) {throw new Error("Illegal value: "+value);}
	        else if (type=="array") {
	          if (arrayPassed) {throw new Error("Illegal array in array: "+value);}
	          multiple = [];
	          for (var idx=0, val, len=value.length; idx<len; ++idx) {
	            val = value[idx];
	            type = getLegalType(val);
	            if (!type || type=="array") {throw new Error("Illegal object in array: "+val);}
	            multiple.push(key+((val==null)?"":("="+encodeURIComponent(val))));
	          }
	          pairs = pairs.concat(multiple);
	          continue;
	        }
	        else {
	          if (arrayPassed) {
	            key = encodeURIComponent(value);
	            value = null;
	          }
	          pairs.push((value==null) ? key : key+"="+encodeURIComponent(value));
	        }
	      }
	      return pairs.join("&");
	    };
	  })();
	
		return {
			"from": fromQueryString
			, "to": toQueryString
		}
	})();

	var serialize = (function () {
		function putValue(object, name, value) {
			if (name) {
		  	if (name in object) {
					if (!isArray(object[name])) {object[name] = [object[name]];}
					object[name].push(value);
				}
				else {object[name] = value;}
			}
		}
		function getRadioValuesByName(form) {
			var result = {}, inputs = form.getElementsByTagName("input"), item, idx, len;
			for (idx=0, len=inputs.length; idx<len; ++idx) {
				item = inputs[idx];
				if (!(item.name in result) && item.type.toLowerCase()=="radio" && item.checked) {
					result[item.name] = {value: item.value, item: item};
				}
			}
			return result;
		}
		return function (form, json) {
			if (typeof form=="string") {form = npup.dom.byId(form);}
			if (!form) {return null;}
			json = !!json;
			var data = {}, items = npup.dom.toArray(form.elements), radios = getRadioValuesByName(form)
				, idx, len, item, tag, type, name, value
				, options, option, optionsIdx, optionsLength;
			var radiosHandled = {};
			for (idx=0, len=items.length; idx<len; ++idx) {
				item = items[idx];
				tag = item.nodeName.toUpperCase();
				type = item.type.toUpperCase();
				name = item.name;
				switch (tag) {
					case "BUTTON":
						switch (type) {
							case "BUTTON":
								putValue(data, name, item.value);
						}
					break;
					case "INPUT":
						switch (type) {
							case "TEXT":
							case "NUMBER":
							case "HIDDEN":
							case "PASSWORD":
							case "SUBMIT":
							case "CANCEL":
							case "BUTTON":
								putValue(data, name, item.value);
							break;
							case "RADIO":
								var radioValue;
								if (radios[name] && !radiosHandled[name]) {
									putValue(data, name, radios[name].value);
									radiosHandled[name] = true;
								}
							break;
							default:
								throw new Error("unhandled type of form element tag: "+tag+" ("+type+")");
							break;
						}
					break;
					case "SELECT":
						switch (type) {
							case "SELECT-ONE":
								putValue(data, name, item.options[item.selectedIndex].value);
							break;
							case "SELECT-MULTIPLE":
								if (item.selectedIndex>-1) {
									options = npup.dom.toArray(item.options);
									for (optionsIdx=item.selectedIndex, optionsLength=options.length; optionsIdx<optionsLength; ++optionsIdx) {
										option = options[optionsIdx];
										option.selected && putValue(data, name, option.value);
									}
								}
							break;
							default:
								console.error("unhandled type of form element tag: "+tag+" ("+type+")");
							break;
						}
					break;
					default:
						throw new Error("unhandled form element tag: "+tag+" ("+type+") - "+item.outerHTML);
					break;
				}
			}
			return json ? data : queryString.to(data);
		};
	})();
	
	function each(arr, cb, ctx) {
		ctx = ctx || win;
		for (var idx=0, len=arr.length; idx<len; ++idx) {
			cb.apply(ctx, [arr[idx], idx]);
		}
	}
	
	function getUnresolvedHref(elem) {
		var href = elem.getAttribute("href");
		// fix "href" for those that return resolved url :(
		var cruft = [loc.protocol+"//", loc.host, loc.pathname].join("");
		return href.replace(cruft, "");
	}
	
	
	var hash = (function (delimChar) {
		delimChar || (delimChar = "&");
		var obj , delim = new RegExp(delimChar+"+");
		
		function values(str) {
			str || (str = location.hash.substring(1));
			var keys = str.split(delim), entry;
			obj = {};
			for (var idx=0, len=keys.length; idx<len; ++idx) {
				if (!keys[idx].length) {continue;}
				entry = keys[idx].split("=");
				obj[entry[0]] = (typeof entry[1]=="undefined") ? "" : decodeURIComponent(entry[1]);
			}
			return obj;
		}
				
		function get(key) {return values()[key];}
		
		function set(key, value, clear) {
			var props = {};
			if (typeof key == "string") {props[key] = value;}
			else {
				props = arguments[0];
				clear = arguments[1];
			}
			obj = (clear === true) ? {} : values();
			for (key in props) {obj[key] = props[key];}
			updateHash(obj);
		}
				
		function clear() {
			updateHash({});
		}
		
		function toString(o) {
			o || (o = values());
			var entries = [], entry;
			for (var key in o) {
				if (typeof o[key] == "undefined") {
					entry = key;
				}
				else {
					entry = [key, encodeURIComponent(o[key])].join("=");
				}
				entries.push(entry);
			}
			return entries.join(delimChar);
		}
		function updateHash(o) {
			location.hash = toString(o);
		}
		
		return {
			"values": values
			, "toString": toString
			, "get": get
			, "set": set
			, "clear": clear
		};
	})();
	
		
  return {
    "queryString": queryString
    , "getType": getType
		, "isArray": isArray
    , "merge": merge
    , "clone": clone
		, "serialize": serialize
		, "each": each
		, "getUnresolvedHref": getUnresolvedHref
		, "hash": hash
  };
})();
