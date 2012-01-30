express  = require "express"
path     = require "path"
mongoose = require "mongoose"

mongo_uri = process.env.MONGOHQ_URL || "mongodb://localhost/mohayonao"

Schema = mongoose.Schema


app = module.exports = express.createServer()

app.configure ->
    app.use express.bodyParser()
    app.use express.methodOverride()
    app.use app.router
    app.use express.static __dirname + "/public"
    mongoose.connect mongo_uri


app.configure "development", ->
    app.use express.errorHandler(dumpExceptions:true, showStack:true)

app.configure "production", ->
    app.use express.errorHandler()

app.get "/:app?", (req, res)->
    app = req.params.app
    view = "./views/#{app}.html"
    if app then path.exists view, (exists)->
        if not exists then view = "views/index.html"
        res.sendfile view
    else res.sendfile "views/index.html"

app.listen process.env.PORT || 3000
