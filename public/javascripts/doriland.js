$(function() {
    var player = pico.getplayer();
    var url = "./audio/doriland.ogg";
    
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
            this._listitem = this.fetch();
            this._phase = this._listitem[0];
            
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
            while (ch === "+" || ch === "-") {
                if (ch == "+") {
                    if (phaseStep < 2) phaseStep += 0.1;
                } else if (ch == "-") {
                    if (phaseStep > 0.5) phaseStep -= 0.1;
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
            var i, imax;

            stream = new Float32Array(this.sys.STREAM_FULL_SIZE);
            buffer = this._buffer;
            phase  = this._phase;
            phaseStep  = this._phaseStep;
            phaseTable = this._phaseTable;
            list  = this._list;
            listitem = this._listitem;
            
            for (i = 0, imax = stream.length; i < imax; i++) {
                stream[i] = buffer[phase|0] || 0;
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
            return stream;
        };
        $this._none_next = function() {
            return player.NONE_STREAM_FULL_SIZE;
        };

        return Doriland;
    }());
    

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
        console.log(text);
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
        console.log(encodeURI(baseurl+"?"+text));
        window.open(url, "intent","width="+h+",height="+i+",left="+b+",top="+c);
    });
});

