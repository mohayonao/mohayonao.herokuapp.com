$ ->
    [SAMPLERATE, CHANNEL] = [ 8000, 2 ]

    # enumerate
    [ NONE, LP12, HP12, BP12, BR12 ] = [ -1..3 ]


    $command = $("#command")
    $log = $("#log")
    $status = $("#status")

    CutoffFreqTable = for i in [0...256]
            440.0 * Math.pow(Math.pow(2, (1.0 / (12 * 6))), i - 64)

    class ToneGenerator
        idcount = 0

        constructor: (player, text)->
            func = eval("(function(t){return " + text + ";})")

            @ready = true
            try
                func(1)
            catch e
                @ready = false

            if @ready
                @id = idcount++

                @text = text
                @func = func
                @t1 = 0
                @t2 = 0
                @tstep = SAMPLERATE / player.SAMPLERATE
                @cellsize = player.STREAM_CELL_SIZE

                @pitch = 1
                @mute = false

                @filter = new IIRFilter(NONE, player.SAMPLERATE)

                @counterLimit = 24
                @counter = 0
                [@vol,@volfunc] = [0, (t)->255]
                [@amp,@ampfunc] = [0, (t)->255]
                [@pan,@panfunc] = [0, (t)->128]
                @cutofffunc = (t)->192
                @resfunc    = (t)->192
                @fampfunc   = (t)->128

        replace: (text)->
            func = eval("(function(t){return " + text + ";})")

            isok = true
            try
                func(1)
                @text = text
            catch e
                isok = false

            if isok then @func = func
            return isok

        set: (type, text)->
            func = eval("(function(t){return " + text + ";})")
            isOk = true
            try
                func(1)
            catch e
                isOk = false
            if isOk
                @[type + 'func'] = func
            return isOk

        filtertype: (type)->
            switch type
                when "LP" then type = LP12
                when "HP" then type = HP12
                when "BP" then type = BP12
                when "BR" then type = BR12
                else type = NONE
            @filter.chtype type

        next: ->
            streamcell = new Float32Array(@cellsize)

            if (@counter -= 1) <= 0
                t2 = @t2
                @vol = (@volfunc(t2) & 0x0ff) / 256.0
                @amp = (@ampfunc(t2) & 0x0ff) / 256.0
                @pan = (@panfunc(t2) & 0x0ff) / 256.0

                if @filter.type != NONE
                    cutoff = CutoffFreqTable[@cutofffunc(t2) & 0x0ff]
                    res    = ( @resfunc(t2) & 0x0ff) / 256.0
                    @filter.chparam cutoff, res
                    @filter.champ (@fampfunc(t2) & 0x0ff) / 256.0

                @counter += @counterLimit
                @t2 += @tstep

            vol = @vol * @amp
            [t, func] = [@t1, @func]
            tstep = @tstep * @pitch

            for i in [0...@cellsize]
                v = func(t) & 0x0ff
                v = v / 128.0 - 0.5
                streamcell[i] = v * vol
                t += tstep

            @filter.process streamcell

            @t1 = t
            return streamcell


    class IIRFilter
        constructor: (type, samplerate)->
            @amp = 0.5
            @type = type

            @_f = [ 0.0, 0.0, 0.0, 0.0 ]
            @_cutoff = 880
            @_resonance = 0.1
            @_freq = 0
            @_damp = 0
            @_samplerate = samplerate

            @_calcCoeff @_cutoff, @_resonance

        process: (stream)->
            [_f,_damp,_freq,type,amp] = [@_f,@_damp,@_freq,@type,@amp]
            if type != NONE
                for i in [0...stream.length]
                    input = stream[i]

                    # first pass
                    _f[3] = input - _damp * _f[2]
                    _f[0] = _f[0] + _freq * _f[2]
                    _f[1] = _f[3] - _f[0]
                    _f[2] = _freq * _f[1] + _f[2]
                    output = 0.5 * _f[type]

                    # second pass
                    _f[3] = input - _damp * _f[2]
                    _f[0] = _f[0] + _freq * _f[2]
                    _f[1] = _f[3] - _f[0]
                    _f[2] = _freq * _f[1] + _f[2]
                    output += 0.5 * _f[type]

                    stream[i] = (input * (1.0 - amp)) + (output * amp)

        champ: (val)->
            if val < 0.0 then val = 0.0
            else if 1.0 < val then val = 1.0
            @amp = val

        chtype: (type)->
            switch type
                when LP12 then @type = LP12
                when BP12 then @type = BP12
                when HP12 then @type = HP12
                when BR12 then @type = BR12
                else @type = NONE

        chcutoff: (cutoff)->
            @_cutoff = cutoff
            @_calcCoeff @_cutoff, @_resonance

        chres: (res)->
            @_resonance = res
            @_calcCoeff @_cutoff, @_resonance

        chparam: (cutoff, res)->
            @_cutoff = cutoff
            @_resonance = res
            @_calcCoeff @_cutoff, @_resonance

        _calcCoeff: (cutoff, resonance)->
            @_freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff / (@_samplerate*2)))
            @_damp = Math.min(2 * (1 - Math.pow(resonance, 0.25)), Math.min(2, 2/@_freq - @_freq*0.5))


    class System
        constructor: ->
            $log.val("")
            $status.val("")

            @gens = []
            @selectedgen = null
            @solo = null
            @vol = 1.0

            @history = []
            @historyIndex = 0

            if not (@player = pico.getplayer samplerate:44100, channel:CHANNEL)
                @log "this browser is no support!"
            else
                @log "one-liner-orchestra " +
                     "samplerate=" + @player.SAMPLERATE + ", channel=" + @player.CHANNEL
                $command.keydown (e)=>
                    if e.keyCode == 13
                        @command $command.val()
                    else if not (e.shiftKey or e.ctrlKey or e.metaKey)
                        prevent = switch e.keyCode
                            when 38 then @findHistory -1
                            when 40 then @findHistory +1
                        if prevent then e.preventDefault()

            @next = if CHANNEL == 2 then @_next_2ch else @_next_1ch


        findIndex: (id)->
            if id? then for gen, i in @gens
                if gen.id == id then return i
            return null

        findHistory: (vec)->
            i = @historyIndex + vec
            if 0 <= i <= @history.length
                if i >= @history.length
                    $command.val("")
                else
                    $command.val(@history[i]).focus().get(0).setSelectionRange(99,99)
                @historyIndex = i
            return true

        log: (text, err)->
            v = text
            if err != "sys" and @selectedgen?
                v = @selectedgen.id + ":" + v
            if err != "sys" and err? then v += " ... " + err
            v += "\n"
            $log.val($log.val() + v).scrollTop(2<<16)

        _next_1ch: ->
            cnt = @player.STREAM_CELL_COUNT
            cellsize = @player.STREAM_CELL_SIZE
            solo = @solo
            vol  = @vol

            stream = new Float32Array(cellsize * cnt)
            for i in [0...cnt]
                for gen in @gens
                    if gen.mute or (solo? and solo !=  gen.id) then continue
                    cell = gen.next()
                    for j in [0...cellsize]
                        stream[i * cellsize + j] += cell[j] * vol
            for i in [0...cellsize * cnt]
                if stream[i] < -1.0 then stream[i] = -1.0
                else if 1.0 < stream[i] then stream[i] = 1.0
            return stream

        _next_2ch: ->
            cnt = @player.STREAM_CELL_COUNT
            cellsize = @player.STREAM_CELL_SIZE
            solo = @solo
            vol  = @vol

            stream = new Float32Array(cellsize * cnt * 2)
            for i in [0...cnt]
                for gen in @gens
                    if gen.mute or (solo? and solo !=  gen.id) then continue
                    pan = gen.pan
                    L = (1.0-pan)*2.0 * vol
                    R = (pan)*2.0     * vol

                    cell = gen.next()
                    for j in [0...cellsize]
                        stream[(i * cellsize + j) * 2    ] += cell[j] * L
                        stream[(i * cellsize + j) * 2 + 1] += cell[j] * R
            for i in [0...cellsize * cnt]
                if stream[i] < -1.0 then stream[i] = -1.0
                else if 1.0 < stream[i] then stream[i] = 1.0
            return stream

        command: (command)->
            if not command then return

            tokens = command.split " "
            @log command, do => switch tokens[0] # action
                when "start" then cmd_start @
                when "stop"  then cmd_stop  @
                when "mastervol"
                    cmd_mvol  @, Number(tokens[1])

                when "add"
                    cmd_add   @, command.substr(4)
                when "sel", "ch"
                    cmd_sel   @, Number(tokens[1])
                when "del"
                    cmd_del   @, Number(tokens[1])
                when "mute"
                    cmd_mute  @, Number(tokens[1])
                when "solo"
                    cmd_solo  @, Number(tokens[1])

                when "vol", "amp", "pan", "cutoff", "res", "famp"
                    cmd_set     @, tokens[0], command.substr(tokens[0].length+1)
                when "v", "a", "c", "Q", "filteramp"
                    alias = v:"vol", a:"amp", c:"cutoff", Q:"res", filteramp:"famp"
                    cmd_set     @, alias[tokens[0]], command.substr(tokens[0].length+1)

                when "pitch"
                    cmd_pitch   @, Number(tokens[1])
                when "replace"
                    cmd_replace @, command.substr(8)
                when "filter", "f"
                    cmd_filter  @, tokens[1]

                else cmd_add @, command
            @history.push command
            @historyIndex = @history.length

            statuses = []
            selectedid = @selectedgen?.id
            for gen in sys.gens
                line = if gen.id == selectedid then "*" else " "
                line += "["
                line += if gen.mute then "M" else " "
                line += if sys.solo == gen.id then "S" else " "
                line += "] "
                line += gen.id + " "
                line += gen.text
                statuses.push line
            $status.val(statuses.join("\n"))

            $command.val("")

    cmd_start = (sys)->
        sys.player.play(sys)
        return "sys"

    cmd_stop = (sys)->
        sys.player.stop()
        return "sys"

    cmd_mvol = (sys, arg)->
        if not isNaN(arg)
            vol = arg | 0
            if vol < 0 then vol = 0
            else if 255 < vol then vol = 255
            sys.vol = vol / 255
        return "sys"

    cmd_add = (sys, arg)->
        gen = new ToneGenerator(sys.player, arg)
        if gen.ready
            sys.gens.push sys.selectedgen = gen
            return
        else "ERROR"

    cmd_sel = (sys, arg)->
        if (i = sys.findIndex(arg))?
            sys.selectedgen = sys.gens[i]
            return
        else "NOT FOUND"

    cmd_del = (sys, arg)->
        if (i = sys.findIndex(arg))?
            if sys.solo == sys.gens[i].id
                sys.solo = null
            sys.gens.splice i, 1
            return
        else if (i = sys.findIndex(sys.selectedgen?.id))?
            if sys.solo == sys.gens[i].id
                sys.solo = null
            sys.gens.splice i, 1
            if sys.gens[i]?
                sys.selectedgen = sys.gens[i]
            else if sys.gens[i-1]?
                sys.selectedgen = sys.gens[i-1]
            else sys.selectedgen = null
            return
        else "NOT FOUND"

    cmd_mute = (sys, arg)->
        if (i = sys.findIndex(arg))?
            sys.gens[i].mute = not sys.gens[i].mute
        else if sys.selectedgen
            sys.selectedgen.mute = not sys.selectedgen.mute
        return

    cmd_solo = (sys, arg)->
        if (i = sys.findIndex(arg))?
            if sys.solo == sys.gens[i].id
                sys.solo = null
            else
                sys.solo = sys.gens[i].id
        else if sys.selectedgen
            if sys.solo == sys.selectedgen.id
                sys.solo = null
            else
                sys.solo = sys.selectedgen.id
        return

    cmd_set = (sys, type, arg)->
        if not sys.selectedgen?.set type, arg
            "INVALID PARAMETER"
        return

    cmd_pitch = (sys, arg)->
        if not isNaN(arg)
            sys.selectedgen?.pitch = Math.pow(2, arg)
        else
            sys.selectedgen?.pitch = 0
        return

    cmd_replace = (sys, arg)->
        if not sys.selectedgen?.replace arg
            "ERROR"

    cmd_filter = (sys, arg)->
        sys.selectedgen?.filtertype arg.toUpperCase()
        return

    sys = new System()
    sys.command "start"
    $command.val("t*(((t>>12)|(t>>8))&(63&(t>>4)))").focus().get(0).setSelectionRange(99,99)
