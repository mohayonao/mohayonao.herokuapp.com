if (typeof(window) !== "undefined") {
    
    // Main
    $(function() {
        var requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (f) {
                setTimeout(f, 1000/60)
            };

        var player = pico.getplayer();
        var width, height;
        var isPlaying  = false;
        var recentData = null;
        
        width  = 320;
        height = 240;
        
        var worker = new Worker("/javascripts/theremin.js");
        worker.addEventListener("message", function(event) {
            recentData = event.data;
            if (isPlaying) {            
                if (recentData[5] !== -1) {
                    theremin.setFrequency(freqTable[recentData[5]|0]);
                }
                if (recentData[1] !== -1) {
                    theremin.setAmplitude(ampTable[recentData[1]|0]);
                }
            }
        }, true);
        worker.postMessage({size:[width, height]});
        
        $("#camera").webcam({
            width: width,
            height: height,
            mode: "stream", // stream // callback
            swffile: "/javascripts/jscam_canvas_only.swf",
            onTick: function() {
                console.log("tick");
            },
            onSave: function(data) {
                worker.postMessage({cam:data});
            },
            onCapture: function() {
                webcam.save();
            },
            debug: function(type, string) {
                if (string === "Camera started") {
                    $("#play").click();
                    webcam.capture();
                    requestAnimationFrame(animate);
                }
                console.log("debug:" + type + " <" + string + ">");
            },
            onLoad: function() {
                console.log("load");
            }
        });
        
        var animate = (function() {
            var PI2 = Math.PI * 2;
            var l_canvas = document.getElementById("l-canvas");
            var r_canvas = document.getElementById("r-canvas");
            l_canvas.width  = r_canvas.width  = 40;
            l_canvas.height = r_canvas.height = height;
            $(l_canvas).width(40).height(height);
            $(r_canvas).width(40).height(height);
            
            var l_context = l_canvas.getContext("2d");
            var r_context = r_canvas.getContext("2d");
            l_context.globalAlpha = r_context.globalAlpha = 0.1;
            l_context.fillStyle   = r_context.fillStyle   = "#ededed";
            l_context.strokeStyle = r_context.strokeStyle = "blue";
            
            return function() {
                l_context.fillRect(0, 0, 40, height);
                r_context.fillRect(0, 0, 40, height);
                
                if (recentData !== null) {
                    if (recentData[5] !== -1) {
                        l_context.beginPath();
                        l_context.arc(20, recentData[5], 10, 0, PI2, true);
                        l_context.stroke();
                    }
                    if (recentData[1] !== -1) {
                        r_context.beginPath();
                        r_context.arc(20, recentData[1], 10, 0, PI2, true);
                        r_context.stroke();
                    }
                }
                requestAnimationFrame(animate);
            };
        }());
        
        
        var Theremin = (function() {
            var Theremin = function() {
                initialize.apply(this, arguments);
            }, $this = Theremin.prototype;

            var initialize = function(sys, options) {
                this.sys = sys;
                this._stream = new Float32Array(sys.STREAM_FULL_SIZE);
                this._freq1 = 0;
                this._freq2 = 0;
                this._amp1  = 0;
                this._amp2  = 0;
                this._phase  = 0;
                this._vibratoPhase = 0.0;
                this._vibratoPhaseStep = (WAVELET_LENGTH * 4) / sys.SAMPLERATE;
                this._tremoloPhase = 0.0;
                this._tremoloPhaseStep = (WAVELET_LENGTH * 4) / sys.SAMPLERATE;
                this._efx = new Reverb(sys);
                this._efx.setDepth(0.25);
            };
            
            var WAVELET_LENGTH = 1024;
            var sinetable = (function() {
                var list, i, x;
                list = new Float32Array(WAVELET_LENGTH);
                for (i = 0; i < WAVELET_LENGTH; i++) {
                    x = i / WAVELET_LENGTH;
                    list[i] = Math.sin(2 * Math.PI * (i / WAVELET_LENGTH));
                }
                return list;
            }());
            var tritable = (function() {
                var list, i, x;
                list = new Float32Array(WAVELET_LENGTH);
                for (i = 0; i < WAVELET_LENGTH; i++) {
                    x = i / WAVELET_LENGTH;
                    list[i] = +2.0 * (x - Math.round(x));
                }
                return list;
            }());
            
            $this.next = function() {
                var stream, samplerate;
                var freq1, freq2, freq3, phase;
                var vibratoPhase, vibratoPhaseStep;
                var tremoloPhase, tremoloPhaseStep;
                var amp1, amp2, amp3;
                var i, imax;
                stream = this._stream;
                samplerate = this.sys.SAMPLERATE;
                freq1 = this._freq1;
                freq2 = this._freq2;
                amp1 = this._amp1;
                amp2 = this._amp2;
                phase = this._phase;
                vibratoPhase     = this._vibratoPhase;
                vibratoPhaseStep = this._vibratoPhaseStep;
                tremoloPhase     = this._tremoloPhase;
                tremoloPhaseStep = this._tremoloPhaseStep;
                for (i = 0, imax = stream.length; i < imax; i++) {
                    amp3 = (sinetable[(tremoloPhase|0) % WAVELET_LENGTH] * 0.2) + 1.0;
                    stream[i] = sinetable[(phase|0) % WAVELET_LENGTH] * amp1 * amp3;
                    freq1 += (freq2 - freq1) * 0.00010;
                    amp1  += (amp2  - amp1 ) * 0.00010;
                    freq3 = (sinetable[(vibratoPhase|0) % WAVELET_LENGTH]) * 8;
                    phase += (WAVELET_LENGTH * (freq1 + freq3)) / samplerate;
                    vibratoPhase += vibratoPhaseStep;
                    tremoloPhase += tremoloPhaseStep;
                }
                this._freq1 = freq1;
                this._phase = phase;
                this._amp1 = amp1;
                this._vibratoPhase = vibratoPhase;
                this._tremoloPhase = tremoloPhase;
                this._efx.process(stream);
                return stream;
            };
            
            $this.setFrequency = function(frequency) {
                this._freq2 = frequency;
            };
            $this.setAmplitude = function(amplitude) {
                this._amp2 = amplitude;
            };
            
            return Theremin;
        }());

        
        var Reverb = (function() {
            var Reverb = function() {
                initialize.apply(this, arguments);
            }, $this = Reverb.prototype;

            var initialize = function(sys, options) {
                this.sys = sys;

                this._efxs = (function(cnt, dx, ax) {
                    var result = [];
                    var d = dx, a = ax;
                    var i;
                    for (i = 0; i < cnt; i++) {
                        result[i] = new Delay(sys, {d:d, a:a});
                        d += dx;
                        a *= ax;
                    }
                    return result;
                }(5, 0.375, 0.5));
                
                this._d = 0;
            };
            
            $this.setDepth = function(value) {
                if (value < 0) value = 0;
                else if (value > 1.0) value = 1.0;
                this._d = value;
            };
            
            $this.process = function(stream) {
                var buffer = new Float32Array(stream);
                var a1, a2;
                var efxs, i, imax;
                efxs = this._efxs;
                for (i = 0, imax = efxs.length; i < imax; i++) {
                    efxs[i].process(buffer);
                }
                if (this._d !== 0) {
                    a1 = 1.0 - this._d;
                    a2 = this._d;
                    for (i = 0, imax = stream.length; i < imax; i++) {
                        stream[i] = stream[i]*a1 + buffer[i]*a2;
                    }
                }
            };
            
            return Reverb;
        }());
        
        
        var Delay = (function() {
            var Delay = function() {
                initialize.apply(this, arguments);
            }, $this = Delay.prototype;
            
            var initialize = function(sys, options) {
                this.sys = sys;
                this._buffer = new Float32Array(sys.SAMPLERATE);
                this.init(options);
            };
            
            $this.init = function(options) {
                this._head = (options.d * this.sys.SAMPLERATE)|0;
                this._tail = 0;
                this._amp  = options.a;
            };
            
            $this.process = function(stream) {
                var buffer, head, tail;
                var v0, v1, v2;
                var a1, a2;
                var i, imax;
                
                if (this._amp !== 0) {
                    buffer = this._buffer;
                    head = this._head;
                    tail = this._tail;
                    a1 = 1.0 - this._amp;
                    a2 = this._amp;
                    for (i = 0, imax = stream.length; i < imax; i++) {
                        buffer[head] = stream[i];
                        
                        v1 = stream[i];
                        v2 = buffer[tail]
                        v0 = v1 * a1 + v2 * a2;
                        stream[i] = v0;
                        
                        head += 1;
                        tail += 1;
                        if (head >= buffer.length) head = 0;
                        if (tail >= buffer.length) tail = 0;
                    }
                }
                this._head = head;
                this._tail = tail;
            };
            
            return Delay;
        }());
        
        var theremin = new Theremin(player);    
        
        
        var freqTable = (function() {
            var list, dx;
            var i;
            list = new Float32Array(240);
            dx   = Math.pow(2.0, 1.0 / (12 * 8));
            for (i = 0; i < 240; i++) {
                list[239-i] = 220.0 * Math.pow(dx, i);
            }
            return list;
        }());

        var ampTable = (function() {
            var list, dx;
            var i;
            list = new Float32Array(240);
            dx   = Math.pow(2.0, 1.0 / (12 * 4));
            for (i = 0; i < 240; i++) {
                list[239-i] = (i / 360) + 0.1;
            }
            return list;
        }());
        console.log(ampTable);

        
        theremin.setFrequency(440);
        theremin.setAmplitude(0.10);

        $("#play").on("click", function() {
            if (! isPlaying) {
                player.play(theremin);
                $(this).text("SOUND OFF");
            } else {
                player.stop();
                $(this).text("SOUND ON");
            }
            isPlaying = !isPlaying;
        });
    });
    
} else {
    
    // worker
    (function() {
        var rgb2hsv = function(r, g, b) {
            var h, s, v;
            var cmax, cmin;
            h = s = v = 0;
            cmax = (r >= g) ? r : g;
            if (b > cmax) cmax = b;
            cmin = (r <= g) ? r : g;
            if (b < cmin) cmin = b;
            v = cmax;
            c = cmax - cmin;
            if (cmax != 0) s = c / cmax;
            
            if (c !== 0) {
	            if (r === cmax) {
		            h = 0 + (g - b) / c;
	            } else if (g === cmax) {
			        h = 2 + (b - r) / c;
		        } else { // if (b === cmax)
                    h = 4 + (r - g) / c;
		        }
	            h *= 60;
	            if (h < 0) h += 360;
            }
            return [h, s, v];
        };
        
        var width  = 320;
        var height = 240;
        
        var FleshColorDetecter3 = (function() {
            var $instance = {};
            
            var index  = 0;
            var l_sx, l_sy, l_sc;
            var m_sx, m_sy, m_sc;
            var r_sx, r_sy, r_sc;
            var msg;
            
            $instance.init = function() {
                index = 0;
                l_sx = l_sy = l_sc = 0;
                m_sx = m_sy = m_sc = 0;
                r_sx = r_sy = r_sc = 0;
            };
            
            $instance.set = function(data) {
                var items;
                var rgb, r, g, b;
                var hsv, h, s, v;
                var x, y, i;
                
                y = index;
                items = data.split(";");
                for (i = 0; i < width; ++i) {
                    rgb = items[i]|0;
                    r = (rgb >> 16) & 0x0ff;
                    g = (rgb >>  8) & 0x0ff;
                    b = (rgb >>  0) & 0x0ff;
                    hsv = rgb2hsv(r, g, b);
                    h = hsv[0];
                    s = hsv[1];
                    v = hsv[2];
                    
                    x = width - i;
                    if (0 <= h && h <= 30 && 0.15 <= s && 0.15 <= v) {
                        if (x <= 100) {
                            l_sx += x;
                            l_sy += y;
                            ++l_sc;
                        } else if (220 <= x) {
                            r_sx += x;
                            r_sy += y;
                            ++r_sc;
                        } else {
                            m_sx += x;
                            m_sy += y;
                            ++m_sc;
                        }
                    }
                }
                
                index += 1;
                if (index === height) {
                    if (l_sc >= 200) {
                        l_sx /= l_sc;
                        l_sy /= l_sc;
                    } else {
                        l_sx = -1;
                        l_sy = -1;
                    }
                    if (m_sc >= 200) {
                        m_sx /= m_sc;
                        m_sy /= m_sc;
                    } else {
                        m_sx = -1;
                        m_sy = -1;
                    }
                    if (r_sc >= 200) {
                        r_sx /= r_sc;
                        r_sy /= r_sc;
                    } else {
                        r_sx = -1;
                        r_sy = -1;
                    }
                    msg = [l_sx, l_sy,  m_sx, m_sy,  r_sx, r_sy];
                    postMessage(msg);
                    $instance.init();
                }
            };
            return $instance;
        }());
        
        FleshColorDetecter3.init();
        addEventListener("message", function(event) {
            if (event.data.cam) {
                FleshColorDetecter3.set(event.data.cam);
            } else if (event.data.size) {
                width  = event.data.size[0];
                height = event.data.size[1];
            }
        }, false)
    }());
}
