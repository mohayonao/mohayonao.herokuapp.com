$ ()->
    PI  = Math.PI
    PI2 = Math.PI * 2
    abs   = Math.abs
    round = Math.round
    sin   = Math.sin
    atan2 = Math.atan2
    pow   = Math.pow
    sqrt  = Math.sqrt

    DEBUG = 0

    Array::shuffle = -> @sort -> 0.5 - Math.random()

    requestAnimationFrame ?= webkitRequestAnimationFrame \
                          ?  mozRequestAnimationFrame    \
                          ?  oRequestAnimationFrame      \
                          ?  msRequestAnimationFrame     \
                          ?  (f)->setTimeout(f, 1000/60)

    $canvas = $(canvas = document.getElementById("canvas"))
    width  = canvas.width  = $canvas.width()
    height = canvas.height = $canvas.height()

    ctx = canvas.getContext "2d"

    class Windmill
        constructor: (options)->
            @x = options.x ? 0
            @y = options.y ? 0
            @r = options.r ? 100
            @phase  = options.phase  ? 0
            @freq   = options.freq ? 0.1
            @color  = options.color  ? "lime"
            @count  = options.count  ? 3
            @min    = options.min    ? -3
            @max    = options.max    ? +3
            @anime_prev  = +new Date()
            @mouse_prev  = +new Date()
            @radian_prev = 0
            @mouseon = false
            @next = null

            @freq = Math.min(@max, Math.max(@min, @freq))

        animate: (now)->
            [x, y, r, count] = [@x, @y, @r, @count]

            elapsed = now - @anime_prev
            phaseStep = @freq * PI2 * (elapsed / 1000)
            @anime_prev = now

            @phase = phase = @phase + phaseStep

            ctx.fillStyle = @color
            for i in [0...count]
                p = phase + (PI2 / count) * i
                ctx.beginPath()
                ctx.arc(x, y, r/4, p + 0.15, p - 0.15, true)
                ctx.arc(x, y, r-5, p - 0.15, p + 0.15, false)
                ctx.closePath()
                ctx.fill()

            @next?.animate(now)

        mousemove: (x, y)->
            dx = @x - x
            dy = @y - y
            distance = sqrt(dx*dx + dy*dy)

            radian = atan2(dy, dx)
            radian += PI2 if radian < 0

            if @mouseon
                diff = @radian_prev - radian
                diff = PI2 - diff if diff > PI
                @radian_prev = radian
                now = +new Date()
                if (elapsed = now - @mouse_prev) > 0
                    @mouse_prev = now
                    freq = (-diff * 1000) / elapsed / 4
                    if freq > @max then freq = @max
                    else if freq < @min then freq = @min
                    @freq = @freq * 0.95 + freq * 0.05

            if @r/4 < distance < @r-5
                @mouseon = true
                @radian_prev = radian
                @mouse_prev = +new Date()
            else
                @mouseon = false


    TABLE_LENGTH = 1024
    sinetable = ( sin(i/TABLE_LENGTH*PI2) for i in [0...TABLE_LENGTH] )


    class ToneGenerator
        constructor: (sys)->
            @player    = sys.player
            @steptable = sys.steptable
            @wave   = sinetable
            @base   = 2000
            @phase  = 0
            @phaseStep   = @steptable[@base]
            @phaseStepTo = @steptable[@base]
            @amp   = 0.5
            @ampTo = 0.5
            @tremPhase = 0
            @tremPhaseStep   = 0
            @tremPhaseStepTo = 0
            @mill = freq:null, amp:null, trem:null
            @count = 0


        bind: (freq, amp, trem)->
            mill = @mill
            mill.freq = freq
            mill.amp  = amp
            mill.trem = trem

            i = (abs(mill.freq.freq) * 400 + @base) | 0
            if i > 8191 then i = 8191
            @phaseStep = @phaseStepTo = @steptable[i]


        chbase: (val)->
            @base = val
            @phaseStep   = @steptable[@base]
            @phaseStepTo = @steptable[@base]

        next: ()->
            STREAM_FULL_SIZE  = @player.STREAM_FULL_SIZE
            STREAM_CELL_SIZE  = @player.STREAM_CELL_SIZE
            STREAM_CELL_COUNT = @player.STREAM_CELL_COUNT

            [mill, steptable] = [@mill, @steptable]
            [wave, phase]     = [@wave, @phase]

            phaseStepTo = @phaseStepTo
            ampTo = @ampTo
            tremPhaseStepTo = @tremPhaseStepTo

            if @count <= 0
                i = (abs(mill.freq.freq) * 600 + @base) | 0
                if i > 8191 then i = 8191
                @phaseStepTo = phaseStepTo = steptable[i]

                @ampTo = 0.2 + abs(mill.amp.freq) / 2

                i = ((abs(mill.trem.freq) * 5000) | 0) + 500
                @tremPhaseStepTo = steptable[i]
                @count += STREAM_FULL_SIZE * 5
            else @count -= STREAM_FULL_SIZE

            @phaseStep = phaseStep = (@phaseStep * 0.95 + phaseStepTo * 0.05)
            @amp = amp = (@amp * 0.95 + ampTo * 0.05)
            @tremPhaseStep = tremPhaseStep = (@tremPhaseStep * 0.8 + tremPhaseStepTo * 0.2)

            tremPhase = @tremPhase

            stream = new Float32Array(STREAM_FULL_SIZE)
            k = 0
            for i in [0...STREAM_CELL_COUNT]
                tremPhase += tremPhaseStep
                vol = amp + sinetable[(tremPhase | 0) % TABLE_LENGTH] * 0.4
                for j in [0...STREAM_CELL_SIZE]
                     stream[k++] = wave[(phase | 0) % TABLE_LENGTH] * vol
                     phase += phaseStep

            @phase = phase % TABLE_LENGTH
            @tremPhase = tremPhase % TABLE_LENGTH
            stream


    class SoundSystem
        constructor: ()->
            [SAMPLERATE, CHANNEL] = [ 44100, 1 ]

            player = pico.getplayer {samplerate:SAMPLERATE, channel:CHANNEL}
            if player
                @player = player
                @steptable = do ()->
                    samplerate = player.SAMPLERATE
                    calcStep = (i)->
                        freq = 440.0 * pow(pow(2, (1/(12*128))), (i-4096))
                        TABLE_LENGTH * freq / samplerate
                    calcStep(i) for i in [0...8192]
            else @player = null

            @gens = []
            @count = 200

        add: (gen)-> @gens.push gen

        play: ()-> @player.play(@)
        stop: ()-> @player.stop( )

        next: ()->
            STREAM_FULL_SIZE = @player.STREAM_FULL_SIZE
            stream = new Float32Array(STREAM_FULL_SIZE)
            for g in @gens
                cellstream = g.next()
                for i in [0...STREAM_FULL_SIZE]
                    stream[i] += cellstream[i] * 0.05
            for i in [0...STREAM_FULL_SIZE]
                if stream[i] > 1.0 then stream[i] = 1.0
                else if stream[i] < -1.0 then stream[i] = -1.0

            stream

    do ()->
        if location.search
            r = Number(location.search.substr(1))
            if isNaN(r) then r = 35
            if r < 15 then r = 15
            else if r > 80 then r = 80
        else r = 35

        mills = []
        color = "227, 193, 93"

        X = ((width  - 20) / (r * 2.0)) | 0
        Y = ((height - 20) / (r * 1.8)) | 0

        for i in [0...Y]
            basex = if i % 2 then r * 2 else r
            basey = i * sqrt(3) * r
            for j in [0...X-(i%2)]
                x = basex + j * (r * 2) + 10
                y = basey + r + 10

                x += (Math.random() - 0.5) * 10
                y += (Math.random() - 0.5) * 10

                f = (Math.random() - 0.5) * 3
                if min > max then [min, max] = [max, min]
                m = new Windmill(x:x, y:y, r:r, freq:f, count:5, min:-1.5, max:3.0)
                m.color = "rgba(#{color}, 0.2)"
                mills[mills.length-1]?.next = m
                mills.push(m)

        animate = ()->
            saveStrokeStyle = ctx.strokeStyle

            ctx.fillStyle = "rgba(252, 243, 195, 0.25)"
            ctx.fillRect(0, 0, width, height-20)

            now = +new Date()
            mills[0].animate(now)

            ctx.strokeStyle = saveStrokeStyle
            requestAnimationFrame animate

        $canvas.mousemove (e)->
            offset = $canvas.offset()
            x = e.pageX - offset.left
            y = e.pageY - offset.top
            m.mousemove x, y for m in mills
        requestAnimationFrame animate

        sys = new SoundSystem()

        if sys.player
            bases = (i for i in [600..7350] by 250).shuffle()
            indexes = [0...mills.length].shuffle()

            for i in [0...(mills.length/3)|0]
                i0 = indexes[i * 3 + 0]
                i1 = indexes[i * 3 + 1]
                i2 = indexes[i * 3 + 2]
                mills[i0].color = "rgba(#{color}, 0.8)"
                mills[i1].color = "rgba(#{color}, 0.3)"
                mills[i2].color = "rgba(#{color}, 0.6)"

                tg = new ToneGenerator(sys)
                tg.chbase bases[i % bases.length]
                tg.bind mills[i0], mills[i1], mills[i2]
                sys.add tg
            console.log "poly: #{sys.gens.length}"

            toggle = ()->
                ctx.clearRect(5, height-20, 60, 20)
                if sys.player.isPlaying()
                    sys.stop()
                    ctx.strokeStyle = "rgba(#{color}, 0.8)"
                    ctx.strokeText("Sound OFF", 5, height-5)
                else
                    sys.play()
                    ctx.strokeStyle = "rgba(#{color}, 1.0)"
                    ctx.strokeText("Sound ON", 5, height-5)

            $canvas.click (e)->
                offset = $canvas.offset()
                x = e.pageX - offset.left
                y = e.pageY - offset.top
                if x < 65 and 460 < y then toggle()

            $(window).keydown (e)->
                if not e.ctrkKey and not e.metaKey
                    switch e.keyCode
                        when 32 then toggle()

            ctx.strokeStyle = "rgba(#{color}, 0.8)"
            ctx.strokeText("Sound OFF", 5, height-5)

