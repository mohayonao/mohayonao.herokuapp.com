(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  $(function() {
    var $command, $log, $status, BP12, BR12, CHANNEL, CutoffFreqTable, HP12, IIRFilter, LP12, NONE, SAMPLERATE, System, ToneGenerator, cmd_add, cmd_del, cmd_filter, cmd_mute, cmd_mvol, cmd_pitch, cmd_replace, cmd_sel, cmd_set, cmd_solo, cmd_start, cmd_stop, i, sys, _ref, _ref2;
    _ref = [8000, 2], SAMPLERATE = _ref[0], CHANNEL = _ref[1];
    _ref2 = [-1, 0, 1, 2, 3], NONE = _ref2[0], LP12 = _ref2[1], HP12 = _ref2[2], BP12 = _ref2[3], BR12 = _ref2[4];
    $command = $("#command");
    $log = $("#log");
    $status = $("#status");
    CutoffFreqTable = (function() {
      var _results;
      _results = [];
      for (i = 0; i < 256; i++) {
        _results.push(440.0 * Math.pow(Math.pow(2, 1.0 / (12 * 6)), i - 64));
      }
      return _results;
    })();
    ToneGenerator = (function() {
      var idcount;
      idcount = 0;
      function ToneGenerator(player, text) {
        var func, _ref3, _ref4, _ref5;
        func = eval("(function(t){return " + text + ";})");
        this.ready = true;
        try {
          func(1);
        } catch (e) {
          this.ready = false;
        }
        if (this.ready) {
          this.id = idcount++;
          this.text = text;
          this.func = func;
          this.t1 = 0;
          this.t2 = 0;
          this.tstep = SAMPLERATE / player.SAMPLERATE;
          this.cellsize = player.STREAM_CELL_SIZE;
          this.pitch = 1;
          this.mute = false;
          this.filter = new IIRFilter(NONE, player.SAMPLERATE);
          this.counterLimit = 24;
          this.counter = 0;
          _ref3 = [
            0, function(t) {
              return 255;
            }
          ], this.vol = _ref3[0], this.volfunc = _ref3[1];
          _ref4 = [
            0, function(t) {
              return 255;
            }
          ], this.amp = _ref4[0], this.ampfunc = _ref4[1];
          _ref5 = [
            0, function(t) {
              return 128;
            }
          ], this.pan = _ref5[0], this.panfunc = _ref5[1];
          this.cutofffunc = function(t) {
            return 192;
          };
          this.resfunc = function(t) {
            return 192;
          };
          this.fampfunc = function(t) {
            return 128;
          };
        }
      }
      ToneGenerator.prototype.replace = function(text) {
        var func, isok;
        func = eval("(function(t){return " + text + ";})");
        isok = true;
        try {
          func(1);
          this.text = text;
        } catch (e) {
          isok = false;
        }
        if (isok) {
          this.func = func;
        }
        return isok;
      };
      ToneGenerator.prototype.set = function(type, text) {
        var func, isOk;
        func = eval("(function(t){return " + text + ";})");
        isOk = true;
        try {
          func(1);
        } catch (e) {
          isOk = false;
        }
        if (isOk) {
          this[type + 'func'] = func;
        }
        return isOk;
      };
      ToneGenerator.prototype.filtertype = function(type) {
        switch (type) {
          case "LP":
            type = LP12;
            break;
          case "HP":
            type = HP12;
            break;
          case "BP":
            type = BP12;
            break;
          case "BR":
            type = BR12;
            break;
          default:
            type = NONE;
        }
        return this.filter.chtype(type);
      };
      ToneGenerator.prototype.next = function() {
        var cutoff, func, i, res, streamcell, t, t2, tstep, v, vol, _ref3, _ref4;
        streamcell = new Float32Array(this.cellsize);
        if ((this.counter -= 1) <= 0) {
          t2 = this.t2;
          this.vol = (this.volfunc(t2) & 0x0ff) / 256.0;
          this.amp = (this.ampfunc(t2) & 0x0ff) / 256.0;
          this.pan = (this.panfunc(t2) & 0x0ff) / 256.0;
          if (this.filter.type !== NONE) {
            cutoff = CutoffFreqTable[this.cutofffunc(t2) & 0x0ff];
            res = (this.resfunc(t2) & 0x0ff) / 256.0;
            this.filter.chparam(cutoff, res);
            this.filter.champ((this.fampfunc(t2) & 0x0ff) / 256.0);
          }
          this.counter += this.counterLimit;
          this.t2 += this.tstep;
        }
        vol = this.vol * this.amp;
        _ref3 = [this.t1, this.func], t = _ref3[0], func = _ref3[1];
        tstep = this.tstep * this.pitch;
        for (i = 0, _ref4 = this.cellsize; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
          v = func(t) & 0x0ff;
          v = v / 128.0 - 0.5;
          streamcell[i] = v * vol;
          t += tstep;
        }
        this.filter.process(streamcell);
        this.t1 = t;
        return streamcell;
      };
      return ToneGenerator;
    })();
    IIRFilter = (function() {
      function IIRFilter(type, samplerate) {
        this.amp = 0.5;
        this.type = type;
        this._f = [0.0, 0.0, 0.0, 0.0];
        this._cutoff = 880;
        this._resonance = 0.1;
        this._freq = 0;
        this._damp = 0;
        this._samplerate = samplerate;
        this._calcCoeff(this._cutoff, this._resonance);
      }
      IIRFilter.prototype.process = function(stream) {
        var amp, i, input, output, type, _damp, _f, _freq, _ref3, _ref4, _results;
        _ref3 = [this._f, this._damp, this._freq, this.type, this.amp], _f = _ref3[0], _damp = _ref3[1], _freq = _ref3[2], type = _ref3[3], amp = _ref3[4];
        if (type !== NONE) {
          _results = [];
          for (i = 0, _ref4 = stream.length; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
            input = stream[i];
            _f[3] = input - _damp * _f[2];
            _f[0] = _f[0] + _freq * _f[2];
            _f[1] = _f[3] - _f[0];
            _f[2] = _freq * _f[1] + _f[2];
            output = 0.5 * _f[type];
            _f[3] = input - _damp * _f[2];
            _f[0] = _f[0] + _freq * _f[2];
            _f[1] = _f[3] - _f[0];
            _f[2] = _freq * _f[1] + _f[2];
            output += 0.5 * _f[type];
            _results.push(stream[i] = (input * (1.0 - amp)) + (output * amp));
          }
          return _results;
        }
      };
      IIRFilter.prototype.champ = function(val) {
        if (val < 0.0) {
          val = 0.0;
        } else if (1.0 < val) {
          val = 1.0;
        }
        return this.amp = val;
      };
      IIRFilter.prototype.chtype = function(type) {
        switch (type) {
          case LP12:
            return this.type = LP12;
          case BP12:
            return this.type = BP12;
          case HP12:
            return this.type = HP12;
          case BR12:
            return this.type = BR12;
          default:
            return this.type = NONE;
        }
      };
      IIRFilter.prototype.chcutoff = function(cutoff) {
        this._cutoff = cutoff;
        return this._calcCoeff(this._cutoff, this._resonance);
      };
      IIRFilter.prototype.chres = function(res) {
        this._resonance = res;
        return this._calcCoeff(this._cutoff, this._resonance);
      };
      IIRFilter.prototype.chparam = function(cutoff, res) {
        this._cutoff = cutoff;
        this._resonance = res;
        return this._calcCoeff(this._cutoff, this._resonance);
      };
      IIRFilter.prototype._calcCoeff = function(cutoff, resonance) {
        this._freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff / (this._samplerate * 2)));
        return this._damp = Math.min(2 * (1 - Math.pow(resonance, 0.25)), Math.min(2, 2 / this._freq - this._freq * 0.5));
      };
      return IIRFilter;
    })();
    System = (function() {
      function System() {
        $log.val("");
        $status.val("");
        this.gens = [];
        this.selectedgen = null;
        this.solo = null;
        this.vol = 1.0;
        this.history = [];
        this.historyIndex = 0;
        if (!(this.player = pico.getplayer({
          samplerate: 44100,
          channel: CHANNEL
        }))) {
          this.log("this browser is no support!");
        } else {
          this.log("one-liner-orchestra " + "samplerate=" + this.player.SAMPLERATE + ", channel=" + this.player.CHANNEL);
          $command.keydown(__bind(function(e) {
            var prevent;
            if (e.keyCode === 13) {
              return this.command($command.val());
            } else if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
              prevent = (function() {
                switch (e.keyCode) {
                  case 38:
                    return this.findHistory(-1);
                  case 40:
                    return this.findHistory(+1);
                }
              }).call(this);
              if (prevent) {
                return e.preventDefault();
              }
            }
          }, this));
        }
        this.next = CHANNEL === 2 ? this._next_2ch : this._next_1ch;
      }
      System.prototype.findIndex = function(id) {
        var gen, i, _len, _ref3;
        if (id != null) {
          _ref3 = this.gens;
          for (i = 0, _len = _ref3.length; i < _len; i++) {
            gen = _ref3[i];
            if (gen.id === id) {
              return i;
            }
          }
        }
        return null;
      };
      System.prototype.findHistory = function(vec) {
        i = this.historyIndex + vec;
        if ((0 <= i && i <= this.history.length)) {
          if (i >= this.history.length) {
            $command.val("");
          } else {
            $command.val(this.history[i]).focus().get(0).setSelectionRange(99, 99);
          }
          this.historyIndex = i;
        }
        return true;
      };
      System.prototype.log = function(text, err) {
        var v;
        v = text;
        if (err !== "sys" && (this.selectedgen != null)) {
          v = this.selectedgen.id + ":" + v;
        }
        if (err !== "sys" && (err != null)) {
          v += " ... " + err;
        }
        v += "\n";
        return $log.val($log.val() + v).scrollTop(2 << 16);
      };
      System.prototype._next_1ch = function() {
        var cell, cellsize, cnt, gen, i, j, solo, stream, vol, _i, _len, _ref3, _ref4;
        cnt = this.player.STREAM_CELL_COUNT;
        cellsize = this.player.STREAM_CELL_SIZE;
        solo = this.solo;
        vol = this.vol;
        stream = new Float32Array(cellsize * cnt);
        for (i = 0; 0 <= cnt ? i < cnt : i > cnt; 0 <= cnt ? i++ : i--) {
          _ref3 = this.gens;
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            gen = _ref3[_i];
            if (gen.mute || ((solo != null) && solo !== gen.id)) {
              continue;
            }
            cell = gen.next();
            for (j = 0; 0 <= cellsize ? j < cellsize : j > cellsize; 0 <= cellsize ? j++ : j--) {
              stream[i * cellsize + j] += cell[j] * vol;
            }
          }
        }
        for (i = 0, _ref4 = cellsize * cnt; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
          if (stream[i] < -1.0) {
            stream[i] = -1.0;
          } else if (1.0 < stream[i]) {
            stream[i] = 1.0;
          }
        }
        return stream;
      };
      System.prototype._next_2ch = function() {
        var L, R, cell, cellsize, cnt, gen, i, j, pan, solo, stream, vol, _i, _len, _ref3, _ref4;
        cnt = this.player.STREAM_CELL_COUNT;
        cellsize = this.player.STREAM_CELL_SIZE;
        solo = this.solo;
        vol = this.vol;
        stream = new Float32Array(cellsize * cnt * 2);
        for (i = 0; 0 <= cnt ? i < cnt : i > cnt; 0 <= cnt ? i++ : i--) {
          _ref3 = this.gens;
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            gen = _ref3[_i];
            if (gen.mute || ((solo != null) && solo !== gen.id)) {
              continue;
            }
            pan = gen.pan;
            L = (1.0 - pan) * 2.0 * vol;
            R = pan * 2.0 * vol;
            cell = gen.next();
            for (j = 0; 0 <= cellsize ? j < cellsize : j > cellsize; 0 <= cellsize ? j++ : j--) {
              stream[(i * cellsize + j) * 2] += cell[j] * L;
              stream[(i * cellsize + j) * 2 + 1] += cell[j] * R;
            }
          }
        }
        for (i = 0, _ref4 = cellsize * cnt; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
          if (stream[i] < -1.0) {
            stream[i] = -1.0;
          } else if (1.0 < stream[i]) {
            stream[i] = 1.0;
          }
        }
        return stream;
      };
      System.prototype.command = function(command) {
        var gen, line, selectedid, statuses, tokens, _i, _len, _ref3, _ref4;
        if (!command) {
          return;
        }
        tokens = command.split(" ");
        this.log(command, __bind(function() {
          var alias;
          switch (tokens[0]) {
            case "start":
              return cmd_start(this);
            case "stop":
              return cmd_stop(this);
            case "mastervol":
              return cmd_mvol(this, Number(tokens[1]));
            case "add":
              return cmd_add(this, command.substr(4));
            case "sel":
            case "ch":
              return cmd_sel(this, Number(tokens[1]));
            case "del":
              return cmd_del(this, Number(tokens[1]));
            case "mute":
              return cmd_mute(this, Number(tokens[1]));
            case "solo":
              return cmd_solo(this, Number(tokens[1]));
            case "vol":
            case "amp":
            case "pan":
            case "cutoff":
            case "res":
            case "famp":
              return cmd_set(this, tokens[0], command.substr(tokens[0].length + 1));
            case "v":
            case "a":
            case "c":
            case "Q":
            case "filteramp":
              alias = {
                v: "vol",
                a: "amp",
                c: "cutoff",
                Q: "res",
                filteramp: "famp"
              };
              return cmd_set(this, alias[tokens[0]], command.substr(tokens[0].length + 1));
            case "pitch":
              return cmd_pitch(this, Number(tokens[1]));
            case "replace":
              return cmd_replace(this, command.substr(8));
            case "filter":
            case "f":
              return cmd_filter(this, tokens[1]);
            default:
              return cmd_add(this, command);
          }
        }, this)());
        this.history.push(command);
        this.historyIndex = this.history.length;
        statuses = [];
        selectedid = (_ref3 = this.selectedgen) != null ? _ref3.id : void 0;
        _ref4 = sys.gens;
        for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
          gen = _ref4[_i];
          line = gen.id === selectedid ? "*" : " ";
          line += "[";
          line += gen.mute ? "M" : " ";
          line += sys.solo === gen.id ? "S" : " ";
          line += "] ";
          line += gen.id + " ";
          line += gen.text;
          statuses.push(line);
        }
        $status.val(statuses.join("\n"));
        return $command.val("");
      };
      return System;
    })();
    cmd_start = function(sys) {
      sys.player.play(sys);
      return "sys";
    };
    cmd_stop = function(sys) {
      sys.player.stop();
      return "sys";
    };
    cmd_mvol = function(sys, arg) {
      var vol;
      if (!isNaN(arg)) {
        vol = arg | 0;
        if (vol < 0) {
          vol = 0;
        } else if (255 < vol) {
          vol = 255;
        }
        sys.vol = vol / 255;
      }
      return "sys";
    };
    cmd_add = function(sys, arg) {
      var gen;
      gen = new ToneGenerator(sys.player, arg);
      if (gen.ready) {
        sys.gens.push(sys.selectedgen = gen);
      } else {
        return "ERROR";
      }
    };
    cmd_sel = function(sys, arg) {
      if ((i = sys.findIndex(arg)) != null) {
        sys.selectedgen = sys.gens[i];
      } else {
        return "NOT FOUND";
      }
    };
    cmd_del = function(sys, arg) {
      var _ref3;
      if ((i = sys.findIndex(arg)) != null) {
        if (sys.solo === sys.gens[i].id) {
          sys.solo = null;
        }
        sys.gens.splice(i, 1);
      } else if ((i = sys.findIndex((_ref3 = sys.selectedgen) != null ? _ref3.id : void 0)) != null) {
        if (sys.solo === sys.gens[i].id) {
          sys.solo = null;
        }
        sys.gens.splice(i, 1);
        if (sys.gens[i] != null) {
          sys.selectedgen = sys.gens[i];
        } else if (sys.gens[i - 1] != null) {
          sys.selectedgen = sys.gens[i - 1];
        } else {
          sys.selectedgen = null;
        }
      } else {
        return "NOT FOUND";
      }
    };
    cmd_mute = function(sys, arg) {
      if ((i = sys.findIndex(arg)) != null) {
        sys.gens[i].mute = !sys.gens[i].mute;
      } else if (sys.selectedgen) {
        sys.selectedgen.mute = !sys.selectedgen.mute;
      }
    };
    cmd_solo = function(sys, arg) {
      if ((i = sys.findIndex(arg)) != null) {
        if (sys.solo === sys.gens[i].id) {
          sys.solo = null;
        } else {
          sys.solo = sys.gens[i].id;
        }
      } else if (sys.selectedgen) {
        if (sys.solo === sys.selectedgen.id) {
          sys.solo = null;
        } else {
          sys.solo = sys.selectedgen.id;
        }
      }
    };
    cmd_set = function(sys, type, arg) {
      var _ref3;
      if (!((_ref3 = sys.selectedgen) != null ? _ref3.set(type, arg) : void 0)) {
        "INVALID PARAMETER";
      }
    };
    cmd_pitch = function(sys, arg) {
      var _ref3, _ref4;
      if (!isNaN(arg)) {
        if ((_ref3 = sys.selectedgen) != null) {
          _ref3.pitch = Math.pow(2, arg);
        }
      } else {
        if ((_ref4 = sys.selectedgen) != null) {
          _ref4.pitch = 0;
        }
      }
    };
    cmd_replace = function(sys, arg) {
      var _ref3;
      if (!((_ref3 = sys.selectedgen) != null ? _ref3.replace(arg) : void 0)) {
        return "ERROR";
      }
    };
    cmd_filter = function(sys, arg) {
      var _ref3;
      if ((_ref3 = sys.selectedgen) != null) {
        _ref3.filtertype(arg.toUpperCase());
      }
    };
    sys = new System();
    sys.command("start");
    return $command.val("t*(((t>>12)|(t>>8))&(63&(t>>4)))").focus().get(0).setSelectionRange(99, 99);
  });
}).call(this);
