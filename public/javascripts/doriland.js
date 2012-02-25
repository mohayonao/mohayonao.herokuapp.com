$(function() {
    var player = pico.getplayer({channel:2});
    var url = "./audio/doriland.ogg";

    var panL = new Float32Array(5);
    var panR = new Float32Array(5);
    (function() {
        for (i = 0; i < 5; i++) {
            panL[i] = Math.cos(Math.PI / 2 * (i/8));
            panR[i] = Math.sin(Math.PI / 2 * (i/8));
        }
    }());
    
    var Doriland = (function() {
        var Doriland = function() {
            initialize.apply(this, arguments);
        }, $this = Doriland.prototype;
        
        var initialize = function(sys, options) {
            this.mode = 1;
            this.sys  = sys;

            options = options || {};
            if (options) {
                this._buffer    = options.buffer;
                this._phaseStep = options.samplerate / sys.SAMPLERATE;
            } else {
                this._buffer    = new Float32Array(0);
                this._phaseStep = 0;
            }
            
            (function(self, pattern) {
                var phaseTable, samplerate;
                var begin, end;
                var i;
                samplerate = self.sys.SAMPLERATE;
                phaseTable = [ ];
                begin = 0;
                for (i = 0; i < pattern.length; i++) {
                    end = (pattern[i] * samplerate + 0.5)|0;
                    phaseTable.push([begin, end]);
                    begin = end + 1;
                }
                end = self._buffer.length - 1;
                phaseTable.push([begin, end]);

                begin = end + 1;
                end   = begin + (0.1655 * samplerate | 0.5)|0;
                phaseTable.push([begin, end]);
                self._phaseTable = phaseTable;
            }(this,[0.331, 0.663, 0.8285, 0.994, 1.1595, 1.325]));
            
            this._efx = new Reverb(sys, {});
            
            this.init(options);
        };

        var compile = function(text) {
            var ch, items, list, segno, i;
            
            segno = null;
            if (typeof text === "string") {
                text = text.replace(/ドッドッ/g, "01");
                text = text.replace(/ドッ/g, "0");
                text = text.replace(/ンド/g, "56");
                text = text.replace(/ド/g, "2");
                text = text.replace(/リ/g, "3");
                text = text.replace(/ラ/g, "4");
                text = text.replace(/ン/g, "5");
                text = text.replace(/ッ/g, "7");
                text = text.replace(/ /g, "");
                
                list = [ ];
                items = text.split("");
                for (i = 0; i < items.length; i++) {
                    ch = items[i];
                    if (0 <= ch && ch <= 7) {
                        list.push(ch|0);
                    } else if (ch === "|") {
                        segno = list.length;
                    } else if (ch === "+" || ch === "-") {
                        list.push(ch);
                    } else if (ch === "*" || ch === "/") {
                        list.push(ch);
                    } else if (ch === "<" || ch === ">") {
                        list.push(ch);
                    } else {
                        list.push(ch.charCodeAt(0) % 6);
                    }
                }
            } else {
                list = [0,1,2,3,4,5,6];
            }
            this._list  = list;
            this._segno = segno;
        };
        
        $this.init = function(options) {
            compile.call(this, options.text);
            
            this._index = 0;
            this._phaseStep = 1;
            this._panIndex = 2;
            this._efx.setDepth(this._efxd);
            this._listitem = this.fetch();
            this._phase = this._listitem[0];
            this._efxd  = 0;
            
            this.next = this._none_next;            
            this.finished = true;
        };
        $this.play = function(callback) {
            this.finished = false;            
            this.next = this._next;
        };
        $this.pause = function() {
            this.next = this._none_next;
            this.finished = true;
        };
        $this.stop = function() {
            this.next = this._none_next;            
            this.finished = true;
        };

        $this.fetch = function() {
            var list, index, phaseStep, ch;
            list  = this._list;
            index = this._index;
            phaseStep = this._phaseStep;
            ch = list[index++];
            while ("+-*/<>".indexOf(ch) !== -1) {
                switch (ch) {
                case "+":
                    if (phaseStep < 2) phaseStep *= 1.0833333333;
                    break;
                case "-":
                    if (phaseStep > 0.5) phaseStep *= 0.923076951;
                    break;
                case "*":
                    this._efxd += 0.2;
                    this._efx.setDepth(this._efxd);
                    break;
                case "/":
                    this._efxd -= 0.2;
                    this._efx.setDepth(this._efxd);
                    break;
                case "<":
                    if (this._panIndex > 0) this._panIndex -= 1;
                    break;
                case ">":
                    if (this._panIndex < 4) this._panIndex += 1;
                    break;
                }
                ch = list[index++];
            }
            this._phaseStep = phaseStep;
            this._index = index;
            return this._phaseTable[ch];
        };
        
        $this._next = function(len) {
            var stream;
            var buffer, phase, phaseStep;
            var phaseTable, list, index, listitem, ch;
            var v;
            var i, imax;
            
            stream = new Float32Array(this.sys.STREAM_FULL_SIZE*2);
            buffer = this._buffer;
            phase  = this._phase;
            phaseStep  = this._phaseStep;
            phaseTable = this._phaseTable;
            list  = this._list;
            listitem = this._listitem;
            
            for (i = 0, imax = stream.length; i < imax; i += 2) {
                v = buffer[phase|0] || 0;;
                stream[i  ] = v * panL[this._panIndex];
                stream[i+1] = v * panR[this._panIndex];
                phase += phaseStep;
                if (listitem && phase >= listitem[1]) {
                    listitem = this.fetch();
                    if (listitem) {
                        phase = listitem[0];
                    } 
                }
            }
            
            if (this._index > list.length) {
                if (this._segno != null) {
                    this._index = this._segno;
                    listitem = this.fetch();
                    phase = listitem[0];
                } else {                
                    this.next = this._none_next;
                    this.finished = true;
                }
            }
            
            this._phase = phase;
            this._listitem = listitem;
            
            this._efx.process(stream);
            
            return stream;
        };
        $this._none_next = function() {
            return player.NONE_STREAM_FULL_SIZE;
        };

        return Doriland;
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
            a1 = 1.0 - this._d;
            a2 = this._d;
            for (i = 0, imax = stream.length; i < imax; i++) {
                stream[i] = stream[i]*a1 + buffer[i]*a2;
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
            this._buffer = new Float32Array(sys.SAMPLERATE * 2);
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
            
            this._head = head;
            this._tail = tail;
        };
        
        return Delay;
    }());



    
    
    
    // firefox
    var waveStretch = function(samplerate, wave, srcSampleRate) {
        var strech, len;
        var result;
        var i, index1, index2, v1, v2;
        
        if (samplerate === srcSampleRate) return wave;
        
        strech = samplerate / srcSampleRate;
        len = (wave.length * strech + 0.5)|0;
        
        result = [];
        for (i = 0; i < len; i++) {
            index1 = (i / len) * wave.length;
            index2 = index1 - (index1 | 0);
            index1 |= 0;
            
            v1 = wave[index1];
            v2 = wave[index1 + 1] || 0;
            result[i] = ((v1 * (1.0 - index2)) + (v2 * index2));
        }
        return new Float32Array(result);
    };
    
    if (player.PLAYER_TYPE === "MozPlayer") {
        player.load = function(url, callback) {
            var audio  = new Audio();
            var buffer = [];
            audio.src = url;
            audio.addEventListener("loadedmetadata", function(event) {
                audio.volume = 0;
                audio.play();
            }, false);
            audio.addEventListener("MozAudioAvailable", function(event) {
                var samples = event.frameBuffer;
                var i, imax;
                for (i = 0, imax = samples.length; i < imax; i++) {
                    buffer.push(samples[i]);
                }
            }, false);
            audio.addEventListener("ended", function(event) {
                var array = waveStretch(player.SAMPLERATE, buffer, audio.mozSampleRate);
                callback({buffer:array,
                          samplerate:player.SAMPLERATE,
                          channels:player.CHANNEL});
            }, false);
        };
    }
    
    
    var autoplay = false;
    player.load(url, function(result) {
        var doriland = new Doriland(player, result);            
        if (result != null) {
            $("#play").click(function() {
                doriland.init({text:$("#text").val().trim()});
                doriland.play();
                player.play(doriland);
            }).text("play");
            $("#stop").click(function() {
                player.stop();
            });
            if (autoplay) $("#play").click();
        }
    });

    $("li a").each(function() {
        var text = $(this).text();
        $(this).click(function() {
            $("#text").val(text);
            $("#play").click();
        });
    });
    
    var text = decodeURI(location.search.substr(1)).trim();
    if (text !== "") {
        $("#text").val(text);
        autoplay = true;
    }
    
    $("#tweet").click(function() {
        var h = 550,
            i = 250,
            j = screen.height,
            k = screen.width,
        b,c, lis, url;
        b = Math.round(k/2-h/2);
        c = Math.round(j/2-i/2);
        
        var baseurl = location.protocol + "//" + location.host + location.pathname;
        var text = $("#text").val();
        lis = [
            "http://twitter.com/share?lang=ja",
            "text=" + utf.URLencode(text),
            "url=" + utf.URLencode(encodeURI(baseurl+"?"+text))
        ];
        
        url = lis.join('&');
        window.open(url, "intent","width="+h+",height="+i+",left="+b+",top="+c);
    });
});

