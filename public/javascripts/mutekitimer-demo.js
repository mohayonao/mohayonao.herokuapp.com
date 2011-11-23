window.onload = function() {
    prettyPrint();
    
    function MutekiTimer() {
        this.initialize.apply(this, arguments);
    }
    MutekiTimer.prototype = {
        initialize: function() {
            var url = (function() {
                var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder;
                var URL = window.URL || window.webkitURL;
                console.log("BlobBuilder", BlobBuilder);
                console.log("URL", URL);

                var MutekiTimerBlob;
                if (!BlobBuilder || !URL) return null;
                
                MutekiTimerBlob = new BlobBuilder();
                MutekiTimerBlob.append("var timerId = 0;");
                MutekiTimerBlob.append("this.onmessage = function(e) {");
                MutekiTimerBlob.append("  if (timerId !== 0) {");
                MutekiTimerBlob.append("    clearInterval(timerId);");
                MutekiTimerBlob.append("    timerId = 0;");
                MutekiTimerBlob.append("  }");
                MutekiTimerBlob.append("  if (e.data > 0) {");
                MutekiTimerBlob.append("    timerId = setInterval(function() {");
                MutekiTimerBlob.append("    postMessage(null);");
                MutekiTimerBlob.append("    }, e.data);");
                MutekiTimerBlob.append("  }");
                MutekiTimerBlob.append("};");
                console.log("CC");
                return URL.createObjectURL(MutekiTimerBlob.getBlob());
            }());
            console.log("URL", url);
            if (url) {
                this._timer = new Worker(url);
                console.log("???", this._timer);
                this.isMuteki = true;
            } else {
                this._timer = null;
                this.isMuteki = false;
            }
            this._timerId = 0;
        },
        setInterval: function(func, interval) {
            if (this._timer) {
                this._timer.onmessage = function(e) {
                    func();
                };
                this._timer.postMessage(interval);
            } else {
                if (this._timerId !== 0) {
                    clearInterval(this._timerId);
                }
                this._timerId = setInterval(function() {
                    func();
                }, interval);
            }
        },
        clearInterval: function() {
            if (this._timer) {
                this._timer.postMessage(0);
            } else {
                if (this._timerId !== 0) {
                    clearInterval(this._timerId);
                }
                this._timerId = 0;
            }
        }
    };
    
    function counter(elem) {
        var count = 0;
        elem = document.getElementById(elem);
        return function() {
            elem.innerHTML = count++;
        };
    }

    var counter1 = counter("counter1");
    var counter2 = counter("counter2");
    
    var muteki = new MutekiTimer();

    if (! muteki.isMuteki) {
        document.getElementById("not").style.display = "inline";
        document.getElementById("status").style.color = "red";
    }
    
    muteki.setInterval(counter1, 50);
    window.setInterval(counter2, 50);
};