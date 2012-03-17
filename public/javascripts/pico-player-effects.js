/**
 * pico.effects
 * effectors
 */
(function (pico) {
    if (pico.effects === undefined) {
        pico.effects = {};
    }
    var SAMPLERATE = 48000;
    
    /**
     * Initialize pico.utils
     */
    pico.effects.initialize = function(player) {
        SAMPLERATE = player.SAMPLERATE;
    };

    /**
     * Distortion
     */
    var Distortion = (function() {
        var Distortion = function() {
            initialize.apply(this, arguments);
        }, $this = Distortion.prototype;
        
        var initialize = function(sys, options) {
            this.sys = sys;
            this._gain  = 100;
            this._level = 0.5;
        };
        $this.setParameters = function(options) {
            options = options || {};
            if (typeof(options.gain) === "number") {
                this._gain = options.gain;
            }
            if (typeof(options.level) === "number") {
                this._level = options.level;
            }
        };
        $this.process = function(signal) {
            var i, v;
            var gain, level;
            gain  = this._gain;
            level = this._level;
            for (i = signal.length; i--; ) {
                v = signal[i] * gain;
                if (v > 1.0) v = 1.0;
                else if (v < -1.0) v = -1.0;
                signal[i] = v * level;
            }
            return signal;
        };
        return Distortion;
    }());
    pico.effects.Distortion = Distortion;
    
    
    /**
     * Delay
     */
    var Delay = (function() {
        var Delay = function() {
            initialize.apply(this, arguments);
        }, $this = Delay.prototype;
        
        var initialize = function(sys, options) {
            var ch;
            options = options || {};
            this.sys = sys;
            this._ch = (options.mode === "stereo") ? 2 : 1;
            this._buffer = new Float32Array(sys.SAMPLERATE * 2 * this._ch);
            this.init(options);
        };
        $this.init = function(options) {
            this._head  = ((0.1 * this.sys.SAMPLERATE)|0) * this._ch;
            this._tail  = 0;
            this._depth = 0.25;
            this.setParameters(options);
        };
        $this.setParameters = function(params) {
            var value, buffer, i;
            params = params || {};
            if (typeof(params.depth) === "number") {
                value = params.depth;
                if (value < 0) value = 0;
                else if (value > 1.0) value = 1.0;
                this._depth = value;
            }
            if (typeof(params.duration) === "number") {
                value = params.duration;
                if (value < 0) value = 0;
                else if (value > 2.0) value = 2.0;
                this._duration = value;
                this._head = ((value * this.sys.SAMPLERATE)|0) * this._ch;
                this._tail = 0;
                buffer = this._buffer;
                for (i = buffer.length; i--; ) {
                    buffer[i] = 0.0;
                }
            }
        };
        $this.process = function(signal) {
            var buffer, head, tail;
            var v0, v1, v2;
            var a1, a2;
            var i, imax;

            if (this._depth !== 0) {
                buffer = this._buffer;
                head = this._head;
                tail = this._tail;
                a1 = 1.0 - this._depth;
                a2 = this._depth;
                for (i = 0, imax = signal.length; i < imax; i++) {
                    buffer[head] = signal[i];
                    
                    v1 = signal[i];
                    v2 = buffer[tail]
                    v0 = v1 * a1 + v2 * a2;
                    signal[i] = v0;
                    
                    head += 1;
                    tail += 1;
                    if (head >= buffer.length) head = 0;
                    if (tail >= buffer.length) tail = 0;
                }
                this._head = head;
                this._tail = tail;
            }
            return signal;
        };
        return Delay;
    }());
    pico.effects.Delay = Delay;
    
    
    /**
     * Reverb
     */
    var Reverb = (function() {
        var Reverb = function() {
            initialize.apply(this, arguments);
        }, $this = Reverb.prototype;
        
        var initialize = function(sys, options) {
            this.sys = sys;
            options = options || {};
            
            this._efxs = (function(cnt, dx, ax) {
                var result = [];
                var d = dx, a = ax;
                var i;
                for (i = 0; i < cnt; i++) {
                    result[i] = new Delay(sys, {duration:d, depth:a});
                    d += dx;
                    a *= ax;
                }
                return result;
            }(5, 0.25, 0.5));

            if (typeof(options.depth) === "number") {
                this._depth = options.depth;
            } else {
                this._depth = 0.5;
            }
        };
        $this.setParameters = function(params) {
            var value;
            params = params || {};
            if (typeof(params.depth) === "number") {
                value = params.depth;
                if (value < 0) value = 0;
                else if (value > 1.0) value = 1.0;
                this._depth = value;
            }
        };
        $this.process = function(signal) {
            var buffer = new Float32Array(signal);
            var a1, a2;
            var efxs, i, imax;
            efxs = this._efxs;
            for (i = 0, imax = efxs.length; i < imax; i++) {
                efxs[i].process(buffer);
            }
            if (this._depth !== 0) {
                a1 = 1.0 - this._depth;
                a2 = this._depth;
                for (i = 0, imax = signal.length; i < imax; i++) {
                    signal[i] = signal[i] * a1 + buffer[i] * a2;
                }
            }
        };
        return Reverb;
    }());
    pico.effects.Reverb = Reverb;
    
}(this.pico));
