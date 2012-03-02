importScripts("/javascripts/DorilaSound.js");
var SAMPLERATE = 22050;

var doriland_voice = null;
addEventListener("message", function(e) {
    if (e.data.buffer) {
        doriland_voice = e.data;
    } else if (e.data.text) {
        postMessage({text:e.data.text});
        sendDorilaSound(e.data.text);
    }
}, false);

function sendDorilaSound(text) {
    var stream, wave, buffer, fd;
    var i, imax, y;
    var buffer = [];
    
    stream = getStream(text);
    wave = waveheader(SAMPLERATE, 2, stream.length/2);
    postMessage({wavheader:wave});
    
    for (i = 0, imax = stream.length; i < imax; i++) {
        y = (stream[i] * 32767.0) | 0;
        buffer.push( String.fromCharCode(y & 0xFF, (y >> 8) & 0xFF) );
        if (buffer.length === 2048) {
            postMessage({wavbody:buffer.join("")});
            buffer = [];
        }
    }
    if (buffer.length !== 0) {
        postMessage({wavbody:buffer.join("")});
        buffer = [];
    }
    postMessage("END");
    return wave;
}

function getStream(text) {
    var size = 16384;
    var driver = {SAMPLERATE:SAMPLERATE,
                  STREAM_FULL_SIZE:size,
                  NONE_STREAM_FULL_SIZExC:new Float32Array(size*2)};
    var sys;
    var s, result;
    var amp;
    var i, imax, j, jmax;
    
    sys = new DorilaSound(driver, doriland_voice);
    
    result = [];
    sys.init({text:text});
    sys.play();

    for (i = 0; i < 17; i++) {
        s = sys.next();
        for (j = 0; j < s.length; j++) {
            result.push(s[j]);
        }
        if (sys.finished) break;
        postMessage({progress:[i,28]});
    }
    
    if (! sys.finished) {
        amp  = 1.0;
        ampx = 1.0 / (size * 3);
        for (i = 0; i < 3; i++) {
            s = sys.next();
            for (j = 0; j < s.length; j += 2) {
                result.push(s[j]   * amp);
                result.push(s[j+1] * amp);
                amp -= ampx;
                if (amp < 0) amp = 0;
            }
            if (sys.finished) break;
            postMessage({progress:[i+25,28]});
        }
    }
    return new Float32Array(result);
}

function waveheader(samplerate, channel, samples) {
    var l1, l2, waveBytes;
    waveBytes = samples * channel * 2;
    l1 = waveBytes - 8;
    l2 = l1 - 36;
    return String.fromCharCode(
        0x52, 0x49, 0x46, 0x46, // 'RIFF'
        (l1 >>  0) & 0xFF,
        (l1 >>  8) & 0xFF,
        (l1 >> 16) & 0xFF,
        (l1 >> 24) & 0xFF,
        0x57, 0x41, 0x56, 0x45, // 'WAVE'
        0x66, 0x6D, 0x74, 0x20, // 'fmt '
        0x10, 0x00, 0x00, 0x00, // byte length
        0x01, 0x00,    // linear pcm
        channel, 0x00, // channel
        (samplerate >>  0) & 0xFF,
        (samplerate >>  8) & 0xFF,
        (samplerate >> 16) & 0xFF,
        (samplerate >> 24) & 0xFF,
        ((samplerate * channel * 2) >> 0) & 0xFF,
        ((samplerate * channel * 2) >> 8) & 0xFF,
        ((samplerate * channel * 2) >> 16) & 0xFF,
        ((samplerate * channel * 2) >> 24) & 0xFF,
        2 * channel, 0x00,      // block size
        0x10, 0x00,             // 16bit
        0x64, 0x61, 0x74, 0x61, // 'data'
        (l2 >>  0) & 0xFF,
        (l2 >>  8) & 0xFF,
        (l2 >> 16) & 0xFF,
        (l2 >> 24) & 0xFF);
};
