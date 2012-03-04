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
        var webrtc_thread = null;
        
        width  = 320;
        height = 240;
        
        // Camera
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
        
        var animate = function() {};
        var setAnimationFrame = function(width, height) {
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
            
            animate = function() {
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
        };
        
        if (navigator.webkitGetUserMedia) {
            (function() {
                var video = document.createElement("video");
                $("#camera").width(width).height(height).append(video);
                video.autoplay = true;
                $("#play").text("SOUND ON");
                $("#caption").text("JavaScript (using WebRTC)")
                $("#li1").text('click "SOUND ON"');
                navigator.webkitGetUserMedia("video", function(stream) {
                    video.src = webkitURL.createObjectURL(stream);
                    setTimeout(function() {
                        webrtc_thread = new WebRTCThread(video);
                    }, 500);
                }, function(err) {
                    console.error(err)
                });
                
                var WebRTCThread = (function() {
                    var WebRTCThread = function() {
                        initialize.apply(this, arguments);
                    }, $this = WebRTCThread.prototype;
                    
                    var initialize = function(camera) {
                        var self = this;
                        this._camera = camera;
                        this._canvas = document.createElement("canvas");
                        this._width  = this._canvas.width  = camera.videoWidth;
                        this._height = this._canvas.height = camera.videoHeight;
                        this._context = this._canvas.getContext("2d");
                        this._timerId = 0;
                        worker.postMessage({size:[this._width, this._height]});
                        setAnimationFrame(this._width, this._height);
                        this._data = new Uint8Array(this._width * this._height * 4);
                    };
                    
                    var process = function() {
                        var imagedata, data, i;
                        this._context.drawImage(this._camera, 0, 0, this._width, this._height);
                        imagedata = this._context.getImageData(0, 0, this._width, this._height).data;
                        data = this._data;
                        for (i = imagedata.length; i--; ) {
                            data[i] = imagedata[i];
                        }
                        worker.postMessage({cam2:data});
                    };
                    
                    $this.start = function() {
                        var self = this;
                        if (this._timerId === 0) {
                            this._timerId = setInterval(function() {
                                process.call(self);
                            }, 250);
                            requestAnimationFrame(animate);
                        }
                    };
                    
                    $this.stop = function() {
                        if (this._timerId !== 0) {
                            clearInterval(this._timerId);
                        }
                    };
                    return WebRTCThread;
                }());
            }());
        } else {
            var camdata = new Uint8Array(width*4);
            $("#caption").text("Flash WebCam -> JavaScript")
            $("#li1").text('click "Allow" to enable access to your webcam');
            worker.postMessage({size:[width, height]});
            $("#camera").webcam({
                width: width,
                height: height,
                mode: "stream",
                swffile: "/javascripts/libs/jscam_canvas_only.swf",
                onSave: function(data) {
                    var _camdata, items, i, j, v;
                    _camdata = camdata;
                    items = data.split(";");
                    j = 0;
                    for (i = 0; i < width; ++i) {
                        v = items[i]|0;
                        _camdata[j++] = (v >> 16) & 0x0ff;;
                        _camdata[j++] = (v >>  8) & 0x0ff;;
                        _camdata[j++] = (v >>  0) & 0x0ff;;
                        j++;
                    }
                    worker.postMessage({cam:_camdata});
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
                }
            });
            setAnimationFrame(width, height);
        }
        
        // 
        var WAVELET_LENGTH = 1024;
        var SCALES = [
            ["Ionian"    , [0,2,4,5,7,9,11]], // C D E F G A B
            ["Dorian"    , [0,2,3,5,7,9,10]], // C D Eb F G A Bb
            ["Phrigian"  , [0,1,3,5,7,8,10]], // C Db Eb F G Ab Bb
            ["Lydian"    , [0,1,4,6,7,9,11]], // C D E F# G A B
            ["Mixolydian", [0,2,4,5,7,9,10]], // C D E F G A Bb
            ["Aeolian"   , [0,2,3,5,7,8,10]], // C D Eb F G Ab Bb
            ["Locrian"   , [0,1,3,5,6,8,10]], // C Db Eb F Gb Ab Bb
            
            ["Chromatic" , [0,1,2,3,4,5,6,7,8,9,10,11]],
            ["Wholetone" , [0,2,4,6,8,10]],
            
            ["mHarmonic" , [0,2,3,5,7,8,11]], // C D Eb F G Ab B
            
            ["Dim"       , [0,2,3,5,6,8,9,11]], // C D Eb F Gb G# A B
            ["ComDim"    , [0,1,3,4,6,7,9,10]], // C Db Eb bF bG G A Bb
            ["mPenta"    , [0,3,5,7,10]], // C Eb F G Bb
            ["MPenta"    , [0,2,4,7,9]],  // C D E G A
            
            ["Raga1", [0,1,4,6,7,9,11]], // C Db E F# G A B
            ["Raga2", [0,1,4,6,7,8,11]], // C Db E F# G Ab B
            ["Raga3", [0,1,3,6,7,8,11]], // C Db Eb F# G Ab B
            
            ["Hungarian" , [0,2,3,6,7,9,11]], // C D Eb F# G A B
            ["Spain", [0,1,3,4,5,7,8,10]], // C Db Eb E F G Ab Bb
            ["Gypsy", [0,1,4,5,7,8,11]], // C Db E F G Ab B
            ["Egypt", [0,2,3,6,7,8,11]], // C D Eb F# G Ab B
            
            ["Pelog" , [0,1,3,7,8]], // C Db Eb G Ab
            ["Japan" , [0,2,4,7,9]], // C D E G A
            ["Ryukyu", [0,4,5,7,11]], // C E F G B
        ];
        var ScaleTable = (function() {
            var map;
            var i, option;
            map = {};
            for (i = 0; i < SCALES.length; i++) {
                option = $(document.createElement("option"))
                    .attr("value", SCALES[i][0]).text(SCALES[i][0]);
                $("#scale").append(option);
                map[SCALES[i][0]] = SCALES[i][1];
            }
            return map;
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
                this._phase = 0;
                this._vibratoPhase = 0.0;
                this._vibratoPhaseStep = (WAVELET_LENGTH * 4) / sys.SAMPLERATE;
                this._tremoloPhase = 0.0;
                this._tremoloPhaseStep = (WAVELET_LENGTH * 3) / sys.SAMPLERATE;
                this._efx = new Reverb(sys);
                this._efx.setDepth(0.25);
                this.setWavelet("sine");
            };
            
            var sinetable = (function() {
                var list, i, x;
                list = new Float32Array(WAVELET_LENGTH);
                for (i = 0; i < WAVELET_LENGTH; i++) {
                    x = i / WAVELET_LENGTH;
                    list[i] = Math.sin(2 * Math.PI * (i / WAVELET_LENGTH));
                }
                return list;
            }());
            
            $this.next = function() {
                var stream, samplerate;
                var freq1, freq2, freq3;
                var phase, phaseStep;
                var vibratoPhase, vibratoPhaseStep;
                var tremoloPhase, tremoloPhaseStep;
                var amp1, amp2, amp3, amp4;
                var i, j, k;
                var N = 64;
                stream = this._stream;
                samplerate = this.sys.SAMPLERATE;
                wavelet = this._wavlet;
                freq1 = this._freq1;
                freq2 = this._freq2;
                amp1 = this._amp1;
                amp2 = this._amp2;
                phase = this._phase;
                vibratoPhase     = this._vibratoPhase;
                vibratoPhaseStep = this._vibratoPhaseStep * N;
                tremoloPhase     = this._tremoloPhase;
                tremoloPhaseStep = this._tremoloPhaseStep * N;
                
                k = 0;
                for (i = stream.length/N; i--; ) {
                    freq1 += (freq2 - freq1) * (0.00010 * N);
                    freq3 = (sinetable[(vibratoPhase|0) % WAVELET_LENGTH]) * 6;
                    
                    amp1 += (amp2  - amp1) * (0.00010 * N);
                    amp3 = (sinetable[(tremoloPhase|0) % WAVELET_LENGTH] * 0.2) + 1.0;
                    amp4 = amp1 * amp3;
                    
                    phaseStep = (WAVELET_LENGTH * (freq1 + freq3)) / samplerate;
                    for (j = 0; j < N; j++) {
                        stream[k++] = wavelet[(phase|0) % WAVELET_LENGTH] * amp4;
                        phase += phaseStep;
                    }
                    
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
                if (frequency) this._freq2 = frequency;
            };
            $this.setAmplitude = function(amplitude) {
                if (amplitude) this._amp2 = amplitude;
            };
            $this.setWavelet = (function() {
                var map = {
                    "sine": function(x) { return Math.sin(2 * Math.PI * x);  },
                    "triangle": function(x) { x -= 0.25; return 1.0 - 4.0 * Math.abs(Math.round(x) - x); },
                    "sawtooth": function(x) { return +2.0 * (x - Math.round(x)); },
                    "square": function(x) { return (x < 0.5) ? -.5 : +.5; },
                    "pwm10": function(x) { return (x < 0.1) ? -.5 : +.5; },
                    "pwm20": function(x) { return (x < 0.2) ? -.5 : +.5; },
                    "pwm30": function(x) { return (x < 0.3) ? -.5 : +.5; },
                    "pwm40": function(x) { return (x < 0.4) ? -.5 : +.5; },
                };
                var k, list, func;
                for (k in map) {
                    list = new Float32Array(WAVELET_LENGTH);
                    func = map[k];
                    for (i = 0; i < WAVELET_LENGTH; i++) {
                        list[i] = func(i / WAVELET_LENGTH);
                    }
                    map[k] = list;
                }
                
                return function(name) {
                    if (name in map) {
                        this._wavlet = map[name];
                    } else {
                        this._wavlet = map["sine"];
                    }
                };
            }());
            
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
        
        var mtof = (function() {
            var list, i;
            list = new Float32Array(128);
            for (i = 0; i < 128; i++) {
                list[i] = 440.0 * Math.pow(Math.pow(2, (1 / 12)), (i - 69));
            }
            return list;
        }());
        
        var freqTable = null;
        var setScale = function(key, scale, res) {
            var scaletable
            var list, dx, y, dy, midi;
            var i;
            key = key|0;
            list = new Float32Array(height);
            scaletable = ScaleTable[scale];
            if (!scaletable) {
                dx   = Math.pow(2.0, 1.0 / (12 * 8));
                for (i = 0; i < height; i++) {
                    list[height-i-1] = 220.0 * Math.pow(dx, i);
                }
            } else {
                dy = height / (res|0);
                for (i = 0; i < height; i++) {
                    y = ((i / dy)|0)-2;
                    midi = scaletable[(y + scaletable.length) % scaletable.length];
                    midi += Math.floor(y / scaletable.length) * 12;
                    midi += key + 48 + 12;
                    list[height-i-1] = mtof[midi];
                }
            }
            freqTable = list;
        };

        
        
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
        
        theremin.setFrequency(440);
        theremin.setAmplitude(0.10);
        setScale(null, "NONE", 0);
        
        $("#play").on("click", function() {
            if (! isPlaying) {
                if (webrtc_thread !== null) {
                    webrtc_thread.start();
                }
                player.play(theremin);
                $(this).text("SOUND OFF");
            } else {
                if (webrtc_thread !== null) {
                    webrtc_thread.stop();
                }
                player.stop();
                $(this).text("SOUND ON");
            }
            isPlaying = !isPlaying;
        });

        $("#key").on("change", function() {
            setScale($(this).val(), $("#scale").val(), $("#res").val());
        });
        $("#scale").on("change", function() {
            setScale($("#key").val(), $(this).val(), $("#res").val());
        });
        $("#res").on("change", function() {
            setScale($("#key").val(), $("#scale").val(), $(this).val());
        });
        $("#tone").on("change", function() {
            theremin.setWavelet($(this).val());
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
        
        var FleshColorDetecter3 = (function() {
            var $instance = {};
            
            var width  = 320;
            var height = 240;
            
            var index  = 0;
            var l_sx, l_sy, l_sc;
            var m_sx, m_sy, m_sc;
            var r_sx, r_sy, r_sc;
            var l_w, r_w, th;
            var callback = function() {};
            
            $instance.init = function() {
                index = 0;
                l_sx = l_sy = l_sc = 0;
                m_sx = m_sy = m_sc = 0;
                r_sx = r_sy = r_sc = 0;
            };
            
            $instance.size = function(size) {
                width  = size[0];
                height = size[1];
                
                l_w = (width / 3)|0;
                r_w = width - l_w;
                th  = ((width * height) * 0.0025)|0;
            };
            
            $instance.setCallback = function(_callback) {
                callback = _callback;
            };
            
            $instance.set = function(data) {
                var items;
                var rgb, r, g, b;
                var hsv, h, s, v;
                var x, y, i, j;
                
                y = index;
                j = 0;
                for (i = 0; i < width; ++i) {
                    r = data[j++];
                    g = data[j++];
                    b = data[j++];
                    j++; // alpha
                    
                    hsv = rgb2hsv(r, g, b);
                    h = hsv[0];
                    s = hsv[1];
                    v = hsv[2];
                    
                    x = width - i;
                    if (0 <= h && h <= 30 && 0.15 <= s && 0.15 <= v) {
                        if (x <= l_w) {
                            l_sx += x;
                            l_sy += y;
                            ++l_sc;
                        } else if (r_w <= x) {
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
                    if (l_sc >= th) {
                        l_sx /= l_sc;
                        l_sy /= l_sc;
                    } else {
                        l_sx = -1;
                        l_sy = -1;
                    }
                    if (m_sc >= th) {
                        m_sx /= m_sc;
                        m_sy /= m_sc;
                    } else {
                        m_sx = -1;
                        m_sy = -1;
                    }
                    if (r_sc >= th) {
                        r_sx /= r_sc;
                        r_sy /= r_sc;
                    } else {
                        r_sx = -1;
                        r_sy = -1;
                    }
                    callback([l_sx, l_sy,  m_sx, m_sy,  r_sx, r_sy]);
                    $instance.init();
                }
            };
            
            $instance.set2 = function(data) {
                var i, w4;
                w4 = width * 4;
                for (i = 0; i < height; i++) {
                    this.set(data.subarray(i * w4, (i+1) * w4));
                }
            }
            return $instance;
        }());
        
        FleshColorDetecter3.init();
        FleshColorDetecter3.setCallback(function(data) {
            postMessage(data);
        });
        addEventListener("message", function(event) {
            if (event.data.cam) {
                FleshColorDetecter3.set(event.data.cam);
            } else if (event.data.cam2) {
                FleshColorDetecter3.set2(event.data.cam2);
            } else if (event.data.size) {
                FleshColorDetecter3.size(event.data.size);
            }
        }, false)
    }());
}
