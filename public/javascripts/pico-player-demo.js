$(function() {
    prettyPrint();
    
    var TABLE_SIZE = 1024;
    var sinetable = new Float32Array(TABLE_SIZE);
    for (var i = 0; i < TABLE_SIZE; i++) {
        sinetable[i] = Math.sin(2 * Math.PI * (i / TABLE_SIZE));
    }

    var ToneGenerator = function(player, wavelet, frequency) {
        this.wavelet = wavelet;
        this.frequency = frequency;
        this.phase = 0;
        this.phaseStep = TABLE_SIZE * frequency / player.SAMPLERATE;
        this.stream_full_size = player.STREAM_FULL_SIZE;
    };
    ToneGenerator.prototype.next = function() {
        var wavelet = this.wavelet;
        var phase = this.phase;
        var phaseStep = this.phaseStep;
        var table_size = TABLE_SIZE;

        var stream = new Float32Array(this.stream_full_size);
        for (var i = 0, imax = this.stream_full_size; i < imax; i++) {
            stream[i] = wavelet[(phase|0) % table_size] * 0.25;
            phase += phaseStep;
        }
        this.phase = phase;
        return stream;
    };

    $("#testtone").click(function() {
        // 440Hzのサイン波を再生して 2秒後に止まる
        var player = pico.getplayer();
        var gen = new ToneGenerator(player, sinetable, 440);
        
        player.play(gen);
        setTimeout(function() { player.stop(); }, 2000);
    });
});
