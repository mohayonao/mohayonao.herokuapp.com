this.pico = this.pico || {};

(function (global, pico) {
    // for Opera
    if (!(global.Float32Array != null)) {
        (function () {
            console.warn("Float32Array are not defined, so use fake.");
            function Float32Array(spec) {
                var i, imax;
                if (typeof spec === "number") {
                    spec = spec || 0;
                    if (spec > 0) {
                        this.length = spec;
                        while (spec--) {
                            this[spec] = 0.0;
                        }
                    }
                } else if (spec != null && typeof spec.length === "number") {
                    this.length = spec.length;
                    for (i = 0, imax = spec.length; i < imax; i++) {
                        this[i] = Number(spec[i]);
                    }
                }
            }
            function f() {}
            f.prototype = Array.prototype;
            Float32Array.prototype = new f();
            Float32Array.prototype.set = function(lis, offset) {
                var i, imax;
                offset = offset || 0;
                for (i = 0, imax = lis.length; i < imax; i++) {
                    this[i + offset] = lis[i];
                }
            };
            global.Float32Array = Float32Array;
        }());
    }
    
    var InitializePlayer = function(options) {
        var samplerate, channel, duration, slice, calcBits;
        calcBits = function(val) {
            return Math.ceil(Math.log(val) * Math.LOG2E);
        };

        duration = options.duration;
        slice    = options.slice;

        this.SAMPLERATE = samplerate = options.samplerate;
        this.CHANNEL    = channel    = options.channel;

        this.STREAM_FULL_BITS = calcBits(samplerate * duration / 1000);
        this.STREAM_FULL_SIZE = 1 << this.STREAM_FULL_BITS;
        this.STREAM_CELL_BITS = calcBits(this.STREAM_FULL_SIZE / slice);
        this.STREAM_CELL_SIZE = 1 << this.STREAM_CELL_BITS;
        this.STREAM_CELL_COUNT = this.STREAM_FULL_SIZE / this.STREAM_CELL_SIZE;

        this.NONE_STREAM_FULL_SIZE   = new Float32Array(this.STREAM_FULL_SIZE);
        this.NONE_STREAM_FULL_SIZExC = new Float32Array(this.STREAM_FULL_SIZE * channel);
        this.NONE_STREAM_CELL_SIZE   = new Float32Array(this.STREAM_CELL_SIZE);
        this.NONE_STREAM_CELL_SIZExC = new Float32Array(this.STREAM_CELL_SIZE * channel);

        this.PLAY_INTERVAL = (this.STREAM_FULL_SIZE / samplerate) * 1000;

        this.finished = true;
        this._generator = null;
    };
    
    var WebkitPlayer = function() {
        function WebkitPlayer() {
            this.initialize.apply(this, arguments);
        }
        
        WebkitPlayer.prototype = {
            initialize: function(options) {
                var ctx, node;

                ctx = new webkitAudioContext();
                options.samplerate = ctx.sampleRate;
                InitializePlayer.call(this, options);
                
                node = ctx.createJavaScriptNode(this.STREAM_FULL_SIZE, 1, this.CHANNEL);
                
                this._context = ctx;
                this._node    = node;
            },
            play: function(generator) {
                var func;
                
                if (this.finished) {
                    this._generator = generator;
                    this.finished = false;
                    if (this.CHANNEL == 2) {
                        func = function (event) {
                            var stream, dataL, dataR, i, j;
                            stream = generator.next();
                            dataL = event.outputBuffer.getChannelData(0);
                            dataR = event.outputBuffer.getChannelData(1);
                            i = dataL.length;
                            j = i * 2;
                            while (i--) {
                                dataL[i] = stream[j    ];
                                dataR[i] = stream[j + 1];
                                j -= 2;
                            }
                        };
                    } else {
                        func = function (event) {
                            var stream, dataL, dataR, i;
                            stream = generator.next();
                            dataL = event.outputBuffer.getChannelData(0);
                            dataR = event.outputBuffer.getChannelData(1);
                            i = dataL.length;
                            while (i--) {
                                dataL[i] = dataR[i] = stream[i];
                            }
                        };                       
                    }
                    this._node.onaudioprocess = func;
                    this._node.connect(this._context.destination);
                }
            },
            stop: function() {
                this._node.disconnect();
                this.finished = true;
            },
            isPlaying: function() {
                return !this.finished;
            },
            getCore: function() {
                return this._node;
            }
        };
        WebkitPlayer.getType = function () {
            return "WebkitPlayer";
        };
        return WebkitPlayer;
    };

    var MozPlayer = function () {
        var MozPlayer = function() {
            this.initialize.apply(this, arguments);
        };
        MozPlayer.prototype = {
            initialize: function(options) {
                var self, audio;
                self = this;
                
                audio = new Audio();
                audio.mozSetup(options.channel, options.samplerate);
                options.samplerate = audio.mozSampleRate;
                options.channel    = audio.mozChannels;
                InitializePlayer.call(this, options);

                this._audio = audio;
                this._stream  = this.NONE_STREAM_FULL_SIZExC;

                try {
                    this._timer = new Worker(options.timerpath);
                    this._timer.onmessage = function(e) {
                        self._audio.mozWriteAudio(self._stream);
                        self._stream = self._generator.next();
                    };                
                } catch (e) {
                    this._timer = null;
                }
                this._timerId = 0;
            },
            play: function(generator) {
                var self = this;
                if (this.finished) {
                    this.finished = false;
                    this._generator = generator;
                    if (this._timer) {
                        this._timer.postMessage(this.PLAY_INTERVAL);
                    } else {
                        if (this._timerId !== 0) {
                            clearInterval(this._timerId);
                            this._timerId = 0;
                        }
                        this._timerId = setInterval(function() {
                            self._audio.mozWriteAudio(self._stream);
                            self._stream = self._generator.next();
                        }, this.PLAY_INTERVAL);
                    }
                }
            },
            stop: function() {
                if (this._timer) {
                    this._timer.postMessage(0);
                } else if (this._timerId !== 0) {
                    clearInterval(this._timerId);
                    this._timerId = 0;
                }
                this.finished = true;
            },
            isPlaying: function() {
                return !this.finished;
            },
            getCore: function() {
                return this._audio;
            }
        };
        MozPlayer.getType = function () {
            return "MozPlayer";
        };
        return MozPlayer;
    };

    var HTML5AudioPlayer = function() {
        var HTML5AudioPlayer = function() {
            this.initialize.apply(this, arguments);
        };
        HTML5AudioPlayer.prototype = {
            initialize: function(options) {
                var self = this;
                
                InitializePlayer.call(this, options);

                this._stream = new Audio();

                this._waveheader = (function(samplerate, channel, samples) {
                    var l1, l2, waveBytes;
                    waveBytes = samples * channel * 2;
                    l1 = waveBytes - 8;
                    l2 = l1 - 36;
                    return String.fromCharCode(
                        0x52, 0x49, 0x46, 0x46, // 'RIFF'
                        (l1 >>  0) & 0xFF,
                        (l1 >>  8) & 0xFF,
                        (l1 >> 16) & 0xFF,
                        (l1 >> 24) & 0xFF,
                        0x57, 0x41, 0x56, 0x45, // 'WAVE'
                        0x66, 0x6D, 0x74, 0x20, // 'fmt '
                        0x10, 0x00, 0x00, 0x00, // byte length
                        0x01, 0x00,    // linear pcm
                        channel, 0x00, // channel
                        (samplerate >>  0) & 0xFF,
                        (samplerate >>  8) & 0xFF,
                        (samplerate >> 16) & 0xFF,
                        (samplerate >> 24) & 0xFF,
                        ((samplerate * channel * 2) >> 0) & 0xFF,
                        ((samplerate * channel * 2) >> 8) & 0xFF,
                        ((samplerate * channel * 2) >> 16) & 0xFF,
                        ((samplerate * channel * 2) >> 24) & 0xFF,
                        2 * channel, 0x00,      // block size
                        0x10, 0x00,             // 16bit
                        0x64, 0x61, 0x74, 0x61, // 'data'
                        (l2 >>  0) & 0xFF,
                        (l2 >>  8) & 0xFF,
                        (l2 >> 16) & 0xFF,
                        (l2 >> 24) & 0xFF);
                })(this.SAMPLERATE, this.CHANNEL, this.STREAM_FULL_SIZE);

                this._timer = new Worker(options.timerpath);
                this._timer.onmessage = function(e) {
                    var stream, wave, i, imax, y, fromCharCode;
                    
                    self._stream.play();
                    
                    stream = self._generator.next();
                    wave = self._waveheader;
                    fromCharCode = String.fromCharCode;
                    
                    for (i = 0, imax = stream.length; i < imax; i++) {
                        y = (stream[i] * 32767.0) | 0;
                        wave += fromCharCode(y & 0xFF, (y >> 8) & 0xFF);
                    }
                    self._stream = new Audio("data:audio/wav;base64," + btoa(wave));
                };                
            },
            play: function(generator) {
                if (this.finished) {
                    this.finished = false;
                    this._generator = generator;
                    this._timer.postMessage(this.PLAY_INTERVAL);
                }
            },
            stop: function() {
                this._timer.postMessage(0);
                this.finished = true;
            },
            isPlaying: function() {
                return !this.finished;
            },
            getCore: function() {
                return null;
            }
        };
        HTML5AudioPlayer.getType = function() {
            return "HTML5AudioPlayer";
        };
        return HTML5AudioPlayer;
    };
    
    
    
    pico.getplayer = (function() {
        var playerObject = (function() {
            var type, a;
            type = (typeof webkitAudioContext);
            if (type === "function" || type === "object") {
                return WebkitPlayer();
            }
            type = (typeof Audio);
            if (type === "function" || type === "object") {
                a = new Audio();
                type = (typeof a.mozSetup);
                if (type === "function" || type === "object") {
                    return MozPlayer();
                } else {
                    a = global.navigator.userAgent;
                    if (a.indexOf("Opera") !== -1) {
                        return HTML5AudioPlayer();
                    }
                }
            }
            return null;
        }());
        
        if (playerObject != null) {
            return function(options) {
                var samplerate, x;
                options = options || {};
                samplerate = options.samplerate;
                if (samplerate !== 8000 && samplerate !== 11025 &&
                   samplerate !== 12000 && samplerate !== 16000 &&
                   samplerate !== 16000 && samplerate !== 22050 &&
                   samplerate !== 32000 && samplerate !== 44100 &&
                   samplerate !== 48000) {
                    samplerate = 44100;
                }
                options.samplerate = samplerate;
                if (options.channel !== 1 && options.channel !== 2) {
                    options.channel = 1;
                }
                options.duration = options.duration || 50;
                if (options.duration < 50) {
                    options.duration = 50;
                }
                options.slice = options.slice || 32;
                if (playerObject.getType() === 'HTML5AudioPlayer') {
                    if (options.duration < 400) {
                        x = 400 / options.duration;
                        options.duration *= x;
                        options.slice    *= x;
                    }
                }
                options.timerpath = options.timerpath || "./muteki-timer.js";
                return new playerObject(options);
            };
        } else {
            return function(options) {
                return null;
            };
        }
    }());
}(this, this.pico));
