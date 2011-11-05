(function() {
  var pico;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  pico = window.pico = window.pico || {};
  (function(window, pico) {
    var BasePlayer, HTML5AudioPlayer, MozPlayer, NOP, TimerBasePlayer, WebkitPlayer;
    if (!(window.Float32Array != null)) {
      __bind(function() {
        console.warn("Float32Array are not defined, so use fake.");
        return window.Float32Array = window.Uint32Array = (function() {
          __extends(_Class, Array);
          function _Class(spec) {
            var i, _ref;
            if (typeof spec === "number") {
              spec |= 0;
              if (spec > 0) {
                this.length = spec;
                while (spec--) {
                  this[spec] = 0;
                }
              }
            } else if (typeof (spec != null ? spec.length : void 0) === "number") {
              this.length = spec.length;
              for (i = 0, _ref = spec.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
                this[i] = spec[i];
              }
            }
          }
          _Class.prototype.set = function(lis, index) {
            var i, j, _ref, _results;
            j = index || 0;
            _results = [];
            for (i = 0, _ref = lis.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(this[j] = lis[i]);
            }
            return _results;
          };
          return _Class;
        })();
      }, this)();
    }
    NOP = function() {
      return null;
    };
    BasePlayer = (function() {
      function BasePlayer(slotlength) {
        this.finished = true;
        this._cancelled = false;
        this._streamSlots = [];
        this._streamReadIndex = 0;
        this._streamPlayIndex = 0;
        this._streamReadTimerId = null;
        this._readHandler = __bind(function(index, stream) {
          return this._streamSlots[index].set(stream);
        }, this);
        this._generator = null;
        this._type = "";
        this._coreObject = null;
      }
      BasePlayer.prototype._initialize = function(spec) {
        var calcBits, channel, duration, samplerate, slice, _ref, _ref2;
        if ((_ref = spec.samplerate) == null) {
          spec.samplerate = 44100;
        }
        if ((_ref2 = spec.channel) == null) {
          spec.channel = 1;
        }
        duration = spec.duration;
        slice = spec.slice;
        this.SAMPLERATE = samplerate = spec.samplerate;
        this.CHANNEL = channel = spec.channel;
        calcBits = function(sec) {
          var bits, len, _ref3;
          _ref3 = [0, sec >> 1], bits = _ref3[0], len = _ref3[1];
          while (len > 0) {
            len >>= 1;
            bits += 1;
          }
          return bits;
        };
        this.STREAM_FULL_BITS = calcBits((duration * samplerate) / 1000);
        this.STREAM_FULL_SIZE = 1 << this.STREAM_FULL_BITS;
        this.STREAM_CELL_BITS = calcBits(this.STREAM_FULL_SIZE / slice);
        this.STREAM_CELL_SIZE = 1 << this.STREAM_CELL_BITS;
        this.STREAM_CELL_COUNT = this.STREAM_FULL_SIZE / this.STREAM_CELL_SIZE;
        this.NONE_STREAM_FULL_SIZE = new Float32Array(this.STREAM_FULL_SIZE);
        this.NONE_STREAM_FULL_SIZExC = new Float32Array(this.STREAM_FULL_SIZE * this.CHANNEL);
        this.PLAY_INTERVAL = (this.STREAM_FULL_SIZE / samplerate) * 1000;
        this._streamSlots[0] = new Float32Array(this.STREAM_FULL_SIZE * this.CHANNEL);
        return this._streamSlots[1] = new Float32Array(this.STREAM_FULL_SIZE * this.CHANNEL);
      };
      BasePlayer.prototype.isPlaying = function() {
        return !this.finished;
      };
      BasePlayer.prototype.play = function(generator) {
        if (this.finished) {
          if (generator) {
            this._generator = generator;
          }
          if (this._generator) {
            this.finished = false;
            this._cancelled = false;
            this._streamReadIndex = 0;
            this._streamPlayIndex = 0;
            if (!(this._streamReadTimerId != null)) {
              clearInterval(this._streamReadTimerId);
            }
            return this._streamReadTimerId = setInterval(__bind(function() {
              return this._readStream();
            }, this), this.PLAY_INTERVAL / 2);
          }
        }
      };
      BasePlayer.prototype.stop = function() {
        return this._cancelled = true;
      };
      BasePlayer.prototype.gettype = function() {
        return this._type;
      };
      BasePlayer.prototype.getcore = function() {
        return this._coreObject;
      };
      BasePlayer.prototype._readStream = function() {
        var index;
        if (this._streamReadIndex === this._streamPlayIndex) {
          index = this._streamReadIndex & 0x01;
          this._readHandler(index, this._generator.next());
          this._streamReadIndex += 1;
        }
        if (this._cancelled && this._streamReadTimerId) {
          clearInterval(this._streamReadTimerId);
          this._streamReadTimerId = null;
          return this.finished = true;
        }
      };
      return BasePlayer;
    })();
    WebkitPlayer = (function() {
      __extends(WebkitPlayer, BasePlayer);
      function WebkitPlayer(spec) {
        WebkitPlayer.__super__.constructor.call(this);
        this._context = new webkitAudioContext();
        spec.samplerate = this._context.sampleRate;
        this._initialize(spec);
        this._type = "WebkitPlayer";
        this._coreObject = this._context;
        this._node = this._context.createJavaScriptNode(this.STREAM_FULL_SIZE, 1, this.CHANNEL);
      }
      WebkitPlayer.prototype.play = function(generator) {
        var onaudioprocessDelegate;
        WebkitPlayer.__super__.play.call(this, generator);
        onaudioprocessDelegate = __bind(function(delegate) {
          return __bind(function(event) {
            var i;
            if (this._streamPlayIndex < this._streamReadIndex) {
              i = this._streamPlayIndex & 0x01;
              delegate(event, this._streamSlots[i]);
              return this._streamPlayIndex += 1;
            }
          }, this);
        }, this);
        switch (this.CHANNEL) {
          case 2:
            this._node.onaudioprocess = onaudioprocessDelegate(__bind(function(event, stream) {
              var dataL, dataR, i, j, _results;
              dataL = event.outputBuffer.getChannelData(0);
              dataR = event.outputBuffer.getChannelData(1);
              i = dataR.length;
              j = i * 2;
              _results = [];
              while (i--) {
                dataR[i] = stream[j];
                dataL[i] = stream[j + 1];
                _results.push(j -= 2);
              }
              return _results;
            }, this));
            break;
          default:
            this._node.onaudioprocess = onaudioprocessDelegate(__bind(function(event, stream) {
              var dataL, dataR, i, _results;
              dataL = event.outputBuffer.getChannelData(0);
              dataR = event.outputBuffer.getChannelData(1);
              i = dataR.length;
              _results = [];
              while (i--) {
                _results.push(dataR[i] = dataL[i] = stream[i]);
              }
              return _results;
            }, this));
        }
        return this._node.connect(this._context.destination);
      };
      WebkitPlayer.prototype.stop = function() {
        var _ref;
        WebkitPlayer.__super__.stop.call(this);
        return (_ref = this._node) != null ? _ref.disconnect() : void 0;
      };
      return WebkitPlayer;
    })();
    TimerBasePlayer = (function() {
      __extends(TimerBasePlayer, BasePlayer);
      function TimerBasePlayer(spec) {
        TimerBasePlayer.__super__.constructor.call(this);
        console.log("TimerBasePlayer");
        this._next = NOP;
        this._playHandler = NOP;
        this._playTimerId = null;
      }
      TimerBasePlayer.prototype.play = function(generator) {
        var audioprocess, waitprocess;
        TimerBasePlayer.__super__.play.call(this, generator);
        audioprocess = __bind(function() {
          return __bind(function() {
            var stream;
            if (this._streamPlayIndex < this._streamReadIndex) {
              stream = this._streamSlots[this._streamPlayIndex & 0x01];
              this._playHandler.call(this, stream);
              return this._streamPlayIndex += 1;
            } else if (this.finished) {
              return this.stop();
            }
          }, this);
        }, this)();
        waitprocess = __bind(function(audioprocess) {
          return __bind(function() {
            var stream;
            if (this._streamReadIndex === 1) {
              stream = this._streamSlots[this._streamPlayIndex & 0x01];
              this._playHandler.call(this, stream);
              this._streamPlayIndex += 1;
              return this._next = audioprocess;
            }
          }, this);
        }, this)(audioprocess);
        if (this._playTimerId != null) {
          clearInterval(this._playTimerId);
          this._playTimerId = null;
        }
        this._next = waitprocess;
        return this._playTimerId = setInterval(__bind(function() {
          return this._next();
        }, this), this.PLAY_INTERVAL);
      };
      TimerBasePlayer.prototype.stop = function() {
        TimerBasePlayer.__super__.stop.call(this);
        if (this._playTimerId != null) {
          clearInterval(this._playTimerId);
          return this._playTimerId = null;
        }
      };
      return TimerBasePlayer;
    })();
    MozPlayer = (function() {
      __extends(MozPlayer, TimerBasePlayer);
      function MozPlayer(spec) {
        var audio;
        MozPlayer.__super__.constructor.call(this);
        this._initialize(spec);
        this._type = "MozPlayer";
        audio = new Audio();
        audio.mozSetup(this.CHANNEL, this.SAMPLERATE);
        this._coreObject = audio;
        this._playHandler = __bind(function(audio) {
          return __bind(function(stream) {
            return audio.mozWriteAudio(stream);
          }, this);
        }, this)(audio);
      }
      return MozPlayer;
    })();
    HTML5AudioPlayer = (function() {
      __extends(HTML5AudioPlayer, TimerBasePlayer);
      function HTML5AudioPlayer(spec) {
        var i, _ref;
        HTML5AudioPlayer.__super__.constructor.call(this);
        this._initialize(spec);
        this._type = "HTML5AudioPlayer";
        for (i = 0, _ref = this._streamSlots.length; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
          this._streamSlots[i] = null;
        }
      }
      HTML5AudioPlayer.prototype._initialize = function(spec) {
        var channel, length, samplerate, samples, waveheader;
        HTML5AudioPlayer.__super__._initialize.call(this, spec);
        samplerate = this.SAMPLERATE;
        channel = this.CHANNEL;
        samples = this.STREAM_FULL_SIZE;
        waveheader = (function(samplerate, channel, samples) {
          var l1, l2, waveBytes;
          waveBytes = samples * channel * 2;
          l1 = waveBytes - 8;
          l2 = l1 - 36;
          return String.fromCharCode(0x52, 0x49, 0x46, 0x46, (l1 >> 0) & 0xFF, (l1 >> 8) & 0xFF, (l1 >> 16) & 0xFF, (l1 >> 24) & 0xFF, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, channel, 0x00, (samplerate >> 0) & 0xFF, (samplerate >> 8) & 0xFF, (samplerate >> 16) & 0xFF, (samplerate >> 24) & 0xFF, ((samplerate * channel * 2) >> 0) & 0xFF, ((samplerate * channel * 2) >> 8) & 0xFF, ((samplerate * channel * 2) >> 16) & 0xFF, ((samplerate * channel * 2) >> 24) & 0xFF, 2 * channel, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, (l2 >> 0) & 0xFF, (l2 >> 8) & 0xFF, (l2 >> 16) & 0xFF, (l2 >> 24) & 0xFF);
        })(samplerate, channel, samples);
        length = this.STREAM_FULL_SIZE * this.CHANNEL;
        this._readHandler = __bind(function(waveheader, length) {
          return __bind(function(index, stream) {
            var i, wave, y;
            wave = waveheader;
            for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
              y = (stream[i] * 32767.0) | 0;
              wave += String.fromCharCode(y & 0xFF, (y >> 8) & 0xFF);
            }
            return this._streamSlots[index] = new Audio("data:audio/wav;base64," + btoa(wave));
          }, this);
        }, this)(waveheader, length);
        return this._playHandler = function(audio) {
          return audio.play();
        };
      };
      return HTML5AudioPlayer;
    })();
    return pico.getplayer = function(spec) {
      var a, userAgent, x, _ref, _ref2, _ref3;
      if (spec == null) {
        spec = {};
      }
      if ((_ref = spec.duration) == null) {
        spec.duration = 50;
      }
      if ((_ref2 = spec.slice) == null) {
        spec.slice = 32;
      }
      if (spec.duration > 50) {
        spec.duration = 50;
      }
      if (typeof webkitAudioContext === "function" || typeof webkitAudioContext === "object") {
        return new WebkitPlayer(spec);
      } else if (typeof Audio === "function" || typeof Audio === "object") {
        a = new Audio();
        if ((typeof a.mozSetup === (_ref3 = typeof a.mozWriteAudio) && _ref3 === "function")) {
          return new MozPlayer(spec);
        } else {
          userAgent = navigator.userAgent;
          if (userAgent.indexOf("Opera") !== -1) {
            if (spec.duration < 400) {
              x = 400 / spec.duration;
              spec.duration *= x;
              spec.slice *= x;
            }
            return new HTML5AudioPlayer(spec);
          } else {
            return null;
          }
        }
      } else {
        return null;
      }
    };
  })(window, pico);
}).call(this);
