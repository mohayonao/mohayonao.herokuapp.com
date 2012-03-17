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
            this._signal = new Float32Array(sys.STREAM_FULL_SIZE);
            this._func = function(t) { return 0; };
            this._t = 0;
            this._tstep = 8000 / sys.SAMPLERATE;
            this._list = new Uint8Array(128);
        };
        
        $this.compose = function(list) {
            this._func = function(t) {
                return list[t & 127];
            };
        };
        
        $this.next = function() {
            var signal,func;
            var t, tstep;
            var i, j, k, v;
            
            signal = this._signal;
            func = this._func;
            t = this._t;
            tstep = this._tstep;
            
            k = 0;
            for (i = signal.length / 128; i--; ) {
                for (j = 0; j < 128; j++) {
                    signal[k++] = (func(t) & 0x0ff) / 128 - 0.5;
                    t += tstep;
                }
            }
            this._t = t;
            
            return signal;
        };
        
        return BinaryTrack;
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
            
            this._file = null;
            this._fileReadIndex = 0;
            this._fileReadCount = 0;
            
            this._amp = 1.0;
            this._nullindex = 0;
            
            this.efx = new pico.effects.Reverb(sys, {depth:0.25});
        };
        
        $this.play = function(callback) {
            this._callback = callback || function() {};
            this.sys.play(this);
        };

        $this.stop = function() {
            this.sys.stop();
        };
        
        $this.set = function(file) {
            file.slice = file.webkitSlice || file.mozSlice;
            this._file = file;
            this._fileReadIndex = 0;
            this._amp = 1.0;
            this._nullindex = 0;
        };
        
        $this.next = function() {
            var self;
            var signal, s;
            var amp;
            var i;
            
            self   = this;
            signal = new Float32Array(this.sys.STREAM_FULL_SIZE);
            amp = this._amp * 0.25;
            
            s = this._track.next();
            for (i = s.length; i--; ) {
                signal[i] += s[i] * amp;
            }
            this.efx.process(signal);
            
            if (this._fileReadCount === 0) {
                this.fileread(function(list) {
                    self._track.compose(list);
                    self.view.set(list);
                });
                this._fileReadCount = 1;
            } else {
                --this._fileReadCount;
            }
            
            return signal;
        };
        
        $this.fileread = function(callback) {
            var self;
            var blob, size, begin, end;
            var reader, x;
            
            self = this;
            size = this._width;
            begin = this._fileReadIndex;
            end   = begin + size;
            if (this._file.fileSize < end) {
                end = this._file.fileSize;
                this._nullindex += 0.5;
                this._amp = 1.0 - (this._nullindex / this._height);
                if (this._amp < 0.0) this._amp = 0.0;
                if (this._nullindex > this._height) {
                    if (this._callback) this._callback();
                }
            }
            blob = this._file.slice(begin, end);
            this._fileReadIndex = end;
            
            reader = new FileReader();
            reader.onload = function(e) {
                var result, list, i;
                result = e.target.result;
                list = new Uint8Array(size);
                for (i = result.length; i--; ) {
                    list[i] = result.charCodeAt(i);
                }
                callback(list);
            };
            reader.readAsBinaryString(blob);
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
            
            sys.set(e.originalEvent.dataTransfer.files[0])
            sys.play(function() {
                jQuery("#stop").click();
            });
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
    }
});
