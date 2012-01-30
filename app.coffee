express  = require "express"
ejs      = require "ejs"
path     = require "path"
mongoose = require "mongoose"


do ()->
    if path.existsSync "devenv.json"
        env = JSON.parse(require("fs").readFileSync("devenv.json", "utf-8"))
        for key, val of env
            process.env[key] = env[key]
PAGE_PASSWORD = process.env.PAGE_PASSWORD


mongo_uri = process.env.MONGOHQ_URL || "mongodb://localhost/mohayonao"

Schema = mongoose.Schema
pageSchema = new Schema {title:String, contents:String, created:Date, modified:Date}

app = module.exports = express.createServer()

app.set "view engine", "ejs"
app.set "view options", { layout: false }
app.set "views", __dirname + "/views"

app.configure ->
    app.use express.bodyParser()
    app.use express.methodOverride()
    app.use app.router
    app.use express.static __dirname + "/public"
    mongoose.connect mongo_uri
    mongoose.model "Page", pageSchema


Page = mongoose.model "Page"

app.configure "development", ->
    app.use express.errorHandler(dumpExceptions:true, showStack:true)

app.configure "production", ->
    app.use express.errorHandler()

app.post "/api/page/", (req, res)->
    title    = req.body.title
    contents = req.body.contents.trim()
    if contents.substr(-PAGE_PASSWORD.length) == PAGE_PASSWORD
        contents = contents.substr(0, contents.length - PAGE_PASSWORD.length).trim()
        Page.findOne {title:title}, (err, data)->
            if contents != ""
                if data
                    data.contents = contents
                    data.modified = new Date()
                else
                    data = new Page()
                    data.title    = title
                    data.contents = contents
                    data.created = data.modified = new Date()
                data.save (err)->
                    res.send JSON.stringify {mode:"save", contents:contents, modified:data.modified}
            else if data
                data.remove()
                res.send JSON.stringify {mode:"remove"}
    else
        res.send JSON.stringify {mode: "deny"}

app.get "/:app?", (req, res)->
    app = req.params.app
    view = "./views/#{app}.html"
    if app then path.exists view, (exists)->
        if exists
            res.sendfile view
        else
            Page.findOne {title:app}, (err, data)->
                contents = created = modified = ""
                if data
                    contents = data.contents
                    created  = data.created
                    modified = data.modified
                opts = {title:app, contents:contents, created:created, modified:modified}
                res.render "page.ejs", opts
    else res.sendfile "views/index.html"

app.listen process.env.PORT || 3000
