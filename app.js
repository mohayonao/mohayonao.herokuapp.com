var express  = require("express");
var ejs      = require("ejs");
var path     = require("path");

(function() {
    var env, key;
    if (path.existsSync("devenv.json")) {
        env = JSON.parse(require("fs").readFileSync("devenv.json", "utf-8"));
        for (key in env) {
            process.env[key] = env[key];
        }
    }
}());


var app = module.exports = express.createServer()

app.set("view engine", "ejs");
app.set("view options", { layout: false });
app.set("views", __dirname + "/views");

app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + "/public"));
});

app.configure("development", function() {
    app.use(express.errorHandler({dumpExceptions:true, showStack:true}));
});

app.configure("production", function() {
    app.use(express.errorHandler());
});

app.get("/:app?", function(req, res) {
    var app, view1, view2;
    app = req.params.app;
    view1 = view2 = "./views/"+app+".html";
    if (req.headers["user-agent"].indexOf("iPhone") !== -1) {
        view2 = "./views/"+app+".mobile.html";
    }
    
    if (app) {
        path.exists(view2, function(exists) {
            if (exists) {
                res.sendfile(view2);
            } else {
                path.exists(view1, function(exists) {
                    if (exists) {
                        res.sendfile(view1);
                    } else {
                        res.sendfile("views/index.html");
                    }
                });
            }
        });
    } else {
        res.sendfile("views/index.html");
    }
});

app.listen(process.env.PORT || 3000);
