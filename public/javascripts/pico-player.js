/**
 * pico-player.js v2.0
 * simple audio stream interface with Web Audio API, Audio Data API or HTMLAudioElement
 */
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
            Float32Array.prototype.subarray = function(begin, end) {
                return new Float32Array(this.slice(begin, end));
            };
            global.Float32Array = Float32Array;
        }());
    }
    
    
    var extend = function(Klass, SuperKlass) {
        var F = function() {};
        F.prototype = SuperKlass.prototype;
        Klass.prototype = new F();
        return Klass.prototype;
    };
    
    
    var AbstractBasePlayer = (function() {
        var AbstractBasePlayer = function() {
            
        }, $this = AbstractBasePlayer.prototype;
        
        $this.initplayer = function(options) {
            var samplerate, channel, play_interval, cell_interval, calcbits;
            calcbits = function(val) {
                return Math.ceil(Math.log(val) * Math.LOG2E);
            };
            
            play_interval = options.play_interval;
            cell_interval = 2;
            
            this.SAMPLERATE = samplerate = options.samplerate;
            this.CHANNEL    = channel    = options.channel;
            
            this.STREAM_FULL_BITS = calcbits(samplerate * play_interval / 1000);
            this.STREAM_FULL_SIZE = 1 << this.STREAM_FULL_BITS;
            this.STREAM_CELL_BITS = calcbits(samplerate * cell_interval / 1000);
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
        $this.isPlaying = function() {
            return !this.finished;
        };
        return AbstractBasePlayer;
    }());
    
    
    /**
     * WebkitPlayer (for Chrome, Safari)
     */
    var WebkitPlayer = (function() {
        var WebkitPlayer = function() {
            this.initialize.apply(this, arguments);
        }, $this = extend(WebkitPlayer, AbstractBasePlayer);
        
        $this.initialize = function(options) {
            var ctx, node;
            
            ctx = new webkitAudioContext();
            options.samplerate = ctx.sampleRate;
            
            this.initplayer(options);
            
            node = ctx.createJavaScriptNode(this.STREAM_FULL_SIZE, 1, this.CHANNEL);
            
            this._context = ctx;
            this._node    = node;
        };
        $this.play = function(generator) {
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
                        j = i << 1;
                        while (i--) {
                            j -= 2;
                            dataL[i] = stream[j    ];
                            dataR[i] = stream[j + 1];
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
        };
        $this.stop = function() {
            this._node.disconnect();
            this.finished = true;
        };
        $this.__defineGetter__("core", function() {
            return {context:this._context, node:this._node};
        });
        $this.__defineGetter__("PLAYER_TYPE", function() {
            return WebkitPlayer.PLAYER_TYPE;
        });
        WebkitPlayer.__defineGetter__("PLAYER_TYPE", function() {
            return "WebkitPlayer";
        });
        return WebkitPlayer;
    }());
    
    
    /**
     * 
     */
    var AbstractTimerPlayer = (function () {
        var AbstractTimerPlayer = function() {
            
        }, $this = extend(AbstractTimerPlayer, AbstractBasePlayer);
        
        $this.inittimer = function() {
            var self = this;
            
            var timerpath = (function() {
                var BlobBuilder, URL, MutekiTimer;
                BlobBuilder = window.WebkitBlobBuilder || window.MozBlobBuilder;
                URL = window.URL || window.webkitURL;
                if (BlobBuilder && URL) {
                    MutekiTimer = new BlobBuilder();
                    MutekiTimer.append("var timerId = 0;");
                    MutekiTimer.append("this.onmessage = function(e) {");
                    MutekiTimer.append("  if (timerId !== 0) {");
                    MutekiTimer.append("    clearInterval(timerId);");
                    MutekiTimer.append("    timerId = 0;");
                    MutekiTimer.append("  }");
                    MutekiTimer.append("  if (e.data > 0) {");
                    MutekiTimer.append("    timerId = setInterval(function() {");
                    MutekiTimer.append("    postMessage(null);");
                    MutekiTimer.append("    }, e.data);");
                    MutekiTimer.append("  }");
                    MutekiTimer.append("};");
                    return URL.createObjectURL(MutekiTimer.getBlob());
                }
                return null;
            }());
            
            this._timer = null;
            if (timerpath !== null) {
                try {
                    this._timer = new Worker(timerpath);
                    this._timer.onmessage = function(e) {
                        self.play_impl();
                    };                
                } catch (e) {
                    console.warn("WebWorker is dead.");
                }
            }
            this._timerId = 0;
        };
        $this.play = function(generator) {
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
                        self.play_impl();
                    }, this.PLAY_INTERVAL);
                }
            }
        };
        $this.stop = function() {
            if (this._timer) {
                this._timer.postMessage(0);
            } else if (this._timerId !== 0) {
                clearInterval(this._timerId);
                this._timerId = 0;
            }
            this.finished = true;
        };
        return AbstractTimerPlayer;
    }());
    
    
    /**
     * MozPlayer (for Firefox)
     */
    var MozPlayer = (function () {
        var MozPlayer = function() {
            this.initialize.apply(this, arguments);
        }, $this = extend(MozPlayer, AbstractTimerPlayer);
        
        $this.initialize = function(options) {
            var self, audio;
            self = this;
            
            audio = new Audio();
            audio.mozSetup(options.channel, options.samplerate);
            options.samplerate = audio.mozSampleRate;
            options.channel    = audio.mozChannels;
            
            this.initplayer(options);
            this.inittimer();
            
            this._audio = audio;
            this._stream = this.NONE_STREAM_FULL_SIZExC;
        };
        $this.play_impl = function() {
            this._audio.mozWriteAudio(this._stream);
            this._stream = this._generator.next();
        };
        $this.__defineGetter__("core", function() {
            return {audio: this._audio};
        });
        $this.__defineGetter__("PLAYER_TYPE", function() {
            return MozPlayer.PLAYER_TYPE;
        });
        MozPlayer.__defineGetter__("PLAYER_TYPE", function() {
            return "MozPlayer";
        });
        return MozPlayer;
    }());
    
    
    /**
     * DynamicWavPlayer (for Opera)
     */
    var DynamicWavPlayer = (function() {
        var DynamicWavPlayer = function() {
            this.initialize.apply(this, arguments);
        }, $this = extend(DynamicWavPlayer, AbstractTimerPlayer);
        
        $this.initialize = function(options) {
            var stream_size;
            
            this.initplayer(options);
            this.inittimer();
            
            this._stream = new Audio();
            this._stream_size = this.STREAM_FULL_SIZE * this.CHANNEL;
            
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
        };
        $this.play_impl = function() {
            var stream, wave, i, imax, y, fromCharCode;
            
            this._stream.play();
            
            stream = this._generator.next();
            wave = this._waveheader;
            fromCharCode = String.fromCharCode;
            
            for (i = 0, imax = stream.length; i < imax; i++) {
                y = (stream[i] * 32767.0) | 0;
                wave += fromCharCode(y & 0xFF, (y >> 8) & 0xFF);
            }
            this._stream = new Audio("data:audio/wav;base64," + btoa(wave));
        };
        $this.__defineGetter__("core", function() {
            return {};
        });
        $this.__defineGetter__("PLAYER_TYPE", function() {
            return DynamicWavPlayer.PLAYER_TYPE;
        });
        DynamicWavPlayer.__defineGetter__("PLAYER_TYPE", function() {
            return "DynamicWavPlayer";
        });
        return DynamicWavPlayer;
    }());
    
    
    /**
     * NoOperationPlayer (for others)
     */
    var NopPlayer = (function () {
        var NopPlayer = function() {
            this.initialize.apply(this, arguments);
        }, $this = extend(NopPlayer, AbstractTimerPlayer);
        
        $this.initialize = function(options) {
            this.initplayer(options);
            this.inittimer();
        };
        $this.play_impl = function() {
            this._generator.next();
        };
        $this.__defineGetter__("core", function() {
            return {};
        });
        $this.__defineGetter__("PLAYER_TYPE", function() {
            return NopPlayer.PLAYER_TYPE;
        });
        NopPlayer.__defineGetter__("PLAYER_TYPE", function() {
            return "NopPlayer";
        });
        return NopPlayer;
    }());
    
    
    pico.getplayer = (function() {
        var PlayerKlass = (function() {
            var type, a;
            type = (typeof webkitAudioContext);
            if (type === "function" || type === "object") {
                return WebkitPlayer;
            }
            type = (typeof Audio);
            if (type === "function" || type === "object") {
                a = new Audio();
                type = (typeof a.mozSetup);
                if (type === "function" || type === "object") {
                    return MozPlayer;
                } else if (global.navigator.userAgent.indexOf("Opera") !== -1) {
                    return DynamicWavPlayer;
                }
            }
            return NopPlayer;
        }());
        
        return function(options) {
            var playerklass;
            options = options || {};
            if (![ 8000, 11025, 12000, 16000,
                  22050, 32000, 44100, 48000].some(function(x) { 
                      return x === options.samplerate;
                  })) options.samplerate = 44100;
            if (options.channel !== 1 && options.channel !== 2) {
                options.channel = 1;
            }
            
            playerklass = PlayerKlass;
            if (playerklass.PLAYER_TYPE === WebkitPlayer.PLAYER_TYPE) {
                options.play_interval = 25;
            } else if (playerklass.PLAYER_TYPE === MozPlayer.PLAYER_TYPE) {
                options.play_interval = 40;
            } else if (playerklass.PLAYER_TYPE === DynamicWavPlayer.PLAYER_TYPE) {
                options.play_interval = 200;
            } else if (playerklass.PLAYER_TYPE === NOPPlayer.PLAYER_TYPE) {
                options.play_interval = 100;
            }
            
            return new playerklass(options);
        };
    }());
}(this, this.pico));
