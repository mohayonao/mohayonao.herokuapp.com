(function() {
  $(function() {
    var $canvas, DEBUG, PI, PI2, SoundSystem, TABLE_LENGTH, ToneGenerator, Windmill, abs, atan2, canvas, ctx, height, i, pow, round, sin, sinetable, sqrt, width, _ref, _ref2, _ref3, _ref4;
    PI = Math.PI;
    PI2 = Math.PI * 2;
    abs = Math.abs;
    round = Math.round;
    sin = Math.sin;
    atan2 = Math.atan2;
    pow = Math.pow;
    sqrt = Math.sqrt;
    DEBUG = 0;
    Array.prototype.shuffle = function() {
      return this.sort(function() {
        return 0.5 - Math.random();
      });
    };
    if (typeof requestAnimationFrame === "undefined" || requestAnimationFrame === null) {
      requestAnimationFrame = (_ref = (_ref2 = (_ref3 = (_ref4 = window.webkitRequestAnimationFrame) != null ? _ref4 : window.mozRequestAnimationFrame) != null ? _ref3 : window.oRequestAnimationFrame) != null ? _ref2 : window.msRequestAnimationFrame) != null ? _ref : function(f) {
        return setTimeout(f, 1000 / 60);
      };
    }
    $canvas = $(canvas = document.getElementById("canvas"));
    width = canvas.width = $canvas.width();
    height = canvas.height = $canvas.height();
    ctx = canvas.getContext("2d");
    Windmill = (function() {
      function Windmill(options) {
        var _ref10, _ref11, _ref12, _ref13, _ref5, _ref6, _ref7, _ref8, _ref9;
        this.x = (_ref5 = options.x) != null ? _ref5 : 0;
        this.y = (_ref6 = options.y) != null ? _ref6 : 0;
        this.r = (_ref7 = options.r) != null ? _ref7 : 100;
        this.phase = (_ref8 = options.phase) != null ? _ref8 : 0;
        this.freq = (_ref9 = options.freq) != null ? _ref9 : 0.1;
        this.color = (_ref10 = options.color) != null ? _ref10 : "lime";
        this.count = (_ref11 = options.count) != null ? _ref11 : 3;
        this.min = (_ref12 = options.min) != null ? _ref12 : -3;
        this.max = (_ref13 = options.max) != null ? _ref13 : +3;
        this.anime_prev = +new Date();
        this.mouse_prev = +new Date();
        this.radian_prev = 0;
        this.mouseon = false;
        this.next = null;
        this.freq = Math.min(this.max, Math.max(this.min, this.freq));
      }
      Windmill.prototype.animate = function(now) {
        var count, elapsed, i, p, phase, phaseStep, r, x, y, _ref5, _ref6;
        _ref5 = [this.x, this.y, this.r, this.count], x = _ref5[0], y = _ref5[1], r = _ref5[2], count = _ref5[3];
        elapsed = now - this.anime_prev;
        phaseStep = this.freq * PI2 * (elapsed / 1000);
        this.anime_prev = now;
        this.phase = phase = this.phase + phaseStep;
        ctx.fillStyle = this.color;
        for (i = 0; 0 <= count ? i < count : i > count; 0 <= count ? i++ : i--) {
          p = phase + (PI2 / count) * i;
          ctx.beginPath();
          ctx.arc(x, y, r / 4, p + 0.15, p - 0.15, true);
          ctx.arc(x, y, r - 5, p - 0.15, p + 0.15, false);
          ctx.closePath();
          ctx.fill();
        }
        return (_ref6 = this.next) != null ? _ref6.animate(now) : void 0;
      };
      Windmill.prototype.mousemove = function(x, y) {
        var diff, distance, dx, dy, elapsed, freq, now, radian;
        dx = this.x - x;
        dy = this.y - y;
        distance = sqrt(dx * dx + dy * dy);
        radian = atan2(dy, dx);
        if (radian < 0) {
          radian += PI2;
        }
        if (this.mouseon) {
          diff = this.radian_prev - radian;
          if (diff > PI) {
            diff = PI2 - diff;
          }
          this.radian_prev = radian;
          now = +new Date();
          if ((elapsed = now - this.mouse_prev) > 0) {
            this.mouse_prev = now;
            freq = (-diff * 1000) / elapsed / 4;
            if (freq > this.max) {
              freq = this.max;
            } else if (freq < this.min) {
              freq = this.min;
            }
            this.freq = this.freq * 0.95 + freq * 0.05;
          }
        }
        if ((this.r / 4 < distance && distance < this.r - 5)) {
          this.mouseon = true;
          this.radian_prev = radian;
          return this.mouse_prev = +new Date();
        } else {
          return this.mouseon = false;
        }
      };
      return Windmill;
    })();
    TABLE_LENGTH = 1024;
    sinetable = (function() {
      var _results;
      _results = [];
      for (i = 0; 0 <= TABLE_LENGTH ? i < TABLE_LENGTH : i > TABLE_LENGTH; 0 <= TABLE_LENGTH ? i++ : i--) {
        _results.push(sin(i / TABLE_LENGTH * PI2));
      }
      return _results;
    })();
    ToneGenerator = (function() {
      function ToneGenerator(sys) {
        this.player = sys.player;
        this.steptable = sys.steptable;
        this.wave = sinetable;
        this.base = 2000;
        this.phase = 0;
        this.phaseStep = this.steptable[this.base];
        this.phaseStepTo = this.steptable[this.base];
        this.amp = 0.5;
        this.ampTo = 0.5;
        this.tremPhase = 0;
        this.tremPhaseStep = 0;
        this.tremPhaseStepTo = 0;
        this.mill = {
          freq: null,
          amp: null,
          trem: null
        };
        this.count = 0;
      }
      ToneGenerator.prototype.bind = function(freq, amp, trem) {
        var mill;
        mill = this.mill;
        mill.freq = freq;
        mill.amp = amp;
        mill.trem = trem;
        i = (abs(mill.freq.freq) * 400 + this.base) | 0;
        if (i > 8191) {
          i = 8191;
        }
        return this.phaseStep = this.phaseStepTo = this.steptable[i];
      };
      ToneGenerator.prototype.chbase = function(val) {
        this.base = val;
        this.phaseStep = this.steptable[this.base];
        return this.phaseStepTo = this.steptable[this.base];
      };
      ToneGenerator.prototype.next = function() {
        var STREAM_CELL_COUNT, STREAM_CELL_SIZE, STREAM_FULL_SIZE, amp, ampTo, i, j, k, mill, phase, phaseStep, phaseStepTo, steptable, stream, tremPhase, tremPhaseStep, tremPhaseStepTo, vol, wave, _ref5, _ref6;
        STREAM_FULL_SIZE = this.player.STREAM_FULL_SIZE;
        STREAM_CELL_SIZE = this.player.STREAM_CELL_SIZE;
        STREAM_CELL_COUNT = this.player.STREAM_CELL_COUNT;
        _ref5 = [this.mill, this.steptable], mill = _ref5[0], steptable = _ref5[1];
        _ref6 = [this.wave, this.phase], wave = _ref6[0], phase = _ref6[1];
        phaseStepTo = this.phaseStepTo;
        ampTo = this.ampTo;
        tremPhaseStepTo = this.tremPhaseStepTo;
        if (this.count <= 0) {
          i = (abs(mill.freq.freq) * 600 + this.base) | 0;
          if (i > 8191) {
            i = 8191;
          }
          this.phaseStepTo = phaseStepTo = steptable[i];
          this.ampTo = 0.2 + abs(mill.amp.freq) / 2;
          i = ((abs(mill.trem.freq) * 5000) | 0) + 500;
          this.tremPhaseStepTo = steptable[i];
          this.count += STREAM_FULL_SIZE * 5;
        } else {
          this.count -= STREAM_FULL_SIZE;
        }
        this.phaseStep = phaseStep = this.phaseStep * 0.95 + phaseStepTo * 0.05;
        this.amp = amp = this.amp * 0.95 + ampTo * 0.05;
        this.tremPhaseStep = tremPhaseStep = this.tremPhaseStep * 0.8 + tremPhaseStepTo * 0.2;
        tremPhase = this.tremPhase;
        stream = new Float32Array(STREAM_FULL_SIZE);
        k = 0;
        for (i = 0; 0 <= STREAM_CELL_COUNT ? i < STREAM_CELL_COUNT : i > STREAM_CELL_COUNT; 0 <= STREAM_CELL_COUNT ? i++ : i--) {
          tremPhase += tremPhaseStep;
          vol = amp + sinetable[(tremPhase | 0) % TABLE_LENGTH] * 0.4;
          for (j = 0; 0 <= STREAM_CELL_SIZE ? j < STREAM_CELL_SIZE : j > STREAM_CELL_SIZE; 0 <= STREAM_CELL_SIZE ? j++ : j--) {
            stream[k++] = wave[(phase | 0) % TABLE_LENGTH] * vol;
            phase += phaseStep;
          }
        }
        this.phase = phase % TABLE_LENGTH;
        this.tremPhase = tremPhase % TABLE_LENGTH;
        return stream;
      };
      return ToneGenerator;
    })();
    SoundSystem = (function() {
      function SoundSystem() {
        var player;
        player = pico.getplayer();
        if (player) {
          this.player = player;
          this.steptable = (function() {
            var calcStep, i, samplerate, _results;
            samplerate = player.SAMPLERATE;
            calcStep = function(i) {
              var freq;
              freq = 440.0 * pow(pow(2, 1 / (12 * 128)), i - 4096);
              return TABLE_LENGTH * freq / samplerate;
            };
            _results = [];
            for (i = 0; i < 8192; i++) {
              _results.push(calcStep(i));
            }
            return _results;
          })();
        } else {
          this.player = null;
        }
        this.gens = [];
        this.count = 200;
      }
      SoundSystem.prototype.add = function(gen) {
        return this.gens.push(gen);
      };
      SoundSystem.prototype.play = function() {
        return this.player.play(this);
      };
      SoundSystem.prototype.stop = function() {
        return this.player.stop();
      };
      SoundSystem.prototype.next = function() {
        var STREAM_FULL_SIZE, cellstream, g, i, stream, _i, _len, _ref5;
        STREAM_FULL_SIZE = this.player.STREAM_FULL_SIZE;
        stream = new Float32Array(STREAM_FULL_SIZE);
        _ref5 = this.gens;
        for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
          g = _ref5[_i];
          cellstream = g.next();
          for (i = 0; 0 <= STREAM_FULL_SIZE ? i < STREAM_FULL_SIZE : i > STREAM_FULL_SIZE; 0 <= STREAM_FULL_SIZE ? i++ : i--) {
            stream[i] += cellstream[i] * 0.05;
          }
        }
        for (i = 0; 0 <= STREAM_FULL_SIZE ? i < STREAM_FULL_SIZE : i > STREAM_FULL_SIZE; 0 <= STREAM_FULL_SIZE ? i++ : i--) {
          if (stream[i] > 1.0) {
            stream[i] = 1.0;
          } else if (stream[i] < -1.0) {
            stream[i] = -1.0;
          }
        }
        return stream;
      };
      return SoundSystem;
    })();
    return (function() {
      var X, Y, animate, bases, basex, basey, color, f, i, i0, i1, i2, indexes, j, m, max, mills, min, r, sys, tg, toggle, x, y, _i, _ref5, _ref6, _ref7, _ref8, _ref9, _results;
      if (location.search) {
        r = Number(location.search.substr(1));
        if (isNaN(r)) {
          r = 35;
        }
        if (r < 15) {
          r = 15;
        } else if (r > 80) {
          r = 80;
        }
      } else {
        r = 35;
      }
      mills = [];
      color = "227, 193, 93";
      X = ((width - 20) / (r * 2.0)) | 0;
      Y = ((height - 20) / (r * 1.8)) | 0;
      for (i = 0; 0 <= Y ? i < Y : i > Y; 0 <= Y ? i++ : i--) {
        basex = i % 2 ? r * 2 : r;
        basey = i * sqrt(3) * r;
        for (j = 0, _ref5 = X - (i % 2); 0 <= _ref5 ? j < _ref5 : j > _ref5; 0 <= _ref5 ? j++ : j--) {
          x = basex + j * (r * 2) + 10;
          y = basey + r + 10;
          x += (Math.random() - 0.5) * 10;
          y += (Math.random() - 0.5) * 10;
          f = (Math.random() - 0.5) * 3;
          if (min > max) {
            _ref6 = [max, min], min = _ref6[0], max = _ref6[1];
          }
          m = new Windmill({
            x: x,
            y: y,
            r: r,
            freq: f,
            count: 5,
            min: -1.5,
            max: 3.0
          });
          m.color = "rgba(" + color + ", 0.2)";
          if ((_ref7 = mills[mills.length - 1]) != null) {
            _ref7.next = m;
          }
          mills.push(m);
        }
      }
      animate = function() {
        var now, saveStrokeStyle;
        saveStrokeStyle = ctx.strokeStyle;
        ctx.fillStyle = "rgba(252, 243, 195, 0.25)";
        ctx.fillRect(0, 0, width, height - 20);
        now = +new Date();
        mills[0].animate(now);
        ctx.strokeStyle = saveStrokeStyle;
        return requestAnimationFrame(animate);
      };
      $canvas.mousemove(function(e) {
        var m, offset, _i, _len, _results;
        offset = $canvas.offset();
        x = e.pageX - offset.left;
        y = e.pageY - offset.top;
        _results = [];
        for (_i = 0, _len = mills.length; _i < _len; _i++) {
          m = mills[_i];
          _results.push(m.mousemove(x, y));
        }
        return _results;
      });
      requestAnimationFrame(animate);
      sys = new SoundSystem();
      if (sys.player) {
        bases = ((function() {
          var _results;
          _results = [];
          for (i = 600; i <= 7350; i += 250) {
            _results.push(i);
          }
          return _results;
        })()).shuffle();
        indexes = (function() {
          _results = [];
          for (var _i = 0, _ref8 = mills.length; 0 <= _ref8 ? _i < _ref8 : _i > _ref8; 0 <= _ref8 ? _i++ : _i--){ _results.push(_i); }
          return _results;
        }).apply(this).shuffle();
        for (i = 0, _ref9 = (mills.length / 3) | 0; 0 <= _ref9 ? i < _ref9 : i > _ref9; 0 <= _ref9 ? i++ : i--) {
          i0 = indexes[i * 3 + 0];
          i1 = indexes[i * 3 + 1];
          i2 = indexes[i * 3 + 2];
          mills[i0].color = "rgba(" + color + ", 0.8)";
          mills[i1].color = "rgba(" + color + ", 0.3)";
          mills[i2].color = "rgba(" + color + ", 0.6)";
          tg = new ToneGenerator(sys);
          tg.chbase(bases[i % bases.length]);
          tg.bind(mills[i0], mills[i1], mills[i2]);
          sys.add(tg);
        }
        console.log("poly: " + sys.gens.length);
        toggle = function() {
          ctx.clearRect(5, height - 20, 60, 20);
          if (sys.player.isPlaying()) {
            sys.stop();
            ctx.strokeStyle = "rgba(" + color + ", 0.8)";
            return ctx.strokeText("Sound OFF", 5, height - 5);
          } else {
            sys.play();
            ctx.strokeStyle = "rgba(" + color + ", 1.0)";
            return ctx.strokeText("Sound ON", 5, height - 5);
          }
        };
        $canvas.click(function(e) {
          var offset;
          offset = $canvas.offset();
          x = e.pageX - offset.left;
          y = e.pageY - offset.top;
          if (x < 65 && height - 20 < y) {
            return toggle();
          }
        });
        $(window).keydown(function(e) {
          if (!e.ctrkKey && !e.metaKey) {
            switch (e.keyCode) {
              case 32:
                return toggle();
            }
          }
        });
        ctx.strokeStyle = "rgba(" + color + ", 0.8)";
        ctx.strokeText("Sound ON", 5, height - 5);
        return toggle();
      }
    })();
  });
}).call(this);
