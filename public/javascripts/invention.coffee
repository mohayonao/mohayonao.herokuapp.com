$ ->
    PI2 = Math.PI * 2
    sin   = Math.sin
    sqrt  = Math.sqrt
    pow = Math.pow
    Array::randomchoice = -> @[(Math.random() * @.length)|0]

    TABLE_LENGTH = 1024
    sinetable = new Float32Array(for i in [0...TABLE_LENGTH]
        sin(PI2 * (i / TABLE_LENGTH)))

    famicon_tri = do ()->
        src = [ +0.000, +0.125, +0.250, +0.375, +0.500, +0.625, +0.750, +0.875,
                +0.875, +0.750, +0.625, +0.500, +0.375, +0.250, +0.125, +0.000,
                -0.125, -0.250, -0.375, -0.500, -0.625, -0.750, -0.875, -1.000,
                -1.000, -0.875, -0.750, -0.625, -0.500, -0.375, -0.250, -0.125 ]
        wavelet = new Float32Array(TABLE_LENGTH)
        cnt = TABLE_LENGTH/src.length
        for s, i in src
            for j in [0...cnt]
               wavelet[i * cnt + j] = s
        wavelet

    requestAnimationFrame ?= window.webkitRequestAnimationFrame \
                          ?  window.mozRequestAnimationFrame    \
                          ?  window.oRequestAnimationFrame      \
                          ?  window.msRequestAnimationFrame     \
                          ?  (f)->setTimeout(f, 1000/60)

    DEBUG = 0

    main = (img)->
        BPM = 90
        FPS = 60

        imgData = (img) ->
            canvas = document.createElement("canvas")
            width  = canvas.width  = img.width
            height = canvas.height = img.height
            $(canvas).width(width).height(height)

            ctx = canvas.getContext "2d"
            ctx.drawImage(img, 0,  0)
            ctx.getImageData(0, 0, width, height)


        mosaic = (imgData, w, h)->
            average = (x, y)->
                [R, G, B] = [0, 0, 0]
                for _y in [y...y+h]
                    for _x in [x...x+w]
                        R += imgData.data[(imgData.width * _y + _x) * 4 + 0]
                        G += imgData.data[(imgData.width * _y + _x) * 4 + 1]
                        B += imgData.data[(imgData.width * _y + _x) * 4 + 2]
                B:(B / (w * h))|0,  G:(G / (w * h))|0, R:(R / (w * h))|0, A:255
            cx = (imgData.width  / w) | 0
            cy = (imgData.height / h) | 0

            width:cx, height:cy, data:for y in [0...cy]
                average(x * w, y * h) for x in [0...cx]


        class DancingPortrait

            class Cell
                constructor: (rgb, size, x, y, z = 0.0)->
                    @fillStyle = "#{rgb}"
                    [@size, @x, @y, @z] = [size, x, y, z]

                draw: (ctx, dx, dy)->
                    size = @size
                    rate = @z / 5
                    x = (@x + dx * rate + 0.5) | 0
                    y = (@y + dy * rate + 0.5) | 0
                    ctx.fillStyle = "rgba(#{@fillStyle}, 0.5)"
                    ctx.fillRect(x, y, size, size)

            constructor: (options)->
                @ctx      = options.ctx
                @imgData  = options.imgData
                @cellsize = options.cellsize ? 3
                @mosaic   = m = mosaic(@imgData, @cellsize, @cellsize)
                @tile     = options.tile ? 4
                @cells    = cells = []
                for y in [0...m.height]
                    for x in [0...m.width]
                        d = m.data[y][x]
                        c = new Cell("#{d.R}, #{d.G}, #{d.B}", @tile, x * @tile, y * @tile)
                        dx = (m.width  / 2) - x
                        dy = (m.height / 4) - y
                        c.z = -sqrt(dx*dx + dy*dy)
                        cells.push c
                cells.sort (a, b) -> a.z - b.z

                @anime_prev = +new Date()
                [@x_index, @x_speed, @x_rate] = [0, 0, 1.0]
                [@y_index, @y_speed, @y_rate] = [0, 0, 1.0]

            animate: ()->
                ctx = @ctx

                now = +new Date()
                elapsed = now - @anime_prev
                @anime_prev = now

                dx = @x_index
                dy = sinetable[@y_index|0] * @y_rate
                for c in @cells
                    c.draw(ctx, dx, dy)
                i = (i) % TABLE_LENGTH

                @y_index += @y_speed * elapsed
                if @y_index >= TABLE_LENGTH then @y_index -= TABLE_LENGTH


        class ToneGenerator
            SAMPLERATE = 0
            STREAM_CELL_SIZE = 0
            NONE_STREAM_CELL = null
            STEP_TABLE = null

            constructor: (player, options={})->
                @wavelet   = options.wavelet ? sinetable
                @volume    = options.volume  ? 0.75
                @phase     = options.phase ? 0
                @phaseStep = @STEP_TABLE[options.noteIndex] ? 0
                @duration  = options.duration ? 1000
                @ampSampleMax = @ampSample = (@duration / 1000) * @SAMPLERATE
                @next = @_next_stream
                @finished = false

            _next_stream: ()->
                [wavelet, phase, phaseStep] = [@wavelet, @phase, @phaseStep]

                STREAM_CELL_SIZE = @STREAM_CELL_SIZE
                @ampSample -= STREAM_CELL_SIZE
                if @ampSample <= 0
                    [vol, @finished, @next] = [0, true, @_next_none]
                else vol = @ampSample / @ampSampleMax
                vol *= @volume
                stream = new Float32Array(STREAM_CELL_SIZE)
                for i in [0...STREAM_CELL_SIZE]
                    stream[i] = wavelet[(phase | 0) % TABLE_LENGTH] * vol
                    phase += phaseStep
                @phase = phase
                stream

            _next_none: ()-> @NONE_STREAM_CELL

            # @classmethod?
            initialize: (player, options={})->
                @SAMPLERATE = player.SAMPLERATE
                @STREAM_CELL_SIZE = player.STREAM_CELL_SIZE
                @NONE_STREAM_CELL = new Float32Array(player.STREAM_CELL_SIZE)

                samplerate = @SAMPLERATE
                A3         = options.A3         ? 440
                size       = options.size       ? 128
                resolution = options.resolution ? 1
                center     = options.center     ? size >> 1
                @STEP_TABLE = steptable = do ()->
                    calcStep = (i)->
                        freq = A3 * pow(pow(2, (1 / (12 * resolution))), (i - center))
                        freq * TABLE_LENGTH / samplerate
                    calcStep(i) for i in [0...size]


        class MMLTrack
            constructor: (player, options={})->
                @player = player
                @originData = options.mml
                @SAMPLERATE = @player.SAMPLERATE
                @vol   = options.vol ? 0.5
                @bpm   = options.bpm ? 120
                @shift = options.shift ? 0
                @index = 0

                @finished = false
                @noteCounterMax = 0
                @noteCounter    = 0
                @gens = []
                @next = @_next_none

                @_compile @originData

            nextTones: ()->
                res = @data[@index++]
                if res? then [res] else null

            _next_stream: ()->
                player = @player
                STREAM_CELL_SIZE = player.STREAM_CELL_SIZE
                [noteCounter, noteCounterMax] = [@noteCounter, @noteCounterMax]
                [gens, vol] = [@gens, @vol]

                stream = new Float32Array(player.STREAM_FULL_SIZE)
                k1 = 0
                for i in [0...player.STREAM_CELL_COUNT]
                    noteCounter -= STREAM_CELL_SIZE
                    if noteCounter <= 0
                        if (lis = @nextTones())?
                            for d in lis
                                if d.noteIndex != -1
                                    options =
                                        noteIndex: d.noteIndex + @shift
                                        duration: 500
                                        volume: d.velocity / 15
                                        wavelet: famicon_tri
                                    g = new ToneGenerator(player, options)
                                    gens.push g
                            samples = (60 / @bpm) * @SAMPLERATE * (4 / d.length)
                            noteCounter += samples
                        else
                            @finished = true
                            @next = @_next_none
                            noteCounter = Infinity
                            console.log "end"
                    for gen in gens
                        streamcell = gen.next()
                        k2 = k1
                        for j in [0...STREAM_CELL_SIZE]
                            stream[k2++] += streamcell[j] * vol
                    k1 = k2
                @gens = gens.filter (x)-> not x.finished
                @noteCounter = noteCounter
                stream

            _next_none: ()-> new Float32Array(@player.STREAM_FULL_SIZE)

            _compile: (data)->
                [O, L, V] = [3, 8, 12]
                TONES = c:0, d:2, e:4, f:5, g:7, a:9, b:11
                S = "-":-1, "+":+1
                r = /([cdefgabrolv<>])([-+]?)(\d*)/gm
                @data = while (x = r.exec(data.toLowerCase()))?
                    [cmd, sign, val] = x[1..3]
                    t = null
                    switch cmd
                        when "o" then O = Number(val) if val != ""
                        when "l" then L = Number(val) if val != ""
                        when "v" then V = Number(val) if val != ""
                        when "<" then O += 1 if O < 8
                        when ">" then O -= 1 if O > 1
                        when "r" then t = -1
                        else t = TONES[cmd]
                    switch t
                        when null then continue
                        when -1   then noteIndex = -1
                        else noteIndex = O * 12 + t + 36 + (S[sign] ? 0)
                    length = if val == "" then L else Number(val)
                    noteIndex: noteIndex, length:length, velocity: V
                @next = @_next_stream


        class MarkovMMLTrack extends MMLTrack
            constructor: (player, options={})->
                super(player, options)

                @lv    = options.lv ? 4
                @markov = {}
                @chord  = {}
                @histNoteIndex = []
                @prevNoteIndex = 0
                @index     = 0
                @readIndex = 0
                @velocity = 12

                @makeMarkovData(@lv)

            nextTones: ()->
                [noteIndexCands, noteLengthCands] = [null, null]
                [lv, histNoteIndex ] = [@lv, @histNoteIndex ]
                for i in [0...lv]
                    key = histNoteIndex[i...lv].join(",")
                    if (noteIndexCands = @markov[key])? then break
                if noteIndexCands?
                    noteIndex = noteIndexCands.randomchoice()
                else
                    noteIndex = @data[@readIndex++].noteIndex
                    if @readIndex >= @data.length then @index = 0

                histNoteIndex.push noteIndex
                if histNoteIndex.length > lv then histNoteIndex.shift()
                @histNoteIndex = histNoteIndex

                if @prevNoteIndex == noteIndex
                    @velocity -= 2
                    if @velocity <= 0
                        @velocity = 12
                        @histNoteIndex = []
                else
                    @velocity = 12
                    @prevNoteIndex = noteIndex

                subNoteIndex = @chord[noteIndex]?.randomchoice() ? -1

                [ {noteIndex:noteIndex   , length:@minLength, velocity:@velocity}
                  {noteIndex:subNoteIndex, length:@minLength, velocity:4        } ]


            makeMarkovData: (lv=2)->
                @minLength = @data.map((x)->x.length).reduce((a, b)->Math.max(a, b))

                data = do () =>
                    [lis, prev] = [[], null]
                    for d in @data
                        if d.noteIndex == -1
                            if not prev? then continue
                            noteIndex = prev
                        else noteIndex = d.noteIndex
                        for i in [0...(@minLength / d.length)]
                            lis.push noteIndex:noteIndex, length:@minLength
                    lis

                make = (dst, lv)=>
                    lis = []
                    for d in data
                        if lis.length == lv
                            key = lis.map((x)->x.noteIndex).join(",")
                            (dst[key] ?= []).push d.noteIndex
                        lis.push d
                        if lis.length > lv then lis.shift()
                markov  = {}
                for i in [1..lv]
                    make markov, i
                @markov  = markov


            makeChord: (others)->
                zip = () ->
                    lengthArray = (arr.length for arr in arguments)
                    length = Math.max.apply(Math, lengthArray)
                    argumentLength = arguments.length
                    results = []
                    for i in [0...length]
                        semiResult = []
                        for arr in arguments
                            semiResult.push arr[i]
                        results.push semiResult
                    results

                chord = {}
                for pair in zip(@data, others.data)
                    if not pair[0]? or not pair[1]? then break
                    a = pair[0].noteIndex
                    b = pair[1].noteIndex
                    if a != -1 and b != -1
                        b = a - ((a-b) % 12)
                    (chord[a] ?= []).push b
                @chord = chord


        class Delay
            constructor: (player, options={})->
                @player = player
                @SAMPLERATE = @player.SAMPLERATE

                sampleDuration = options.sampleDuration ? 2000
                sampleSamples  = (sampleDuration / 1000) * @SAMPLERATE
                @sampleSamples  = 1 << Math.ceil(Math.log(sampleSamples) * Math.LOG2E)
                @sampleDuration = @sampleSamples / @SAMPLERATE
                @buffer = new Float32Array(@sampleSamples)

                @delay = options.delay ? 100
                @mix   = options.mix   ? 0.25
                @masterVolume = (1.0 - @mix)
                @delayVolume  = @mix
                @delaySamples  = (@delay / 1000) * @SAMPLERATE

                @inputIndex  = @delaySamples
                @outputIndex = 0

            process: (stream)->
                STREAM_FULL_SIZE = @player.STREAM_FULL_SIZE
                [buffer, inputIndex, outputIndex] = [@buffer, @inputIndex, @outputIndex]
                masterVolume = @masterVolume
                delayVolume  = @delayVolume
                sampleSamples = @sampleSamples
                for i in [0...STREAM_FULL_SIZE]
                    v1 = stream[i]
                    v2 = buffer[outputIndex++]
                    v0 = v1 * masterVolume + v2 * delayVolume
                    buffer[inputIndex++] = v0
                    stream[i] = v0
                    if inputIndex  >= sampleSamples then inputIndex  = 0
                    if outputIndex >= sampleSamples then outputIndex = 0
                [@outputIndex, @inputIndex] = [outputIndex, inputIndex]
                stream

            setDepth: (val)->
                @mix = val
                @masterVolume = (1.0 - @mix)
                @delayVolume  = @mix

            setDelay: (val)->
                if 0 < val < @sampleDuration
                    @delay = val
                    @delaySamples  = (val / 1000) * @SAMPLERATE
                    @inputIndex = @outputIndex + @delaySamples
                    if @inputIndex > @sampleSamples then @inputIndex -= @sampleSamples


        class SoundSystem
            constructor: ()->
                player = pico.getplayer(samplerate:22050)
                if player
                    @player = player
                    @efx    = new Delay(@player, {delay:320})
                    ToneGenerator::initialize @player, {center:69}
                    @mmlTracks = []
                    @readEnd = false
                else @player = null

            setMML: (val)->
                if @player
                    v = val.split(";")
                    t0 = new MMLTrack(@player, {mml:v[0], bpm:BPM, shift: 0})
                    t1 = new MMLTrack(@player, {mml:v[1], bpm:BPM, shift: -12})

                    t2 = new MarkovMMLTrack(@player, {mml:v[0], bpm:BPM, shift:0})
                    t3 = new MarkovMMLTrack(@player, {mml:v[1], bpm:BPM, shift:0})
                    t2.makeChord t3
                    @normalTracks = [ t0, t1 ]
                    @markovTrack  = [ t2 ]

            setMode: (val)->
                @mmlTracks = switch (val)
                    when "markov" then @markovTrack
                    else @normalTracks

            setEfxDepth: (val)->
                if val < 0 then val = 0
                else if val > 1.0 then val = 1.0
                @efx.setDepth (val * 0.8) + 0.10

            play: ()->
                if @player and not @player.isPlaying()
                    @player.play(@)

            stop: ()->
                if @player and @player.isPlaying()
                    @player.stop()

            toggle: ()->
                if @player
                    if @player.isPlaying()
                        @player.stop()
                        false
                    else
                        @player.play(@)
                        true
                else false

            next: ()->
                mmlTracks = @mmlTracks
                STREAM_FULL_SIZE = @player.STREAM_FULL_SIZE

                stream = new Float32Array(STREAM_FULL_SIZE)
                for mml in mmlTracks
                    streamcell = mml.next()
                    for i in [0...STREAM_FULL_SIZE]
                        stream[i] += streamcell[i]
                @mmlTracks = mmlTracks.filter (x)->not x.finished
                if @mmlTracks.length == 0
                    if @readEnd then @player.stop()
                    else @readEnd = true
                @efx.process stream
                stream

        invention_13 = """
        o3l16
        rea<c>beb<dc8e8>g+8<e8 >aea<c>beb<dc8>a8r4
        <rece>a<c>egf8a8<d8f8 fd>b<d>gbdfe8g8<c8e8
        ec>a<c>f8<d8d>bgbe8<c8 c>afad8b8<c8r8r4

        >rg<ced>g<dfe8g8>b8<g8 c>g<ced>g<dfe8c8g8e8
        <c>aeace>a<c d8f+8a8<c8 >bgdg>b<d>gb<c8e8g8b8
        af+d+f+>b<d+>f+ag8<g8gece >a+8<f+8f+d>b<d>g8<e8ec>a<c
        >f+<gf+ed+f+>b<d+e8r8r4
        rgb-gegc+egec+e>arr8 <rfafdf>b<dfd>b<d>grr8
        <regece>a<cd+c>a<c>f+rr8 <rdfd>b<d>g+b<d>bg+berr8

        rea<c>beb<dc8>a8g+8e8 a<cec>a<c>f+a<c>af+ad+<c>ba
        g+b<d>bg+bdfg+fdf>b<fed ceaece>a<cd+c>a<c>f+<c>ba
        g+8<b8g+8e8rea<c>beb<d c>a<ced>b<dfecegfedc
        >b<cdefdg+dbdcafd>b<d >g+b<c>aeabg+aece>a4<
        ;
        o2l16
        a8<a4g+8aea<c>beb<d c8>a8g+8e8aea<c>beb<d
        c8>a8<c8>a8<d>afadf>a<c >b8<d8g8b8bgegce>gb
        a8<c8df>b<d>g8b8<ce>a<c >f8d8g<gfgcg<ced>g<df

        e8c8>b8g8 <c>g<ced>g<df e8c8r4rgegce>gb
        a8<c8e8g8f+adf+>a<d>f+a g8b8<d8f+8egce>g<c>eg
        f+8a8b8<d+8rece>a<ceg f+d>b<d>gb<df+ec>a<c>f+a<c8
        c>b<c>ab8>b8<e<e>bge>bgb
        e8<e8g8b-8c+8r8r<gfe d8>d8f8a-8>b8r8r<<fed
        c8>c8e8f+8>a8r8r<<ed+c+ >b8>b8<d8f8>g+8r8r<<dc>b

        <c8>a8g+8e8aea<c>beb<d ceaece>a<c>f+a<c>af+ad+f+
        e8g+8b8g+8e8>b8g+8e8 a8<c8e8c8>a8<c8>d+8r8
        r>bg+edbgdc8e8>g+8<e8 >a8<f+8>b8<g+8c8a8d8b-8
        g+8f8d8>b8g+8a8d8e8 f8d+8e8<e8>a2
        """



        $canvas = $(canvas = document.getElementById("canvas"))
        width  = canvas.width  = $canvas.width()
        height = canvas.height = $canvas.height()

        ctx = canvas.getContext "2d"

        portrait = new DancingPortrait(ctx: ctx, imgData:imgData(img))
        portrait.y_speed = (TABLE_LENGTH * BPM * 2) / (60 * 1000)

        isAnimate = false
        animate = ()->
            portrait.animate()
            if isAnimate then requestAnimationFrame animate

        sys = new SoundSystem()
        sys.setMML(invention_13)


        $canvas.click (e)->
            mode = $("input[name=mode]:checked").val()
            sys.setMode mode
            if sys.toggle()
                $("input[name=mode]").attr("disabled", true)
                if mode == "markov"
                    isAnimate = true
                    requestAnimationFrame animate
            else
                $("input[name=mode]").attr("disabled", false)
                isAnimate = false
        .mousemove (e)->
            offset = $canvas.offset()
            x = e.pageX - offset.left
            y = e.pageY - offset.top
            x_rate = (x / width)
            y_rate = (y / height)

            sys.setEfxDepth (1.0 - y_rate)

            portrait.y_rate  = (1.0 - y_rate) * 3.0 + 0.25
            portrait.x_index = (x_rate - 0.5) * 5

        $(window).keydown (e)->
            if not e.ctrkKey and not e.metaKey
                switch e.keyCode
                    when 32 then $canvas.click()
                    when 38 then $("#normal").click()
                    when 40 then $("#markov").click()
        animate()


    $(img = document.createElement("img")).attr("src", "/images/bach.png").load (e)->
        main(img)
