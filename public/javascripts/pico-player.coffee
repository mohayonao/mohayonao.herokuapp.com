pico = window.pico = window.pico || {}

do (window, pico)->

    # pico-player
    #  version: 1.1.0
    #  2011/10/31 mohayonao
    #

    # for Opera
    if not window.Float32Array? then do ()=>
        console.warn "Float32Array are not defined, so use fake."
        window.Float32Array = window.Uint32Array = class extends Array
            constructor: (spec)->
                if typeof spec == "number"
                    spec |= 0
                    if spec > 0
                        @length = spec
                        while spec--
                            @[spec] = 0
                else if typeof spec?.length == "number"
                    @.length = spec.length
                    for i in [0...spec.length]
                        @[i] = spec[i]
             set: (lis, index)->
                j = index or 0
                for i in [0...lis.length]
                    @[j] = lis[i]

    NOP = ()->null

    class BasePlayer
        constructor: (slotlength)->
            @finished = true

            @_cancelled = false
            @_streamSlots = []
            @_streamReadIndex = 0
            @_streamPlayIndex = 0
            @_streamReadTimerId = null

            @_readHandler = (index, stream)=>
                @_streamSlots[index].set stream

            @_generator = null
            @_type = ""
            @_coreObject = null

        _initialize: (spec)->
            spec.samplerate ?= 44100
            spec.channel    ?= 1

            duration = spec.duration
            slice    = spec.slice

            @SAMPLERATE = samplerate = spec.samplerate
            @CHANNEL    = channel    = spec.channel

            calcBits = (sec)->
                [bits, len] = [0, sec >> 1]
                while len > 0
                    len >>= 1
                    bits += 1
                return bits

            @STREAM_FULL_BITS = calcBits((duration * samplerate) / 1000)
            @STREAM_FULL_SIZE = 1 << @STREAM_FULL_BITS
            @STREAM_CELL_BITS = calcBits(@STREAM_FULL_SIZE / slice)
            @STREAM_CELL_SIZE = 1 << @STREAM_CELL_BITS
            @STREAM_CELL_COUNT = @STREAM_FULL_SIZE / @STREAM_CELL_SIZE
            @NONE_STREAM_FULL_SIZE   = new Float32Array(@STREAM_FULL_SIZE)
            @NONE_STREAM_FULL_SIZExC = new Float32Array(@STREAM_FULL_SIZE * @CHANNEL)

            @PLAY_INTERVAL = (@STREAM_FULL_SIZE / samplerate) * 1000

            @_streamSlots[0] = new Float32Array(@STREAM_FULL_SIZE * @CHANNEL)
            @_streamSlots[1] = new Float32Array(@STREAM_FULL_SIZE * @CHANNEL)

        isPlaying: ()-> !@finished

        play: (generator)->
            if @finished
                if generator then @_generator = generator

                if @_generator

                    @finished = false
                    @_cancelled = false
                    @_streamReadIndex = 0
                    @_streamPlayIndex = 0

                    if not @_streamReadTimerId?
                        clearInterval @_streamReadTimerId

                    @_streamReadTimerId = setInterval ()=>
                        @_readStream()
                    , @PLAY_INTERVAL / 2

        stop: ()->
            @_cancelled = true

        gettype: ()-> @_type
        getcore: ()-> @_coreObject

        _readStream: ()->
            if @_streamReadIndex == @_streamPlayIndex
                index  = @_streamReadIndex & 0x01
                @_readHandler index, @_generator.next()
                @_streamReadIndex += 1
            if @_cancelled and @_streamReadTimerId
                clearInterval @_streamReadTimerId
                @_streamReadTimerId = null
                @finished = true


    class WebkitPlayer extends BasePlayer
        constructor: (spec)->
            super()

            @_context = new webkitAudioContext()
            spec.samplerate = @_context.sampleRate
            @_initialize spec
            @_type = "WebkitPlayer"
            @_coreObject = @_context

            @_node = @_context.createJavaScriptNode @STREAM_FULL_SIZE, 1, @CHANNEL

        play: (generator)->
            super(generator)

            onaudioprocessDelegate = (delegate)=>(event)=>
                if @_streamPlayIndex < @_streamReadIndex
                    i = @_streamPlayIndex & 0x01
                    delegate event, @_streamSlots[i]
                    @_streamPlayIndex += 1

            switch @CHANNEL
                when 2
                    @_node.onaudioprocess =\
                        onaudioprocessDelegate (event, stream)=>
                            dataL = event.outputBuffer.getChannelData(0)
                            dataR = event.outputBuffer.getChannelData(1)
                            i = dataR.length
                            j = i * 2
                            while i--
                                dataR[i] = stream[j    ]
                                dataL[i] = stream[j + 1]
                                j -= 2
                else
                    @_node.onaudioprocess =\
                        onaudioprocessDelegate (event, stream)=>
                            dataL = event.outputBuffer.getChannelData(0)
                            dataR = event.outputBuffer.getChannelData(1)
                            i = dataR.length
                            while i--
                                dataR[i] = dataL[i] = stream[i]
            @_node.connect @_context.destination

        stop: ()->
            super()
            @_node?.disconnect()


    class TimerBasePlayer extends BasePlayer
        constructor: (spec)->
            super()
            console.log "TimerBasePlayer"

            @_next = NOP
            @_playHandler = NOP
            @_playTimerId = null

        play: (generator)->
            super(generator)

            audioprocess = do =>()=>
                if @_streamPlayIndex < @_streamReadIndex
                    stream = @_streamSlots[@_streamPlayIndex & 0x01]
                    @_playHandler.call @, stream
                    @_streamPlayIndex += 1
                else if @finished
                    @stop()

            waitprocess = do (audioprocess)=>()=>
                if @_streamReadIndex == 1
                    stream = @_streamSlots[@_streamPlayIndex & 0x01]
                    @_playHandler.call @, stream
                    @_streamPlayIndex += 1
                    @_next = audioprocess

            if @_playTimerId?
                clearInterval @_playTimerId
                @_playTimerId = null

            @_next = waitprocess

            @_playTimerId = setInterval ()=>
                @_next()
            , @PLAY_INTERVAL


        stop: ()->
            super()

            if @_playTimerId?
                clearInterval @_playTimerId
                @_playTimerId = null


    class MozPlayer extends TimerBasePlayer
        constructor: (spec)->
            super()

            @_initialize spec
            @_type = "MozPlayer"

            audio = new Audio()
            audio.mozSetup @CHANNEL, @SAMPLERATE

            @_coreObject = audio
            @_playHandler = do (audio)=>(stream)=>
                audio.mozWriteAudio stream


    class HTML5AudioPlayer extends TimerBasePlayer

        constructor: (spec)->
            super()

            @_initialize spec
            @_type = "HTML5AudioPlayer"

            for i in [0..@_streamSlots.length]
                @_streamSlots[i] = null

        _initialize: (spec)->
            super(spec)

            samplerate = @SAMPLERATE
            channel = @CHANNEL
            samples = @STREAM_FULL_SIZE

            waveheader = do(samplerate, channel, samples)->
                waveBytes = samples * channel * 2
                l1 = waveBytes - 8
                l2 = l1 - 36
                String.fromCharCode(
                    0x52, 0x49, 0x46, 0x46, # 'RIFF'
                    (l1 >>  0) & 0xFF, (l1 >>  8) & 0xFF,
                    (l1 >> 16) & 0xFF, (l1 >> 24) & 0xFF,
                    0x57, 0x41, 0x56, 0x45, # 'WAVE'
                    0x66, 0x6D, 0x74, 0x20, # 'fmt '
                    0x10, 0x00, 0x00, 0x00, # byte length
                    0x01, 0x00, # linear pcm
                    channel, 0x00, # channel
                    (samplerate >>  0) & 0xFF,
                    (samplerate >>  8) & 0xFF,
                    (samplerate >> 16) & 0xFF,
                    (samplerate >> 24) & 0xFF,
                    ((samplerate * channel * 2) >>  0) & 0xFF,
                    ((samplerate * channel * 2) >>  8) & 0xFF,
                    ((samplerate * channel * 2) >> 16) & 0xFF,
                    ((samplerate * channel * 2) >> 24) & 0xFF,
                    2 * channel, 0x00, # block size
                    0x10, 0x00, # 16bit
                    0x64, 0x61, 0x74, 0x61, # 'data'
                    (l2 >>  0) & 0xFF, (l2 >>  8) & 0xFF,
                    (l2 >> 16) & 0xFF, (l2 >> 24) & 0xFF)

            length = @STREAM_FULL_SIZE * @CHANNEL
            @_readHandler = do (waveheader, length)=>(index, stream)=>
                wave = waveheader
                for i in [0...length]
                    y = (stream[i] * 32767.0) | 0
                    wave += String.fromCharCode(y & 0xFF, (y >> 8) & 0xFF)
                @_streamSlots[index] = new Audio("data:audio/wav;base64," + btoa(wave))

            @_playHandler = (audio)->
                audio.play()

    pico.getplayer = (spec)->
        spec ?= {}
        spec.duration ?= 50
        spec.slice    ?= 32

        if spec.duration > 50 then spec.duration = 50


        if typeof webkitAudioContext == "function" or typeof webkitAudioContext == "object"
            return new WebkitPlayer(spec)
        else if typeof Audio == "function" or typeof Audio == "object"
            a = new Audio()
            if typeof a.mozSetup == typeof a.mozWriteAudio == "function"
                return new MozPlayer(spec)
            else
                userAgent = navigator.userAgent
                if userAgent.indexOf("Opera") != -1
                    if spec.duration < 400
                        x = 400 / spec.duration
                        spec.duration *= x
                        spec.slice    *= x
                    return new HTML5AudioPlayer(spec)
                else return null
        else return null
