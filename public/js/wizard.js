/* Prerequisites:
*   npup.util, npup.dom, npup.ajax
*   querySelector, addEventListener, String#trim
*   more ?
*/
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

  // Useful entities
  var Char = {
    "CROSS": "&#x2717;"
  };

  var Key = {
    "ESC": 27
    , "ENTER": 13
  };

  /**
  * View creation
  */
  function getView(viewName, wizard) {
    var view = wizard.views[viewName];
    if (!view) {
      throw new Error("no view found for name '"+viewName+"'");
    }
    var html = view.html
      , frag = doc.createDocumentFragment()
      , div = doc.createElement("div");
    frag.appendChild(div);
    div.innerHTML = html;
    view.dom = frag;
    return view;
  }

  var formTemplate = (function () { // TODO: i18n
    var form = doc.createElement("form");
    form.className = "wizard-form";
    form.innerHTML = [
      "<div class=wizard-header>"
      , "  <h4></h4>"
      , "</div>"
      , "<div class=wizard-content></div>"
      , "<div class=wizard-footer>" // Note white space between these elements is significant:
      , "<input class='wizard-submit wizard-submit-prev' data-dir=backward value=Previous type=submit>"
      , "<input class='wizard-submit wizard-submit-next' data-dir=forward value=Next type=submit>"
      , "</div>"
    ].join("");
    return form;
  })();

  function appendForm(wizard, view) {
    var form = formTemplate.cloneNode(true)
      , headerElem = form.querySelector(".wizard-header h4")
      , content = form.querySelector(".wizard-content");
    form.className += " wizard-view-"+view.name;
    form.action = "#"+view.name;
    headerElem.innerHTML = view.heading;
    return {"form": form, "content": content};
  }

  var forward = (function () {
    function Forward(name, callback, dir) {
      var forward = this;
      forward.name = name;
      forward.callback = callback;
      forward.dir = dir;
    }
    Forward.prototype = {
      "constructor": Forward
      , "hasCallback": function () {
        return "function" == typeof this.callback;
      }
    };
    function create(name, callback, dir) {
      "function" == typeof callback || (callback = null);
      "string" == typeof dir || (dir = "forward");
      return new Forward(name, callback, dir);
    }
    return {
      "create": create
      , "NULL": create(null)
    };
  })();

  function View(name, data) {
    var view = this;
    view.name = name;
    for (var prop in data) {
      view[prop] = data[prop];
    }
    "object" == typeof view.buttonActions || (view.buttonActions = {});
  }
  View.prototype = {
    "constructor": View
    , "hasNext": function () {return "function" == typeof this.next;}
    , "hasPrev": function () {return "function" == typeof this.prev;}
    , "hasURI": function () {return "string" == typeof this.uri;}
    , "hasButtonAction": function (action) {return "function" == typeof this.buttonActions[action];}
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

  var systemActions = {
    "hide-msg": function (wizard, e, elem) {
      wizard.hideMsg();
    }
  };

  function Wizard(elem, options) {
    "object" == typeof options || (options = {});
    var wizard = this;
    wizard.elem = elem;
    wizard.clipper = doc.createElement("div")
    wizard.clipper.className = "wizard-forms-clipper";
    wizard.elem2 = document.createElement("div");
    wizard.elem2.className = "wizard-forms-wrapper";
    wizard.msgContainer = doc.createElement("div");
    wizard.msgContainer.setAttribute("tabindex", "0");
    wizard.msgContainer.className = "msg-container";
    wizard.elem.appendChild(wizard.msgContainer);
    wizard.fog = doc.createElement("div");
    wizard.fog.className = "fog";
    wizard.elem.appendChild(wizard.fog);
    wizard.clipper.appendChild(wizard.elem2);
    wizard.elem.appendChild(wizard.clipper);
    wizard.options = options;
    wizard.form = null; // retrieved anew in each view
    elem.className += " wizard-container";
    wizard.views = prepareViews(options.views);
    wizard.req = null; // a "request object", created for each view transition

    wizard.elem.addEventListener("click", function (e) {
      var elem = e.target, nodeName = elem.nodeName.toLowerCase(), action;
      if (nodeName == "button") {
        action = elem.getAttribute("data-action");
        if (action in systemActions) {systemActions[action].call(wizard, wizard, e, elem);}
        else if (wizard.currentView.hasButtonAction(action))  {wizard.currentView.buttonActions[action].call(wizard, wizard, e, elem);}
        else {console.warn("unhandled action: %s (clicked button %s)", action, elem.outerHTML);}
        return;
      }
      if (nodeName == "input" && elem.type == "submit") {
        elem.name = "wizard-submit";
        elem.value = elem.getAttribute("data-dir");
        e.preventDefault();
        wizard.process(elem.form);
      }
    }, false);
    wizard.elem.addEventListener("keypress", function (e) {
      var target = e.target, nodeName = target.nodeName.toLowerCase()
        , keyCode = e.keyCode;
      if (Key.ESC == keyCode) {
        var msgContainer = getMessageContainer(wizard, true);
        msgContainer && wizard.hideMsg();
        return;
      }
      if (target.type != "submit" && nodeName == "input" && Key.ENTER == keyCode) {
        // find appropriate submit button
        var submit = wizard.elem.parentNode.querySelector(".has-next input.wizard-submit-next");
        submit || (submit = wizard.elem.parentNode.querySelector(".has-prev input.wizard-submit-prev"));
        if (submit) {
          submit.name = "wizard-submit";
          submit.value = submit.getAttribute("data-dir");
        }

        wizard.process(target.form);
        e.preventDefault();
      }
    }, false);
  }

  function doReplacements(wizard, view, dir) {
    var forms = wizard.elem2.querySelectorAll("form");
    var form = forms["backward"==dir?0:forms.length-1];

    var html = form.outerHTML;
    for (var attr in wizard.req.attrs) {
      html = html.replace(new RegExp("%"+attr+"%", "g"), wizard.req.getAttribute(attr));
    }
    form.outerHTML = html;
  }

  function update(wizard, view, nodes, callback) {
    nodes.form.classList[view.hasNext()?"add":"remove"]("has-next");
    nodes.form.classList[view.hasPrev()?"add":"remove"]("has-prev");
    if (view.hasURI()) {
      npup.ajax.get(view.uri).ok(function () {
        callback(wizard, view, nodes.form);
      }).update(nodes.content);
    }
    else {
      nodes.content.appendChild(view.dom);
      callback(wizard, view, nodes.form);
    }
  }

  function doShowView(wizard, view, dir, callback) {
    var nodes = appendForm(wizard, view), setupValue;
    if (dir == "backward") {
      wizard.elem2.insertBefore(nodes.form, wizard.elem2.querySelector("form"));
      wizard.elem2.className += " slide-back";
    }
    else {
      wizard.elem2.appendChild(nodes.form);
    }
    if (wizard.elem2.querySelectorAll("form").length > 1) {
      setTimeout(function () {
        wizard.elem2.className += " slide";
      }, 10);
    }

    "function" == typeof view.setup && (setupValue = view.setup.call(wizard, view));
    wizard.hideMsg();
    update(wizard, view, nodes, function (wizard, view, form) {

      var forms = wizard.elem2.querySelectorAll("form");
      if (forms.length > 1) {

        setTimeout(function () {
          // NOW, remove previous form and slide-class
          if ("backward"==dir) {
            wizard.elem2.removeChild(wizard.elem2.querySelectorAll("form")[1]);
          }
          else {
            wizard.elem2.removeChild(forms[0]);
          }
          wizard.elem2.className = wizard.elem2.className.replace(/slide\-back/, "");
          wizard.elem2.className = wizard.elem2.className.replace(/slide/, "");
        }, 410);
      }

      wizard.req && doReplacements(wizard, view, dir);
      wizard.currentView = view;
      callback && callback.call(wizard);
      if ("string" == typeof setupValue) {
        wizard.focusElem(setupValue);
      }
      else if ("function" == typeof setupValue) {
        setupValue.call(wizard, view);
      }


    });
  }

  Wizard.prototype = {
    "constructor": Wizard
    , "start": function () {
      var wizard = this;
      init(wizard);
      return wizard;
    }
    , "process": function (form, msg) {
      var wizard = this
        , viewName = form.getAttribute("action").replace("#", "")
        , view = wizard.currentView, forward, nextView, dir;
      if (!view) {return console.warn("got no view for %s", viewName);}
      wizard.req = new Request(view, form);
      if (dir = wizard.req.getParameter("wizard-submit")) {
        if ("forward" == dir && view.hasNext()) {forward = view.next.call(wizard, view);}
        else if (view.hasPrev()) {forward = view.prev.call(wizard, view);}
      }

      // TODO: maybe not provide this service
      "string" == typeof forward && (forward = forward.create(forward));

      // no forward means "don't go anywhere". Perform callback (if any) though.
      if (forward==null || forward.name==null) {
        return (forward ==null || !forward.hasCallback()) ? void 0 : forward.callback.call(wizard, view);
      }
      nextView = getView(forward.name, wizard);
      delete wizard.currentView;

      if ("backward" == forward.dir) {
        dir = forward.dir;
      }
      doShowView(wizard, nextView, dir, forward.callback);
    }
    , "showMsg": function (msg, options) { // TODO: i18n, more options
      options || (options = {"fade": false, "type": "normal"});
      var wizard = this
        , msgContainer = getMessageContainer(wizard)
        , fade = !!options.fade, modal = !!options.modal;

      // cancel any running timer
      cancelMsgTimer(wizard);
      msgContainer.innerHTML = msg;
      msgContainer.className = "msg-container visible "+(modal?" modal":"");

      fade || (function (container) { // if not autofade, insert close button
        var button = doc.createElement("button");
        button.type = "button";
        button.className = "hide-msg";
        button.setAttribute("data-action", "hide-msg");
        button.innerHTML = Char.CROSS;
        button.title = "Stäng";
        container.appendChild(button);
      })(msgContainer);
      msgContainer.focus(); // TODO: focus something more appropriate?
      fade && wizard.fadeMsg();
    }
    , "hideMsg": function () {
      var wizard = this
        , msgContainer = getMessageContainer(wizard, true);
      if (!msgContainer) {return;}
      msgContainer.className = "msg-container"; // resets any adjusting styles from extra classes
      msgContainer.innerHTML = "";
      cancelMsgTimer(wizard);
    }
    , "fadeMsg": function () {
      var wizard = this,
        msgContainer = getMessageContainer(wizard, true);
      if (!msgContainer) {return;}
      // immediately get rid of any modal fog applied
      msgContainer.className = msgContainer.className.replace("modal", "");
      msgContainer.className += " fade";
      wizard.showMsg._timer = setTimeout(function () {
        wizard.hideMsg();
      }, 6000); // delay + time for fade
    }
    , "focusElem": function (name) {
      var wizard = this
        , forms = wizard.elem2.querySelectorAll(".wizard-form")
        , candidate = forms[forms.length-1].elements[name];
      if (!candidate) {return;}
      if ("nodeType" in candidate) {candidate.focus();}
      else {candidate[0].focus();}
    }
    , "forward": function (name, callback, dir) {
      return forward.create(name, callback, dir);
    }
  };

  function cancelMsgTimer(wizard) {
    wizard.showMsg._timer && (wizard.showMsg._timer = clearTimeout(wizard.showMsg._timer));
  }

  function getMessageContainer(wizard, onlyIfVisible) {
    var container = wizard.msgContainer;
    if (onlyIfVisible) {
      return container.className.indexOf("visible") > -1 ? container : void 0;  
    }
    return container;
  }

  function init(wizard) {
    wizard.elem2.innerHTML = "";
    var view = getView("start", wizard);
    wizard.req = new Request(view);
    doShowView(wizard, view);
  }

  return {
    "create": function (elem, options) {
      return new Wizard(elem, options).start();
    }
    , "view": function (heading, data) {
      var view = {
        "heading": heading
      };
      if ("string" == typeof data.uri) {view.uri = data.uri;}
      else if ("string" == typeof data.html) {view.html = data.html;}
      if ("function" == typeof data.setup) {view.setup = data.setup;}
      if ("function" == typeof data.prev) {view.prev = data.prev;}
      if ("function" == typeof data.next) {view.next = data.next;}
      if ("object" == typeof data.buttonActions) {view.buttonActions = data.buttonActions;}
      return view;
    }
  };
})();
