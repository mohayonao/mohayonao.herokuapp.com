express  = require "express"
path     = require "path"
mongoose = require "mongoose"

mongo_uri = process.env.MONGOHQ_URL || "mongodb://localhost/mohayonao"

Schema = mongoose.Schema
musicboxSchema = new Schema id:String, count:Number


app = module.exports = express.createServer()

app.configure ->
    app.use express.bodyParser()
    app.use express.methodOverride()
    app.use app.router
    app.use express.static __dirname + "/public"
    mongoose.connect mongo_uri
    mongoose.model "MusicBox", musicboxSchema


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


MusicBox = mongoose.model "MusicBox"


io  = (require "socket.io").listen(app)

io.sockets.on "connection", (socket)->
    console.log "connected"
    socket.on "msg send", (msg)->
        [app, data] = [msg.app, msg.data]
        result = {app:app, data:null}
        switch app
            when "socketmusicbox"
                id = data.id

                MusicBox.findOne id:id, (err, data)->
                    if data
                        console.log "socketmusicbox: update"
                        count = data.count + 1
                        MusicBox.update { id:id }, { $set: {count:count} },
                            { upsert: false }, (err)->
                                if err then console.log "  err: #{err}"
                                else console.log "  ok : #{id} (#{count})"
                    else
                        console.log "socketmusicbox: new"
                        count = 1
                        mb = new MusicBox()
                        mb.id = id
                        mb.count = count
                        mb.save (err)->
                            if err then console.log "  err: #{err}"
                            else console.log "  ok : #{id} (#{count})"

                    result.data = {id:id, count:count}
                    socket.emit "msg push", result
                    socket.broadcast.emit "msg push", result

    socket.on "disconnect", ()->
        console.log "disconnected"
