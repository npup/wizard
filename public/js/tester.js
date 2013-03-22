var tester = (function () {

  var tester
    , data = {};

  function create(elem) {
    return tester = wizard.create(elem, {
      "views": {

        "start": wizard.view("The New Start Of Something Good %apa%", {
          "uri": "wizard-step/1"
          , "setup": function () {
            var wizard = this;
            wizard.req.setAttribute("apa", "hee-hee!");
            return "nick";
          }
          , "next": function () {
            var wizard = this
              , nick = wizard.req.getParameter("nick");
            if (!nick) {
              alert("give name dammit!");
              return null;
            }
            wizard.req.setAttribute("nick",  nick);
            data.nick = nick;
            return wizard.forward("step2");
          }
        })

        , "step2": wizard.view("The Second View, %nick%", {
          "uri": "wizard-step/2"
          , "setup": function () {
            return "animal";
          }
          , "next": function () {
            var wizard = this
              , animal = wizard.req.getParameter("animal");
            if (!animal) {
              return wizard.forward("start", function () {
                wizard.showMsg("No ANIMAL?", {"modal": true});
              }, "backward"); // TODO: use something better than a string for this
            }
            wizard.req.setAttribute("animal", animal);
            data.animal = animal;
            return wizard.forward("step2.5", function () {
              wizard.showMsg("Din idiot", {"fade": true});
            });
          }
        })

        , "step2.5": wizard.view("The 2.5 View, %nick%", {
          "html": [
            "<p>En mellanvy utan mening</p>"
            , "<button type=button data-action=random>Random</button>"
          ].join("")
          , "setup": function () {
            this.req.setAttribute("nick", data.nick);
            return function () {
              this.elem.querySelector(".wizard-submit-next").focus();
            };
          }
          , "next": function () {
            return this.forward("step3");
          }
          , "prev": function () {
            var wizard = this;
            wizard.req.setAttribute("nick", data.nick);
            return wizard.forward("step2");
          }
          , "buttonActions": {
            "random": function () {
              var rnd = data.rnd = Math.floor(Math.random()*100);
              this.showMsg(rnd, {"fade": true});
            }
          }
        })

        , "step3": wizard.view("THE END", {
          "uri": "/wizard-step/3"
          , "setup": function () {
            var wizard = this;
            wizard.req.setAttribute("nick", data.nick);
            return "fruit";
          }
          , "next": function () {
            var wizard = this;

            wizard.req.setAttribute("nick", data.nick);
            wizard.req.setAttribute("animal", data.animal);
            wizard.req.setAttribute("fruit", wizard.req.getParameter("fruit"));
            wizard.req.setAttribute("rnd", data.rnd);
            return wizard.forward("summary", function () {
              wizard.showMsg("It is THE END!  You said: "+wizard.req.getParameter("fruit"), {"fade": true});
            });
          }
        })

        , "summary": wizard.view("Summary for %nick%", {
          "html": [
              "<ul>"
              , " <li>Frukt: %fruit%</li>"
              , " <li>Djur: %animal%</li>"
              , " <li>rnd: %rnd%</li>"
              , "</ul>"
              , "<button type=button data-action=restart>Börja om</button>"
            ].join("\n")
            , "buttonActions": {
              "restart": function () {
                this.start();
            }
          }
        })


      }
    });
  }

  return {
    "create": function (elem) {
      return create(elem);
    }
  };
})();