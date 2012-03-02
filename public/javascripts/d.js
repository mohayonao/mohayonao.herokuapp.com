$(function() {
    var player = pico.getplayer({channel:2});
    var url = "./audio/doriland.ogg";
    
    // firefox
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
                callback({buffer:buffer,
                          samplerate:audio.mozSampleRate,
                          channels:audio.mozChannels});
            }, false);
        };
    }
    
    // Opera
    if (player.PLAYER_TYPE === "DynamicWavPlayer") {
        player.load = function(url, callback) {
            $.get("./audio/doriland.wav.txt", function(res) {
                var binary, b0, b1, bb, x;
                var buffer;
                var i, imax;
                binary = atob(res);
                buffer = new Float32Array(binary.length/2);
                for (i = 0, imax = buffer.length; i < imax; i++) {
                    b0 = binary.charCodeAt(i * 2);
                    b1 = binary.charCodeAt(i * 2 + 1);
                    bb = (b1 << 8) + b0;
                    x = (bb & 0x8000) ? -((bb^0xFFFF)+1) : bb;
                    buffer[i] = (x / 65535) * 4.0;
                }
                callback({buffer:buffer, samplerate:22050, channels:1});
            });
        };
    };
    
    
    var autoplay = false;
    player.load(url, function(result) {
        var soundsystem = new DorilaSound(player, result);
        if (result != null) {
            $("#play").click(function() {
                var text = $("#text").val().trim();
                soundsystem.init({text:text});
                soundsystem.play();
                player.play(soundsystem);
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
        text = text.replace(/{{AT}}/g, "@");
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
        text = text.replace(/@/g, "{{AT}}");
        lis = [
            "http://twitter.com/share?lang=ja",
            "text=" + utf.URLencode(text),
            "url=" + utf.URLencode(encodeURI(baseurl+"?"+text))
        ];
        
        url = lis.join('&');
        window.open(url, "intent","width="+h+",height="+i+",left="+b+",top="+c);
    });
});
