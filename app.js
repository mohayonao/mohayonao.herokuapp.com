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

app.set("view engine" , "ejs");
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


var app_alias = {
    perfume: "perfume1",
};

app.get("/:app?", function(req, res) {
    var app, candidates, isMobile;
    app = req.params.app;
    if (app in app_alias) app = app_alias[app];
    candidates = [];
    isMobile = (req.headers["user-agent"].indexOf("iPhone") !== -1);
    if (app) {
        candidates.unshift("./views/"+app+".ejs", "./views/"+app+".html")
        if (isMobile) {
            candidates.unshift("./views/"+app+".mobile.ejs", "./views/"+app+".mobile.html")
        }
    } else {
        app = "index";
    }
    if (isMobile) {
        candidates.push("./views/index.mobile.html")
    }
    candidates.push("./views/index.html")
    
    function render() {
        var page, matches;
        page = candidates.shift();
        path.exists(page, function(exists) {
            if (exists) {
                matches = /\.\/views\/(.+)\.ejs$/.exec(page);
                if (matches) {
                    res.render(matches[1], {app:app, isMobile:isMobile});
                } else {
                    res.sendfile(page);
                }
            } else {
                render();
            }
        });
    }
    render();
});

app.listen(process.env.PORT || 3000);
