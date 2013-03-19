/*
*	No requirements
*/
npup.dom = (function () {
	"use strict";
	var doc = document;
	
	function findFirstVisibleForm() {
		return findFirstVisibleElement(doc.forms);
	}
	function findFirstVisibleElementInForm(form) {
		return findFirstVisibleElement(form.elements);
	}
	function findFirstVisibleElement(elems) {
		var idx, len, elem;
		for (idx=0, len = elems.length; idx<len; ++idx) {
			if (isVisible(elem = elems[idx])) {return elem;}
		}
		return null;
	}
	function isVisible(elem) {
		return !elem.style.display || elem.style.display != "none";
	}
	var toArray = (function () {
		try {
			([]).slice.call(document.childNodes);
			return function (nodeList) {
				if (!nodeList || typeof nodeList.length=="undefined") {throw new Error("Cannot create array from "+nodeList);}
				return ([]).slice.call(nodeList);
			};
		}
		catch(err) {
			return function (nodeList) {
				if (!nodeList || typeof nodeList.length=="undefined") {throw new Error("Cannot create array from "+nodeList);}
				var idx, len, arr = Array(len);
				while (len--) {arr[len] = nodeList[len];}
				return arr;
			};
		}
	})();
	
	var SUPPORTS_CLASSLIST = (function () {
	    return (typeof document.createElement("a").classList == "object");
	})();
	
	var hasClassName = SUPPORTS_CLASSLIST ? function (elem, name) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		return elem.classList.contains(name);
	} : function (elem, name) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		var regexp = new RegExp("(^|\\s)"+name+"(\\s|$)");
		return regexp.test(elem.className);
	};
	
	var addClassName = SUPPORTS_CLASSLIST ? function (elem, className) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		elem.classList.add(className);
	} : function (elem, className) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		if (this.hasClassName(elem, className)) {return;}
		elem.className += elem.className.length===0 ? className : " "+className;
	};
	
	var removeClassName = SUPPORTS_CLASSLIST ? function (elem, className) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		elem.classList.remove(className);
	} : function (elem, className) {
		if (!elem || elem.nodeType!==1) {throw Error("elem is not a DOM element node: "+elem);}
		elem.className = elem.className.replace(new RegExp("(^|\\s)"+className+"(\\s|$)"), "");
	};
	
	
	return {
	  "byId": function (id) {
				var elem = doc.getElementById(id);
				if (elem && elem.getAttribute("id")!==id) {elem = null;} // Found it via name or some other stupid bug
				return elem;
		}
		, "byClassName": function (name, tagName, container) {
				if (/[\s.]/.test(name)) {throw new Error("Illegal class name");}
				tagName = (tagName ? tagName.toUpperCase() : "*");
				container || (container = document);
				var result = []
			  	, elems = container.getElementsByTagName(tagName)
			  	, elem, idx = 0;
				var r = new RegExp("(^|\\s)"+name+"(\\s|$)");
				for (;elem=elems[idx]; ++idx) {
					r.test(elem.className) && (result.push(elem));
				}
				return result;
		}
	  , "qs": function (expr, base) {
	      if (typeof doc.querySelector=="function") {
	        this.qs = function (expr, base) {base = base || doc; return base.querySelector(expr);};
	      }
	      else {this.qs = function () {throw Error("No querySelector support");};}
	      return this.qs(expr, base);
	  }
	  , "qsa": function (expr, base) {
	      if (typeof doc.querySelectorAll=="function") {
	        this.qsa = function (expr, base) {base = base || doc; return base.querySelectorAll(expr);};
	      }
	     else {this.qsa = function () {throw Error("No querySelectorAll support");};}
	     return this.qsa(expr, base);
	  }
	  , "tagUp": function (base, tagName) {
	      var node = base.parentNode;
		  	tagName = tagName.toLowerCase();
	      while (node && node.nodeName.toLowerCase()!=tagName) {node = node.parentNode;}
	      return node && node.nodeName.toLowerCase()==tagName ? node : null;
	  }
	  , "tagNext": function (base, tagName) {
		  var node = base.nextSibling;
		  tagName = tagName.toLowerCase();
		  while(node && node.nodeName.toLowerCase()!=tagName) {node = node.nextSibling;}
		  return node && node.nodeName.toLowerCase()==tagName ? node : null;
	  }
	  , "tagPrev": function (base, tagName) {
		  var node = base.previousSibling;
		  tagName = tagName.toLowerCase();
		  while(node && node.nodeName.toLowerCase()!=tagName) {node = node.previousSibling;}
		  return node && node.nodeName.toLowerCase()==tagName ? node : null;
		}
		, "hasClassName": hasClassName
		, "addClassName": addClassName
	  , "removeClassName": removeClassName
		, "toggleClassName": function (elem, className) {
			if (this.hasClassName(elem, className)) {this.removeClassName(elem, className);}
			else {this.addClassName(elem, className);}
		}
		, "focusFirstElem": function (form) {
			  form || (form = findFirstVisibleForm());
				form && form.elements[0].focus();
		}
		, "selectFirstElem": function (form) {
				form || (form = findFirstVisibleForm());
				form && form.elements[0].select();
		}
		, "toArray": toArray
	};
})();
