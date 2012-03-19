jQuery(function() {
    var sys, player = pico.getplayer();
    
    var BitmapView = (function() {
        var BitmapView = function() {
            initialize.apply(this, arguments);
        }, $this = BitmapView.prototype;
        
        var initialize = function(elem, options) {
            var width, height;
            var $canvas, canvas;
            var i;
            
            elem = jQuery(elem);
            width  = elem.width()  || jQuery(document).width();
            height = elem.height() || jQuery(document).height();
            $canvas = jQuery(canvas = document.createElement("canvas"))
                .width(width).height(height)
                .css("position", "absolute")
                .css("top", "0px").css("left", "0px")
                .css("z-index", -999);
            
            this.width  = canvas.width  = options.width;
            this.height = canvas.height = options.height;
            
            this._elem = elem;
            this._canvas  = $canvas;
            this._context = canvas.getContext("2d");
            this._imagedata = this._context.getImageData(0, 0, this.width, this.height);
            for (i = this._imagedata.data.length; i--; ) {
                this._imagedata.data[i] = 255;
            }
            this._elem.append(this._canvas);
        };
        
        $this.set = function(list) {
            var data, widthStep;
            var i, imax, j, x;
            
            data = this._imagedata.data;
            widthStep = this.width * 4;
            for (i = 0, imax = data.length - widthStep; i < imax; i++) {
                data[i] = data[i + widthStep];
            }
            
            j = i;
            for (i = 0, imax = list.length; i < imax; i++) {
                x = list[i];
                if (x === 0x00) {
                    data[j++] = 0xff;
                    data[j++] = 0xff;
                    data[j++] = 0xff;
                } else if (x <= 0x1f) {
                    data[j++] = 0x33;
                    data[j++] = 0xff;
                    data[j++] = 0xff;
                } else if (x <= 0x7f) {
                    data[j++] = 0xff;
                    data[j++] = 0x33;
                    data[j++] = 0x33;
                } else {
                    data[j++] = 0x00;
                    data[j++] = 0x00;
                    data[j++] = 0x33;
                }
                j++;
            }
            this._context.putImageData(this._imagedata, 0, 0);
        };
        
        $this.resize = function() {
            var width, height;
            width  = this._elem.width()  || jQuery(document).width();
            height = this._elem.height() || jQuery(document).height();
            this._canvas.width(width);
            this._canvas.height(height);
        };
        
        return BitmapView;
    }());
    
    
    var BinaryTrack = (function() {
        var BinaryTrack = function() {
            initialize.apply(this, arguments);
        }, $this = BinaryTrack.prototype;
        
        var initialize = function(sys, options) {
            this.sys = sys;
            this._signal = new Float32Array(128);
            this._func = function(t) { return 0; };
            this._t = 0;
            this._tstepTable = (function() {
                var dx, list;
                dx = Math.pow(2, 1/12);
                list = [];
                for (i = 0; i <= 24; i++) {
                    list[i] = 8000 * Math.pow(dx, i-12) / sys.SAMPLERATE;
                }
                return list;
            }());
            this._tstep = this._tstepTable[12];
            this._list = new Uint8Array(128);
        };
        
        $this.compose = function(list) {
            this._func = function(t) {
                return list[t & 127];
            };
        };
        
        $this.setTStep = function(v) {
            if (0 <= v && v < this._tstepTable.length) {
                this._tstep = this._tstepTable[v|0];
            }
        };
        
        $this.next = function() {
            var signal,func;
            var t, tstep;
            var i;
            
            signal = this._signal;
            func = this._func;
            t = this._t;
            tstep = this._tstep;
            
            for (i = 0; i < 128; i++) {
                signal[i] = (func(t) & 0x0ff) / 128 - 0.5;
                t += tstep;
            }
            this._t = t;
            
            return signal;
        };
        
        return BinaryTrack;
    }());

    var FileStepLoader = (function() {
        var FileStepLoader = function() {
            initialize.apply(this, arguments);
        }, $this = FileStepLoader.prototype;

        var initialize = function(sys, options) {
            this._readBytes =  512;
            this._fetchBytes = 128;
            
            this._buffers = [];
            this._bufferReadIndex = 0;
            
            this._file = null;
            this._fileReadIndex = 0;
            this._mutex = 0;
            this._reset = false;
            
            this._noneArray = new Uint8Array(this._readBytes);
            this._currentBuffer = this._noneArray;
        };
        
        $this.set = function(file, callback) {
            var self;
            
            self = this;
            this._file = file;
            this._file.slice = file.webkitSlice || file.mozSlice;
            this._mutex = 0;
            this._buffers = [];
            
            this._reset = true;
            this.fileread(function() {
                self._bufferReadIndex = 0;
                if (callback) callback();
            });
        };
        
        $this.fileread = function(callback) {
            var self;
            var blob, size, begin, end;
            var reader;
            
            if (this._mutex === 0) {
                this._mutex = 1;
                self  = this;
                size  = this._readBytes;
                if (this._reset) {
                    begin = 0;
                    this._reset = false;
                } else {
                    begin = this._fileReadIndex;
                }
                end = begin + size;
                
                blob = this._file.slice(begin, end);
                this._fileReadIndex = end;
                
                reader = new FileReader();
                reader.onload = function(e) {
                    var result, buf, i;
                    result = e.target.result;
                    buf = new Uint8Array(size);
                    for (i = result.length; i--; ) {
                        buf[i] = result.charCodeAt(i);
                    }
                    self._buffers.push(buf);
                    self._mutex = 0;
                    if (callback) callback();
                };
                reader.readAsBinaryString(blob);
            }
        };
        
        $this.fetch = function() {
            var begin, end;
            var buffer;
            begin = this._bufferReadIndex;
            end   = begin + this._fetchBytes;
            this._bufferReadIndex = end;
            
            buffer = this._currentBuffer.subarray(begin, end);
            if (this._readBytes <= end) {
                this._currentBuffer   = this._buffers.shift() || this._noneArray;
                this._bufferReadIndex = 0;
            } else if (this._buffers.length === 0) {
                this.fileread();
            }
            return buffer;
        };
        
        return FileStepLoader
    }());
    
    
    var SoundSystem = (function() {
        var SoundSystem = function() {
            initialize.apply(this, arguments);
        }, $this = SoundSystem.prototype;
        
        var initialize = function(sys, options) {
            this.sys = sys;
            this.view = options.view;
            this._width  = this.view.width;
            this._height = this.view.height;
            
            this._track = new BinaryTrack(sys);
            
            this._amp = 1.0;
            this.reverb = new pico.effects.Reverb(sys, {depth:0.25});
            this.filter = new pico.effects.IIRFilter(sys, {});
            
            this._stepLoader = new FileStepLoader(sys, {});
            
            this._mute = false;
            this._sampleCount = 0;
            this.setBPM(180);
        };
        
        $this.setBPM = function(bpm) {
            this._bpm = bpm;
            this._sampleCountMax = (60 / this._bpm) * this.sys.SAMPLERATE * (4/16);
        };

        $this.setMute = function(mute) {
            this._mute = mute;
        };
        
        $this.play = function(file) {
            var self = this;
            this._stepLoader.set(file, function() {
                self._amp = 1.0;
                self._sampleCount = 0;
                self.sys.play(self);
            });
        };
        
        $this.stop = function() {
            this.sys.stop();
        };
        
        $this.next = function() {
            var self;
            var bytes;
            var signal, s;
            var amp;
            var i, j, k;
            
            self   = this;
            signal = new Float32Array(this.sys.STREAM_FULL_SIZE);
            amp = this._amp * 0.25;
            if (this._mute) {
                amp = 0.0;
            }
            
            k = 0;
            for (i = signal.length/128; i--; ) {
                if (this._sampleCount <= 0) {
                    bytes = this._stepLoader.fetch();
                    this._track.compose(bytes);
                    this.view.set(bytes);
                    this._sampleCount += this._sampleCountMax;
                }
                this._sampleCount -= 128;
                
                s = this._track.next();
                for (j = 0; j < 128; j++) {
                    signal[k++] = s[j] * amp;
                }
            }
            this.filter.process(signal);
            this.reverb.process(signal);
            
            return signal;
        };
        
        return SoundSystem;
    }());
    
    // main
    if (player.PLAYER_TYPE === "WebkitPlayer" || player.PLAYER_TYPE === "MozPlayer") {
        sys  = new SoundSystem(player,
                               {view:new BitmapView(document.body, {width:128, height:64})});
        // UI
        jQuery(document.body).on("dragover", function(e) {
            e.preventDefault();
            e.stopPropagation();
        }).on("drop", function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            sys.play(e.originalEvent.dataTransfer.files[0]);
            jQuery("#stop").show();
        });
        
        jQuery("#stop").on("click", function(e) {
            sys.stop();
            jQuery("#stop").hide();        
        }).click();
    
        jQuery(window).on("resize", function(e) {
            sys.view.resize();
        });
        
        jQuery("#hint").text("drag & drop a file");
        
        (function() {
            var mute = false;
            var tstep = 12;
            var reverb = 32;
            var quit_tap = 0;
            var bpm = 180;
            var bpm_tap = 0;
            var cutoff = 880;
            var resonance = 0.1;
            var origin = location.href;
            var timerId = 0;
            
            jQuery(window).on("keydown", function(e) {
                var result = "";
                var msec;
                switch (e.keyCode) {

                //// System
                case 90: // 'z'
                    jQuery("#header").toggle("slow");
                    break;
                case 81: // 'q'
                    if (quit_tap === 0) {
                        quit_tap = +new Date();
                    } else {
                        msec = +new Date() - quit_tap;
                        if (msec < 1250) {
                            jQuery("#stop").click();
                            jQuery("#header").show("slow");
                        } else {
                            quit_tap = +new Date();
                        }
                    }
                    break;
                case 88: // 'x'
                    mute = !mute;
                    sys.setMute(mute);
                    result = "mute=" + (mute?"ON":"OFF");
                    break;

                ///// BPM
                case 65: // 'a'
                    bpm -= 1;
                    if (bpm < 15) bpm = 15;
                    sys.setBPM(bpm);
                    result = "bpm=" + bpm;
                    break;
                case 83: // 's'
                    bpm += 1;
                    if (480 < bpm) bpm = 480;
                    sys.setBPM(bpm);
                    result = "bpm=" + bpm;
                    break;
                case 32: // SPC
                    if (bpm_tap === 0) {
                        bpm_tap = +new Date();
                    } else {
                        msec = +new Date() - bpm_tap;
                        if (msec > 1250) {
                            bpm_tap = +new Date();
                        } else {
                            bpm_tap = 0;
                            bpm = (60000/msec)|0;
                            sys.setBPM(bpm);
                            result = "bpm=" + bpm;
                        }
                    }
                    break;
                
                ///// pitch
                case 85: // 'u'
                    tstep -= 1;
                    if (tstep < 0) tstep = 0;
                    sys._track.setTStep(tstep);
                    result = "pitch=" + (tstep-12);
                    break;
                case 73: // 'i'
                    tstep += 1;
                    if (24 < tstep) tstep = 24;
                    sys._track.setTStep(tstep);
                    result = "pitch=" + (tstep-12);
                    break;
                
                ///// Reverb
                case 79: // 'o'
                    reverb -= 1;
                    if (reverb < 0) reverb = 0;
                    sys.reverb.setDepth(reverb/128);
                    result = "reverb=" + reverb;
                    break;
                case 80: // 'p'
                    reverb += 1;
                    if (128 < reverb) reverb = 128;
                    sys.reverb.setDepth(reverb/128);
                    result = "reverb=" + reverb;
                    break;
                    
                ///// LowPass Filger
                case 78: // 'n'
                    cutoff *= 0.916666;
                    if (cutoff < 110) cutoff = 110;
                    sys.filter.setCutoff(cutoff);
                    result = "cutoff=" + cutoff.toFixed(0);
                    break;
                case 77: // 'm'
                    cutoff *= 1.0833333;
                    if (14080 < cutoff) cutoff = 14080;
                    sys.filter.setCutoff(cutoff);
                    result = "cutoff=" + cutoff.toFixed(0);
                    break;
                case 75: // 'l'
                    resonance -= 0.05;
                    if (resonance < 0.1) resonance = 0.1;
                    sys.filter.setResonance(resonance);
                    result = "resonance=" + resonance.toFixed(2);
                    break;
                case 76: // 'k'
                    resonance += 0.05;
                    if (1.0 < resonance) resonance = 1.0;
                    sys.filter.setResonance(resonance);
                    result = "resonance=" + resonance.toFixed(2);
                    break;
                }
                
                if (result) {
                    history.pushState(null, null, origin + '?' + result);
                    if (timerId !== 0) {
                        clearTimeout(timerId);
                    }
                    timerId = setTimeout(function() {
                        history.pushState(null, null, origin);
                        timerId = 0;
                    }, 2000);
                }
            });
        }());
    }
});
