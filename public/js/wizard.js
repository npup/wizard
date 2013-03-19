var wizard = (function () {
  var SUPPORTED = (function () {
      var result = true;
      if ("undefined" == typeof npup || "undefined" == typeof npup.dom || "undefined" == typeof npup.util) {result = false;}
      else if ("function" != typeof document.addEventListener || "function" != typeof document.querySelector) {result = false;}
      else if ("function" != typeof "".trim) {result = false;}
      return result;
    })()
    , doc = document;

  if (!SUPPORTED) {
    return {
      "create": function (elem) {
        elem.className += "wizard-no-support";
        elem.innerHTML = "WIZARD is unsupported on this agent;";
      }
    };
  }

  /**
  * View creation
  */
  function getView(name, wizard) {
    var view = wizard.views[name];
    if (!view) {
      throw new Error("no view found for name '"+name+"'");
    }
    var html = view.content
      , frag = doc.createDocumentFragment()
      , div = doc.createElement("div");
    frag.appendChild(div);
    div.innerHTML = html;
    view.dom = frag;
    return view;
  }

  var formTemplate = (function () {
    var form = doc.createElement("form")
      , header = doc.createElement("div")
      , heading = doc.createElement("h4")
      , content = doc.createElement("div")
      , footer = doc.createElement("div");
    form.className = "wizard-form";
    header.className = "wizard-header";
    header.appendChild(heading);
    content.className = "wizard-content";
    footer.className = "wizard-footer";
    var submit = doc.createElement("input");
    submit.type = "submit";
    submit.value = "Previous";
    submit.className = "wizard-submit wizard-submit-prev";
    footer.appendChild(submit);
    submit = doc.createElement("input");
    submit.type = "submit";
    submit.value = "Next";
    submit.className = "wizard-submit wizard-submit-next";
    footer.appendChild(submit);
    form.appendChild(header);
    form.appendChild(content);
    form.appendChild(footer);
    return form;
  })();

  function appendForm(wizard, view) {
    var form = formTemplate.cloneNode(true)
      , headerElem = form.querySelector(".wizard-header h4")
      , content = form.querySelector(".wizard-content");
    form.className += " wizard-view-"+view.name;
    form.action = "#"+view.name;
    headerElem.innerHTML = view.heading;
    wizard.elem.innerHTML = "";
    wizard.elem.appendChild(form);
    return {"form": form, "content": content};
  }

  function View(name, data) {
    var view = this;
    view.name = name;
    for (var prop in data) {
      view[prop] = data[prop];
    }
  }
  View.prototype = {
    "constructor": View
    , "hasNext": function () {return "function" == typeof this.next;}
    , "hasPrev": function () {return "function" == typeof this.prev;}
    , "hasURI": function () {return "string" == typeof this.content.uri;}
  };
  function prepareViews(views) {
    for (var viewName in views) {views[viewName] = new View(viewName, views[viewName]);}
    return views;
  }

  function Request(view, form) {
    var req = this;
    req.view = view;
    req.params = form ? npup.util.serialize(form, true) : {};
    req.attrs = {};
  }
  Request.prototype = {
    "constructor": Request
    , "setParams": function (params) {
      this.params = params;
    }
    , "getParameter": function (param) {
      var req = this;
      return (param in req.params) ? req.params[param] : null;
    }
    , "setAttribute": function (attr, val) {
      this.attrs[attr] = val;
    }
    , "getAttribute": function (attr) {
      var req = this;
      return (attr in req.attrs) ? req.attrs[attr] : "";
    }
  };

  function Wizard(elem, options) {
    "object" == typeof options || (options = {});
    var wizard = this;
    wizard.elem = elem;
    wizard.form = null; // retrieved anew in each view
    elem.className += " wizard-container";
    wizard.views = prepareViews(options.views);
    wizard.req = null; // a "request object", created for each view transition
    wizard.elem.addEventListener("click", function (e) {
      var elem = e.target, nodeName = elem.nodeName.toLowerCase();
      if (nodeName == "input" && elem.type == "submit") {
        elem.name = "wizard-submit";
        wizard.process(elem.form);
      }
    }, false);
  }

  function doReplacements(wizard, view) {
    var html = wizard.elem.innerHTML;
    for (var attr in wizard.req.attrs) {
      html = html.replace(new RegExp("%"+attr+"%", "g"), wizard.req.getAttribute(attr));
    }
    wizard.elem.innerHTML = html;
  }

  function update(wizard, view, nodes, callback) {
    wizard.elem.classList[view.hasNext()?"add":"remove"]("has-next");
    wizard.elem.classList[view.hasPrev()?"add":"remove"]("has-prev");
    if (view.hasURI()) {
      npup.ajax.get(view.content.uri).ok(function () {
        callback(wizard, view, nodes.form);
      }).update(nodes.content);
    }
    else {
      nodes.content.appendChild(view.dom);
      callback(wizard, view, nodes.form);
    }
  }

  function doShowView(wizard, view, callback) {
    var nodes = appendForm(wizard, view);
    "function" == typeof view.setup && view.setup.call(wizard, view);
    update(wizard, view, nodes, function (wizard, view, form) {
      wizard.req && doReplacements(wizard, view);
      wizard.currentView = view;
      callback && callback.call(wizard);  
    });
  }

  Wizard.prototype = {
    "constructor": Wizard
    , "start": function () {
      var wizard = this;
      init(wizard);
      return wizard;
    }
    , "showView": function (viewName, callback) {
      var wizard = this;
      doShowView(wizard, getView(viewName, wizard), callback);
    }
    , "process": function (form) {
      var wizard = this
        , viewName = form.getAttribute("action").replace("#", "")
        , view = wizard.currentView, forward, nextView, dir;
      if (!view) {return console.warn("got no view for %s", viewName);}
      wizard.req = new Request(view, form);
      if (dir = wizard.req.getParameter("wizard-submit")) {
        if ("Next" == dir && view.hasNext()) {forward = view.next.call(wizard, view);}
        else if (view.hasPrev()) {forward = view.prev.call(wizard, view);}
      }

      // no forward means "don't go anywhere"
      if (forward==null) {return;}
      nextView = getView(forward, wizard);
      delete wizard.currentView;
      doShowView(wizard, nextView, nextView.callback);
    }
  };

  function init(wizard) {
    wizard.elem.innerHTML = "";
    var view = getView("start", wizard);
    wizard.req = new Request(view);
    doShowView(wizard, view);
  }

  return {
    "create": function (elem, options) {
      return new Wizard(elem, options).start();
    }
  };
})();
