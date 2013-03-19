// Instantiation
var express = require("express")
  , app = express();

// Setup
app.configure(function () {
  app.use(express.bodyParser());
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
  app.locals.pretty = true;
  app.use(require("stylus").middleware({ src: __dirname + "/public" }));
  app.use(express["static"](__dirname + "/public"));
});


// Read conf from file
var conf = (function () {
  var confFile = "./conf", conf = {};
  if (require("fs").existsSync(confFile+".js")) {
    conf = require(confFile);
  }
  else {
    console.warn("\nNo configuration file '%s' found!\nUsing defaults: %s", confFile, JSON.stringify(conf, null, 2));
  }
  return conf;
})();


var APP_PORT = conf.DEVMODE ? 3000 : 80;


// View helpers
app.locals({
  "bodyClass": "unknown"
  , "nav": "unknown"
  , "util":  {
    "foo": 42
  }
  , "cssAll": ["base"]
  , "cssCustom": []
});


// Routes
app.get("/", function (req, res) {
  res.render("index", {
    "pageTitle": "w i z a r d  test"
    , "nav": "home"
    , "cssCustom": ["wizard"]
  });
});

app.get("/end-view", function (req, res) {
  res.render("end-view");
});

app.get("/wizard-step/:step", function (req, res) {
  var step = req.param("step");
  res.render("wizard-views/step-"+step);
});


// Run application
app.listen(APP_PORT);
