(function() {
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  $(function() {
    var DEBUG, PI2, TABLE_LENGTH, famicon_tri, i, img, main, pow, sin, sinetable, sqrt, _ref, _ref2, _ref3, _ref4;
    PI2 = Math.PI * 2;
    sin = Math.sin;
    sqrt = Math.sqrt;
    pow = Math.pow;
    Array.prototype.randomchoice = function() {
      return this[(Math.random() * this.length) | 0];
    };
    TABLE_LENGTH = 1024;
    sinetable = new Float32Array((function() {
      var _results;
      _results = [];
      for (i = 0; 0 <= TABLE_LENGTH ? i < TABLE_LENGTH : i > TABLE_LENGTH; 0 <= TABLE_LENGTH ? i++ : i--) {
        _results.push(sin(PI2 * (i / TABLE_LENGTH)));
      }
      return _results;
    })());
    famicon_tri = (function() {
      var cnt, i, j, s, src, wavelet, _len;
      src = [+0.000, +0.125, +0.250, +0.375, +0.500, +0.625, +0.750, +0.875, +0.875, +0.750, +0.625, +0.500, +0.375, +0.250, +0.125, +0.000, -0.125, -0.250, -0.375, -0.500, -0.625, -0.750, -0.875, -1.000, -1.000, -0.875, -0.750, -0.625, -0.500, -0.375, -0.250, -0.125];
      wavelet = new Float32Array(TABLE_LENGTH);
      cnt = TABLE_LENGTH / src.length;
      for (i = 0, _len = src.length; i < _len; i++) {
        s = src[i];
        for (j = 0; 0 <= cnt ? j < cnt : j > cnt; 0 <= cnt ? j++ : j--) {
          wavelet[i * cnt + j] = s;
        }
      }
      return wavelet;
    })();
    if (typeof requestAnimationFrame === "undefined" || requestAnimationFrame === null) {
      requestAnimationFrame = (_ref = (_ref2 = (_ref3 = (_ref4 = window.webkitRequestAnimationFrame) != null ? _ref4 : window.mozRequestAnimationFrame) != null ? _ref3 : window.oRequestAnimationFrame) != null ? _ref2 : window.msRequestAnimationFrame) != null ? _ref : function(f) {
        return setTimeout(f, 1000 / 60);
      };
    }
    DEBUG = 0;
    main = function(img) {
      var $canvas, BPM, DancingPortrait, Delay, FPS, MMLTrack, MarkovMMLTrack, SoundSystem, ToneGenerator, animate, canvas, ctx, height, imgData, invention_13, isAnimate, mosaic, portrait, sys, width;
      BPM = 90;
      FPS = 60;
      imgData = function(img) {
        var canvas, ctx, height, width;
        canvas = document.createElement("canvas");
        width = canvas.width = img.width;
        height = canvas.height = img.height;
        $(canvas).width(width).height(height);
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, width, height);
      };
      mosaic = function(imgData, w, h) {
        var average, cx, cy, x, y;
        average = function(x, y) {
          var B, G, R, _ref5, _ref6, _ref7, _x, _y;
          _ref5 = [0, 0, 0], R = _ref5[0], G = _ref5[1], B = _ref5[2];
          for (_y = y, _ref6 = y + h; y <= _ref6 ? _y < _ref6 : _y > _ref6; y <= _ref6 ? _y++ : _y--) {
            for (_x = x, _ref7 = x + w; x <= _ref7 ? _x < _ref7 : _x > _ref7; x <= _ref7 ? _x++ : _x--) {
              R += imgData.data[(imgData.width * _y + _x) * 4 + 0];
              G += imgData.data[(imgData.width * _y + _x) * 4 + 1];
              B += imgData.data[(imgData.width * _y + _x) * 4 + 2];
            }
          }
          return {
            B: (B / (w * h)) | 0,
            G: (G / (w * h)) | 0,
            R: (R / (w * h)) | 0,
            A: 255
          };
        };
        cx = (imgData.width / w) | 0;
        cy = (imgData.height / h) | 0;
        return {
          width: cx,
          height: cy,
          data: (function() {
            var _results;
            _results = [];
            for (y = 0; 0 <= cy ? y < cy : y > cy; 0 <= cy ? y++ : y--) {
              _results.push((function() {
                var _results2;
                _results2 = [];
                for (x = 0; 0 <= cx ? x < cx : x > cx; 0 <= cx ? x++ : x--) {
                  _results2.push(average(x * w, y * h));
                }
                return _results2;
              })());
            }
            return _results;
          })()
        };
      };
      DancingPortrait = (function() {
        var Cell;
        Cell = (function() {
          function Cell(rgb, size, x, y, z) {
            var _ref5;
            if (z == null) {
              z = 0.0;
            }
            this.fillStyle = "" + rgb;
            _ref5 = [size, x, y, z], this.size = _ref5[0], this.x = _ref5[1], this.y = _ref5[2], this.z = _ref5[3];
          }
          Cell.prototype.draw = function(ctx, dx, dy) {
            var rate, size, x, y;
            size = this.size;
            rate = this.z / 5;
            x = (this.x + dx * rate + 0.5) | 0;
            y = (this.y + dy * rate + 0.5) | 0;
            ctx.fillStyle = "rgba(" + this.fillStyle + ", 0.5)";
            return ctx.fillRect(x, y, size, size);
          };
          return Cell;
        })();
        function DancingPortrait(options) {
          var c, cells, d, dx, dy, m, x, y, _ref10, _ref5, _ref6, _ref7, _ref8, _ref9;
          this.ctx = options.ctx;
          this.imgData = options.imgData;
          this.cellsize = (_ref5 = options.cellsize) != null ? _ref5 : 3;
          this.mosaic = m = mosaic(this.imgData, this.cellsize, this.cellsize);
          this.tile = (_ref6 = options.tile) != null ? _ref6 : 4;
          this.cells = cells = [];
          for (y = 0, _ref7 = m.height; 0 <= _ref7 ? y < _ref7 : y > _ref7; 0 <= _ref7 ? y++ : y--) {
            for (x = 0, _ref8 = m.width; 0 <= _ref8 ? x < _ref8 : x > _ref8; 0 <= _ref8 ? x++ : x--) {
              d = m.data[y][x];
              c = new Cell("" + d.R + ", " + d.G + ", " + d.B, this.tile, x * this.tile, y * this.tile);
              dx = (m.width / 2) - x;
              dy = (m.height / 4) - y;
              c.z = -sqrt(dx * dx + dy * dy);
              cells.push(c);
            }
          }
          cells.sort(function(a, b) {
            return a.z - b.z;
          });
          this.anime_prev = +new Date();
          _ref9 = [0, 0, 1.0], this.x_index = _ref9[0], this.x_speed = _ref9[1], this.x_rate = _ref9[2];
          _ref10 = [0, 0, 1.0], this.y_index = _ref10[0], this.y_speed = _ref10[1], this.y_rate = _ref10[2];
        }
        DancingPortrait.prototype.animate = function() {
          var c, ctx, dx, dy, elapsed, now, _i, _len, _ref5;
          ctx = this.ctx;
          now = +new Date();
          elapsed = now - this.anime_prev;
          this.anime_prev = now;
          dx = this.x_index;
          dy = sinetable[this.y_index | 0] * this.y_rate;
          _ref5 = this.cells;
          for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
            c = _ref5[_i];
            c.draw(ctx, dx, dy);
          }
          i = i % TABLE_LENGTH;
          this.y_index += this.y_speed * elapsed;
          if (this.y_index >= TABLE_LENGTH) {
            return this.y_index -= TABLE_LENGTH;
          }
        };
        return DancingPortrait;
      })();
      ToneGenerator = (function() {
        var NONE_STREAM_CELL, SAMPLERATE, STEP_TABLE, STREAM_CELL_SIZE;
        SAMPLERATE = 0;
        STREAM_CELL_SIZE = 0;
        NONE_STREAM_CELL = null;
        STEP_TABLE = null;
        function ToneGenerator(player, options) {
          var _ref5, _ref6, _ref7, _ref8, _ref9;
          if (options == null) {
            options = {};
          }
          this.wavelet = (_ref5 = options.wavelet) != null ? _ref5 : sinetable;
          this.volume = (_ref6 = options.volume) != null ? _ref6 : 0.75;
          this.phase = (_ref7 = options.phase) != null ? _ref7 : 0;
          this.phaseStep = (_ref8 = this.STEP_TABLE[options.noteIndex]) != null ? _ref8 : 0;
          this.duration = (_ref9 = options.duration) != null ? _ref9 : 1000;
          this.ampSampleMax = this.ampSample = (this.duration / 1000) * this.SAMPLERATE;
          this.next = this._next_stream;
          this.finished = false;
        }
        ToneGenerator.prototype._next_stream = function() {
          var i, phase, phaseStep, stream, vol, wavelet, _ref5, _ref6;
          _ref5 = [this.wavelet, this.phase, this.phaseStep], wavelet = _ref5[0], phase = _ref5[1], phaseStep = _ref5[2];
          STREAM_CELL_SIZE = this.STREAM_CELL_SIZE;
          this.ampSample -= STREAM_CELL_SIZE;
          if (this.ampSample <= 0) {
            _ref6 = [0, true, this._next_none], vol = _ref6[0], this.finished = _ref6[1], this.next = _ref6[2];
          } else {
            vol = this.ampSample / this.ampSampleMax;
          }
          vol *= this.volume;
          stream = new Float32Array(STREAM_CELL_SIZE);
          for (i = 0; 0 <= STREAM_CELL_SIZE ? i < STREAM_CELL_SIZE : i > STREAM_CELL_SIZE; 0 <= STREAM_CELL_SIZE ? i++ : i--) {
            stream[i] = wavelet[(phase | 0) % TABLE_LENGTH] * vol;
            phase += phaseStep;
          }
          this.phase = phase;
          return stream;
        };
        ToneGenerator.prototype._next_none = function() {
          return this.NONE_STREAM_CELL;
        };
        ToneGenerator.prototype.initialize = function(player, options) {
          var A3, center, resolution, samplerate, size, steptable, _ref5, _ref6, _ref7, _ref8;
          if (options == null) {
            options = {};
          }
          this.SAMPLERATE = player.SAMPLERATE;
          this.STREAM_CELL_SIZE = player.STREAM_CELL_SIZE;
          this.NONE_STREAM_CELL = new Float32Array(player.STREAM_CELL_SIZE);
          samplerate = this.SAMPLERATE;
          A3 = (_ref5 = options.A3) != null ? _ref5 : 440;
          size = (_ref6 = options.size) != null ? _ref6 : 128;
          resolution = (_ref7 = options.resolution) != null ? _ref7 : 1;
          center = (_ref8 = options.center) != null ? _ref8 : size >> 1;
          return this.STEP_TABLE = steptable = (function() {
            var calcStep, i, _results;
            calcStep = function(i) {
              var freq;
              freq = A3 * pow(pow(2, 1 / (12 * resolution)), i - center);
              return freq * TABLE_LENGTH / samplerate;
            };
            _results = [];
            for (i = 0; 0 <= size ? i < size : i > size; 0 <= size ? i++ : i--) {
              _results.push(calcStep(i));
            }
            return _results;
          })();
        };
        return ToneGenerator;
      })();
      MMLTrack = (function() {
        function MMLTrack(player, options) {
          var _ref5, _ref6, _ref7;
          if (options == null) {
            options = {};
          }
          this.player = player;
          this.originData = options.mml;
          this.SAMPLERATE = this.player.SAMPLERATE;
          this.vol = (_ref5 = options.vol) != null ? _ref5 : 0.5;
          this.bpm = (_ref6 = options.bpm) != null ? _ref6 : 120;
          this.shift = (_ref7 = options.shift) != null ? _ref7 : 0;
          this.index = 0;
          this.finished = false;
          this.noteCounterMax = 0;
          this.noteCounter = 0;
          this.gens = [];
          this.next = this._next_none;
          this._compile(this.originData);
        }
        MMLTrack.prototype.nextTones = function() {
          var res;
          res = this.data[this.index++];
          if (res != null) {
            return [res];
          } else {
            return null;
          }
        };
        MMLTrack.prototype._next_stream = function() {
          var STREAM_CELL_SIZE, d, g, gen, gens, i, j, k1, k2, lis, noteCounter, noteCounterMax, options, player, samples, stream, streamcell, vol, _i, _j, _len, _len2, _ref5, _ref6, _ref7;
          player = this.player;
          STREAM_CELL_SIZE = player.STREAM_CELL_SIZE;
          _ref5 = [this.noteCounter, this.noteCounterMax], noteCounter = _ref5[0], noteCounterMax = _ref5[1];
          _ref6 = [this.gens, this.vol], gens = _ref6[0], vol = _ref6[1];
          stream = new Float32Array(player.STREAM_FULL_SIZE);
          k1 = 0;
          for (i = 0, _ref7 = player.STREAM_CELL_COUNT; 0 <= _ref7 ? i < _ref7 : i > _ref7; 0 <= _ref7 ? i++ : i--) {
            noteCounter -= STREAM_CELL_SIZE;
            if (noteCounter <= 0) {
              if ((lis = this.nextTones()) != null) {
                for (_i = 0, _len = lis.length; _i < _len; _i++) {
                  d = lis[_i];
                  if (d.noteIndex !== -1) {
                    options = {
                      noteIndex: d.noteIndex + this.shift,
                      duration: 500,
                      volume: d.velocity / 15,
                      wavelet: famicon_tri
                    };
                    g = new ToneGenerator(player, options);
                    gens.push(g);
                  }
                }
                samples = (60 / this.bpm) * this.SAMPLERATE * (4 / d.length);
                noteCounter += samples;
              } else {
                this.finished = true;
                this.next = this._next_none;
                noteCounter = Infinity;
                console.log("end");
              }
            }
            for (_j = 0, _len2 = gens.length; _j < _len2; _j++) {
              gen = gens[_j];
              streamcell = gen.next();
              k2 = k1;
              for (j = 0; 0 <= STREAM_CELL_SIZE ? j < STREAM_CELL_SIZE : j > STREAM_CELL_SIZE; 0 <= STREAM_CELL_SIZE ? j++ : j--) {
                stream[k2++] += streamcell[j] * vol;
              }
            }
            k1 = k2;
          }
          this.gens = gens.filter(function(x) {
            return !x.finished;
          });
          this.noteCounter = noteCounter;
          return stream;
        };
        MMLTrack.prototype._next_none = function() {
          return new Float32Array(this.player.STREAM_FULL_SIZE);
        };
        MMLTrack.prototype._compile = function(data) {
          var L, O, S, TONES, V, cmd, length, noteIndex, r, sign, t, val, x, _ref5;
          _ref5 = [3, 8, 12], O = _ref5[0], L = _ref5[1], V = _ref5[2];
          TONES = {
            c: 0,
            d: 2,
            e: 4,
            f: 5,
            g: 7,
            a: 9,
            b: 11
          };
          S = {
            "-": -1,
            "+": +1
          };
          r = /([cdefgabrolv<>])([-+]?)(\d*)/gm;
          this.data = (function() {
            var _ref6, _ref7, _results;
            _results = [];
            while ((x = r.exec(data.toLowerCase())) != null) {
              _ref6 = x.slice(1, 4), cmd = _ref6[0], sign = _ref6[1], val = _ref6[2];
              t = null;
              switch (cmd) {
                case "o":
                  if (val !== "") {
                    O = Number(val);
                  }
                  break;
                case "l":
                  if (val !== "") {
                    L = Number(val);
                  }
                  break;
                case "v":
                  if (val !== "") {
                    V = Number(val);
                  }
                  break;
                case "<":
                  if (O < 8) {
                    O += 1;
                  }
                  break;
                case ">":
                  if (O > 1) {
                    O -= 1;
                  }
                  break;
                case "r":
                  t = -1;
                  break;
                default:
                  t = TONES[cmd];
              }
              switch (t) {
                case null:
                  continue;
                case -1:
                  noteIndex = -1;
                  break;
                default:
                  noteIndex = O * 12 + t + 36 + ((_ref7 = S[sign]) != null ? _ref7 : 0);
              }
              length = val === "" ? L : Number(val);
              _results.push({
                noteIndex: noteIndex,
                length: length,
                velocity: V
              });
            }
            return _results;
          })();
          return this.next = this._next_stream;
        };
        return MMLTrack;
      })();
      MarkovMMLTrack = (function() {
        __extends(MarkovMMLTrack, MMLTrack);
        function MarkovMMLTrack(player, options) {
          var _ref5;
          if (options == null) {
            options = {};
          }
          MarkovMMLTrack.__super__.constructor.call(this, player, options);
          this.lv = (_ref5 = options.lv) != null ? _ref5 : 4;
          this.markov = {};
          this.chord = {};
          this.histNoteIndex = [];
          this.prevNoteIndex = 0;
          this.index = 0;
          this.readIndex = 0;
          this.velocity = 12;
          this.makeMarkovData(this.lv);
        }
        MarkovMMLTrack.prototype.nextTones = function() {
          var histNoteIndex, i, key, lv, noteIndex, noteIndexCands, noteLengthCands, subNoteIndex, _ref5, _ref6, _ref7, _ref8;
          _ref5 = [null, null], noteIndexCands = _ref5[0], noteLengthCands = _ref5[1];
          _ref6 = [this.lv, this.histNoteIndex], lv = _ref6[0], histNoteIndex = _ref6[1];
          for (i = 0; 0 <= lv ? i < lv : i > lv; 0 <= lv ? i++ : i--) {
            key = histNoteIndex.slice(i, lv).join(",");
            if ((noteIndexCands = this.markov[key]) != null) {
              break;
            }
          }
          if (noteIndexCands != null) {
            noteIndex = noteIndexCands.randomchoice();
          } else {
            noteIndex = this.data[this.readIndex++].noteIndex;
            if (this.readIndex >= this.data.length) {
              this.index = 0;
            }
          }
          histNoteIndex.push(noteIndex);
          if (histNoteIndex.length > lv) {
            histNoteIndex.shift();
          }
          this.histNoteIndex = histNoteIndex;
          if (this.prevNoteIndex === noteIndex) {
            this.velocity -= 2;
            if (this.velocity <= 0) {
              this.velocity = 12;
              this.histNoteIndex = [];
            }
          } else {
            this.velocity = 12;
            this.prevNoteIndex = noteIndex;
          }
          subNoteIndex = (_ref7 = (_ref8 = this.chord[noteIndex]) != null ? _ref8.randomchoice() : void 0) != null ? _ref7 : -1;
          return [
            {
              noteIndex: noteIndex,
              length: this.minLength,
              velocity: this.velocity
            }, {
              noteIndex: subNoteIndex,
              length: this.minLength,
              velocity: 4
            }
          ];
        };
        MarkovMMLTrack.prototype.makeMarkovData = function(lv) {
          var data, i, make, markov;
          if (lv == null) {
            lv = 2;
          }
          this.minLength = this.data.map(function(x) {
            return x.length;
          }).reduce(function(a, b) {
            return Math.max(a, b);
          });
          data = __bind(function() {
            var d, i, lis, noteIndex, prev, _i, _len, _ref5, _ref6, _ref7;
            _ref5 = [[], null], lis = _ref5[0], prev = _ref5[1];
            _ref6 = this.data;
            for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
              d = _ref6[_i];
              if (d.noteIndex === -1) {
                if (!(prev != null)) {
                  continue;
                }
                noteIndex = prev;
              } else {
                noteIndex = d.noteIndex;
              }
              for (i = 0, _ref7 = this.minLength / d.length; 0 <= _ref7 ? i < _ref7 : i > _ref7; 0 <= _ref7 ? i++ : i--) {
                lis.push({
                  noteIndex: noteIndex,
                  length: this.minLength
                });
              }
            }
            return lis;
          }, this)();
          make = __bind(function(dst, lv) {
            var d, key, lis, _i, _len, _ref5, _results;
            lis = [];
            _results = [];
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              d = data[_i];
              if (lis.length === lv) {
                key = lis.map(function(x) {
                  return x.noteIndex;
                }).join(",");
                ((_ref5 = dst[key]) != null ? _ref5 : dst[key] = []).push(d.noteIndex);
              }
              lis.push(d);
              _results.push(lis.length > lv ? lis.shift() : void 0);
            }
            return _results;
          }, this);
          markov = {};
          for (i = 1; 1 <= lv ? i <= lv : i >= lv; 1 <= lv ? i++ : i--) {
            make(markov, i);
          }
          return this.markov = markov;
        };
        MarkovMMLTrack.prototype.makeChord = function(others) {
          var a, b, chord, pair, zip, _i, _len, _ref5, _ref6;
          zip = function() {
            var argumentLength, arr, i, length, lengthArray, results, semiResult, _i, _len;
            lengthArray = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = arguments.length; _i < _len; _i++) {
                arr = arguments[_i];
                _results.push(arr.length);
              }
              return _results;
            }).apply(this, arguments);
            length = Math.max.apply(Math, lengthArray);
            argumentLength = arguments.length;
            results = [];
            for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
              semiResult = [];
              for (_i = 0, _len = arguments.length; _i < _len; _i++) {
                arr = arguments[_i];
                semiResult.push(arr[i]);
              }
              results.push(semiResult);
            }
            return results;
          };
          chord = {};
          _ref5 = zip(this.data, others.data);
          for (_i = 0, _len = _ref5.length; _i < _len; _i++) {
            pair = _ref5[_i];
            if (!(pair[0] != null) || !(pair[1] != null)) {
              break;
            }
            a = pair[0].noteIndex;
            b = pair[1].noteIndex;
            if (a !== -1 && b !== -1) {
              b = a - ((a - b) % 12);
            }
            ((_ref6 = chord[a]) != null ? _ref6 : chord[a] = []).push(b);
          }
          return this.chord = chord;
        };
        return MarkovMMLTrack;
      })();
      Delay = (function() {
        function Delay(player, options) {
          var sampleDuration, sampleSamples, _ref5, _ref6, _ref7;
          if (options == null) {
            options = {};
          }
          this.player = player;
          this.SAMPLERATE = this.player.SAMPLERATE;
          sampleDuration = (_ref5 = options.sampleDuration) != null ? _ref5 : 2000;
          sampleSamples = (sampleDuration / 1000) * this.SAMPLERATE;
          this.sampleSamples = 1 << Math.ceil(Math.log(sampleSamples) * Math.LOG2E);
          this.sampleDuration = this.sampleSamples / this.SAMPLERATE;
          this.buffer = new Float32Array(this.sampleSamples);
          this.delay = (_ref6 = options.delay) != null ? _ref6 : 100;
          this.mix = (_ref7 = options.mix) != null ? _ref7 : 0.25;
          this.masterVolume = 1.0 - this.mix;
          this.delayVolume = this.mix;
          this.delaySamples = (this.delay / 1000) * this.SAMPLERATE;
          this.inputIndex = this.delaySamples;
          this.outputIndex = 0;
        }
        Delay.prototype.process = function(stream) {
          var STREAM_FULL_SIZE, buffer, delayVolume, i, inputIndex, masterVolume, outputIndex, sampleSamples, v0, v1, v2, _ref5, _ref6;
          STREAM_FULL_SIZE = this.player.STREAM_FULL_SIZE;
          _ref5 = [this.buffer, this.inputIndex, this.outputIndex], buffer = _ref5[0], inputIndex = _ref5[1], outputIndex = _ref5[2];
          masterVolume = this.masterVolume;
          delayVolume = this.delayVolume;
          sampleSamples = this.sampleSamples;
          for (i = 0; 0 <= STREAM_FULL_SIZE ? i < STREAM_FULL_SIZE : i > STREAM_FULL_SIZE; 0 <= STREAM_FULL_SIZE ? i++ : i--) {
            v1 = stream[i];
            v2 = buffer[outputIndex++];
            v0 = v1 * masterVolume + v2 * delayVolume;
            buffer[inputIndex++] = v0;
            stream[i] = v0;
            if (inputIndex >= sampleSamples) {
              inputIndex = 0;
            }
            if (outputIndex >= sampleSamples) {
              outputIndex = 0;
            }
          }
          _ref6 = [outputIndex, inputIndex], this.outputIndex = _ref6[0], this.inputIndex = _ref6[1];
          return stream;
        };
        Delay.prototype.setDepth = function(val) {
          this.mix = val;
          this.masterVolume = 1.0 - this.mix;
          return this.delayVolume = this.mix;
        };
        Delay.prototype.setDelay = function(val) {
          if ((0 < val && val < this.sampleDuration)) {
            this.delay = val;
            this.delaySamples = (val / 1000) * this.SAMPLERATE;
            this.inputIndex = this.outputIndex + this.delaySamples;
            if (this.inputIndex > this.sampleSamples) {
              return this.inputIndex -= this.sampleSamples;
            }
          }
        };
        return Delay;
      })();
      SoundSystem = (function() {
        function SoundSystem() {
          var player;
          player = pico.getplayer();
          if (player) {
            this.player = player;
            this.efx = new Delay(this.player, {
              delay: 320
            });
            ToneGenerator.prototype.initialize(this.player, {
              center: 69
            });
            this.mmlTracks = [];
            this.readEnd = false;
          } else {
            this.player = null;
          }
        }
        SoundSystem.prototype.setMML = function(val) {
          var t0, t1, t2, t3, v;
          if (this.player) {
            v = val.split(";");
            t0 = new MMLTrack(this.player, {
              mml: v[0],
              bpm: BPM,
              shift: 0
            });
            t1 = new MMLTrack(this.player, {
              mml: v[1],
              bpm: BPM,
              shift: -12
            });
            t2 = new MarkovMMLTrack(this.player, {
              mml: v[0],
              bpm: BPM,
              shift: 0
            });
            t3 = new MarkovMMLTrack(this.player, {
              mml: v[1],
              bpm: BPM,
              shift: 0
            });
            t2.makeChord(t3);
            this.normalTracks = [t0, t1];
            return this.markovTrack = [t2];
          }
        };
        SoundSystem.prototype.setMode = function(val) {
          return this.mmlTracks = (function() {
            switch (val) {
              case "markov":
                return this.markovTrack;
              default:
                return this.normalTracks;
            }
          }).call(this);
        };
        SoundSystem.prototype.setEfxDepth = function(val) {
          if (val < 0) {
            val = 0;
          } else if (val > 1.0) {
            val = 1.0;
          }
          return this.efx.setDepth((val * 0.8) + 0.10);
        };
        SoundSystem.prototype.play = function() {
          if (this.player && !this.player.isPlaying()) {
            return this.player.play(this);
          }
        };
        SoundSystem.prototype.stop = function() {
          if (this.player && this.player.isPlaying()) {
            return this.player.stop();
          }
        };
        SoundSystem.prototype.toggle = function() {
          if (this.player) {
            if (this.player.isPlaying()) {
              this.player.stop();
              return false;
            } else {
              this.player.play(this);
              return true;
            }
          } else {
            return false;
          }
        };
        SoundSystem.prototype.next = function() {
          var STREAM_FULL_SIZE, i, mml, mmlTracks, stream, streamcell, _i, _len;
          mmlTracks = this.mmlTracks;
          STREAM_FULL_SIZE = this.player.STREAM_FULL_SIZE;
          stream = new Float32Array(STREAM_FULL_SIZE);
          for (_i = 0, _len = mmlTracks.length; _i < _len; _i++) {
            mml = mmlTracks[_i];
            streamcell = mml.next();
            for (i = 0; 0 <= STREAM_FULL_SIZE ? i < STREAM_FULL_SIZE : i > STREAM_FULL_SIZE; 0 <= STREAM_FULL_SIZE ? i++ : i--) {
              stream[i] += streamcell[i];
            }
          }
          this.mmlTracks = mmlTracks.filter(function(x) {
            return !x.finished;
          });
          if (this.mmlTracks.length === 0) {
            if (this.readEnd) {
              this.player.stop();
            } else {
              this.readEnd = true;
            }
          }
          this.efx.process(stream);
          return stream;
        };
        return SoundSystem;
      })();
      invention_13 = "o3l16\nrea<c>beb<dc8e8>g+8<e8 >aea<c>beb<dc8>a8r4\n<rece>a<c>egf8a8<d8f8 fd>b<d>gbdfe8g8<c8e8\nec>a<c>f8<d8d>bgbe8<c8 c>afad8b8<c8r8r4\n\n>rg<ced>g<dfe8g8>b8<g8 c>g<ced>g<dfe8c8g8e8\n<c>aeace>a<c d8f+8a8<c8 >bgdg>b<d>gb<c8e8g8b8\naf+d+f+>b<d+>f+ag8<g8gece >a+8<f+8f+d>b<d>g8<e8ec>a<c\n>f+<gf+ed+f+>b<d+e8r8r4\nrgb-gegc+egec+e>arr8 <rfafdf>b<dfd>b<d>grr8\n<regece>a<cd+c>a<c>f+rr8 <rdfd>b<d>g+b<d>bg+berr8\n\nrea<c>beb<dc8>a8g+8e8 a<cec>a<c>f+a<c>af+ad+<c>ba\ng+b<d>bg+bdfg+fdf>b<fed ceaece>a<cd+c>a<c>f+<c>ba\ng+8<b8g+8e8rea<c>beb<d c>a<ced>b<dfecegfedc\n>b<cdefdg+dbdcafd>b<d >g+b<c>aeabg+aece>a4<\n;\no2l16\na8<a4g+8aea<c>beb<d c8>a8g+8e8aea<c>beb<d\nc8>a8<c8>a8<d>afadf>a<c >b8<d8g8b8bgegce>gb\na8<c8df>b<d>g8b8<ce>a<c >f8d8g<gfgcg<ced>g<df\n\ne8c8>b8g8 <c>g<ced>g<df e8c8r4rgegce>gb\na8<c8e8g8f+adf+>a<d>f+a g8b8<d8f+8egce>g<c>eg\nf+8a8b8<d+8rece>a<ceg f+d>b<d>gb<df+ec>a<c>f+a<c8\nc>b<c>ab8>b8<e<e>bge>bgb\ne8<e8g8b-8c+8r8r<gfe d8>d8f8a-8>b8r8r<<fed\nc8>c8e8f+8>a8r8r<<ed+c+ >b8>b8<d8f8>g+8r8r<<dc>b\n\n<c8>a8g+8e8aea<c>beb<d ceaece>a<c>f+a<c>af+ad+f+\ne8g+8b8g+8e8>b8g+8e8 a8<c8e8c8>a8<c8>d+8r8\nr>bg+edbgdc8e8>g+8<e8 >a8<f+8>b8<g+8c8a8d8b-8\ng+8f8d8>b8g+8a8d8e8 f8d+8e8<e8>a2";
      $canvas = $(canvas = document.getElementById("canvas"));
      width = canvas.width = $canvas.width();
      height = canvas.height = $canvas.height();
      ctx = canvas.getContext("2d");
      portrait = new DancingPortrait({
        ctx: ctx,
        imgData: imgData(img)
      });
      portrait.y_speed = (TABLE_LENGTH * BPM * 2) / (60 * 1000);
      isAnimate = false;
      animate = function() {
        portrait.animate();
        if (isAnimate) {
          return requestAnimationFrame(animate);
        }
      };
      sys = new SoundSystem();
      sys.setMML(invention_13);
      $canvas.click(function(e) {
        var mode;
        mode = $("input[name=mode]:checked").val();
        sys.setMode(mode);
        if (sys.toggle()) {
          $("input[name=mode]").attr("disabled", true);
          if (mode === "markov") {
            isAnimate = true;
            return requestAnimationFrame(animate);
          }
        } else {
          $("input[name=mode]").attr("disabled", false);
          return isAnimate = false;
        }
      }).mousemove(function(e) {
        var offset, x, x_rate, y, y_rate;
        offset = $canvas.offset();
        x = e.pageX - offset.left;
        y = e.pageY - offset.top;
        x_rate = x / width;
        y_rate = y / height;
        sys.setEfxDepth(1.0 - y_rate);
        portrait.y_rate = (1.0 - y_rate) * 3.0 + 0.25;
        return portrait.x_index = (x_rate - 0.5) * 5;
      });
      $(window).keydown(function(e) {
        if (!e.ctrkKey && !e.metaKey) {
          switch (e.keyCode) {
            case 32:
              return $canvas.click();
            case 38:
              return $("#normal").click();
            case 40:
              return $("#markov").click();
          }
        }
      });
      return animate();
    };
    return $(img = document.createElement("img")).attr("src", "/images/bach.png").load(function(e) {
      return main(img);
    });
  });
}).call(this);
