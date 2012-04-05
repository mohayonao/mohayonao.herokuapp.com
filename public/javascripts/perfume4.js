window.onload = function() {
    "use strict";
    
    var container, width, height;
    var camera, scene, renderer;
    container = document.createElement("div");
    document.body.appendChild(container);

    width  = window.innerWidth;
    height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.x = -1000;
    camera.position.y =   600;
    camera.position.z =  -700;
    
    scene = new THREE.Scene();
	scene.add(camera);
    
    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    renderer.setClearColorHex(0x000000, 1);
	container.appendChild(renderer.domElement);
    
    // Grid
    (function(scene) {
        var lineMaterial, geometry, line, i;
        lineMaterial = new THREE.LineBasicMaterial({color: 0x666666, opacity:0.5});
		geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vertex( new THREE.Vector3(-1000, 0, 0)));
		geometry.vertices.push(new THREE.Vertex( new THREE.Vector3( 1000, 0, 0)));
		for (i = 0; i <= 20; i ++ ) {
			line = new THREE.Line(geometry, lineMaterial);
			line.position.z = (i * 100) - 1000;
			scene.add(line);
            
			line = new THREE.Line(geometry, lineMaterial);
			line.position.x = (i * 100) - 1000;
			line.rotation.y = 90 * Math.PI / 180;
			scene.add(line);
		}
    }(scene));

    
    MotionMan.prototype.init = function(color) {
        var children, i, imax;
        
        children = this.group.children;
        for (i = 0, imax = children.length; i < imax; i++) {
            children[i].size = children[i].scale.x;
            children[i].material.color = new THREE.Color(color);
        }
    };
    
    MotionMan.prototype.getGeometry = function() {
        return new THREE.CubeGeometry(5, 5, 10);
    };
    
    MotionMan.prototype.createObject = function(options) {
        var o, size, color;
        var DATATABLE = MotionMan.DATATABLE;
        if (DATATABLE[options.name]) {
            size  = DATATABLE[options.name].size;
            color = DATATABLE[options.name].color;
        }
        if (typeof(size ) === "undefined") size  = 1;
        if (typeof(color) === "undefined") color = 0xffffff;
        
        var geometry = options.geometry;
        o = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
			color:color, opacity: 0.6
		}));
        o.name = options.name;
        o.scale.x = o.scale.y = o.scale.z = size;
        return o;
    };
    
    MotionMan.prototype.draw = function(a) {
        var children, o, i, imax;
        
        // re-position
        children = this.group.children;
        for (i = 0, imax = a.length/3; i < imax; i++) {
            o = children[i];
            o.position.x = +a[i * 3 + 0];
            o.position.y = +a[i * 3 + 1] * 2;
            o.position.z = +a[i * 3 + 2] * 2 + 200;
            
            o.rotation.x = rx;
            o.rotation.y = ry;
            o.rotation.z = rz;
        }
    };
    
    
    var A = new MotionMan(scene);
    var K = new MotionMan(scene);
    var N = new MotionMan(scene);
    A.setPosition(-300, 0, -200);
    K.setPosition(-200, 0,  245);
    N.setPosition( 400, 0, -200);

    var $msg = jQuery("#message");
    $msg.text("aachan loading...");
    A.load("/data/spring-of-life-01.bvh", function() {
        A.init(0xff3333);
        
        $msg.text("kashiyuka loading...");
        K.load("/data/spring-of-life-02.bvh", function() {
            K.init(0x339933);
            
            $msg.text("nocchi loading...");
            N.load("/data/spring-of-life-03.bvh", function() {
                N.init(0x6666ff);
                
                if (! isMobile) $msg.text("SPC:glitch, [j,k]:efx");
            });
        });
    });
    
    
    var isMobile = ["iPhone", "iPad", "android"].some(function(x) {
        return window.navigator.userAgent.indexOf(x) !== -1;
    });
    
    
    var processor, audio;
    var time1, time2;
    var rx, ry, rz, RX, RY, RZ;
    time1 = time2 = 0;
    rx = ry = rz = RX = RY = 0;
    RZ = 0.05;
    
    var mouseX = -200 + (width /2);
    var mouseY =  300 + (height/4);
    if (isMobile) {
        document.addEventListener("touchstart", function(e) {
            if (e.touches.length == 1) {
			    mouseX = e.touches[0].pageX;
			    mouseY = e.touches[0].pageY;
            }
        }, false);
        document.addEventListener("touchmove", function(e) {
            if (e.touches.length == 1) {
                e.preventDefault();
			    mouseX = e.touches[0].pageX;
			    mouseY = e.touches[0].pageY;
            }
        }, false);
    } else {
        document.addEventListener("mousemove", function(e) {
		    mouseX = e.offsetX || e.layerX;
            mouseY = e.offsetY || e.layerY;
        }, false);

        (function() {
            var freqTable = [0, 0.5, 1, 2, 3, 4];
            var freqIndex = 3;
            document.addEventListener("keydown", function(e) {
                switch (e.keyCode) {
                case 32:
                    processor.glitchmode = 1;
                    break;
                case 74:
                    freqIndex -= 1;
                    if (freqIndex < 0) freqIndex = 0;
                    processor.setFrequency(freqTable[freqIndex]);
                    break;
                case 75:
                    freqIndex += 1;
                    if (freqTable.length <= freqIndex) freqIndex = freqTable.length - 1;
                    processor.setFrequency(freqTable[freqIndex]);
                    break;
                }
            }, false);
        }());
    }
    
    A.setVisible(false);
    K.setVisible(false);
    N.setVisible(false);

    if (!isMobile) {
        (function() {
            var a = document.createElement("a");
            jQuery(a).text("MUTE")
                .css("position", "absolute").css("top", "10px").css("right", "10px")
                .css("color", "gray").css("font-size", "0.8em")
                .click(function() {
                    if (processor) {
                        processor.muted = !processor.muted;
                        jQuery(this).css("color", processor.muted ? "lime" : "gray");
                    } else if (audio) {
                        audio.muted = !audio.muted;
                        jQuery(this).css("color", audio.muted ? "lime" : "gray");
                    }
                }).appendTo(document.body);
        }());
    }
    
    
    function animate() {
        var mx, my;
        
        mx = (mouseX - (width /2)) * 5;
        my = (mouseY - (height/4)) * 2;
		camera.position.x += (mx - camera.position.x) * 0.05;
		camera.position.y += (my - camera.position.y) * 0.05;
        
        A.update(time1);
        K.update(time1);
        N.update(time1);
        
		camera.lookAt(scene.position);
		renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
   	}
    animate();
    
    
    var AudioProcessor = (function() {
        var AudioProcessor = function() {
            initialize.apply(this, arguments);
        }, $this = AudioProcessor.prototype;

        var sinetable = (function() {
            var list, i;
            list = new Float32Array(1024);
            for (i = 0; i < 1024; i++) {
                list[i] = Math.sin(Math.PI * 2 * (i / 1024));
            }
            return list;
        }());
        
        var initialize = function(options) {
            this.samplerate = options.samplerate;
            this.buffer = new Float32Array(this.samplerate * 2);
            
            this.muted = false;
            this.glitchmode = 0;
            
            this.recIndex = this.samplerate >> 2;
            this.plyIndex = 0;
            
            this.phase = 0;
            this.phaseStep = 1024 * 2 / this.samplerate;
            
            this.savedtime = 0;
        };
        
        $this.setFrequency = function(value) {
            this.phaseStep = 1024 * value / this.samplerate;
        };
        
        $this.process = function(stream) {
            var buffer, recIndex, plyIndex;
            var phase, phaseStep, glitchbuffer;
            var idx, x, i, imax;
            
            buffer   = this.buffer;
            recIndex = this.recIndex;
            for (i = 0, imax = stream.length; i < imax; i++) {
                buffer[recIndex] = stream[i];
                recIndex += 1;
                if (recIndex >= buffer.length) recIndex = 0;
            }
            
            phase     = this.phase;
            phaseStep = this.phaseStep;
            plyIndex  = this.plyIndex;
            for (i = 0, imax = stream.length; i < imax; i++) {
                idx = plyIndex + sinetable[(phase|0) % 1024] * 128;
                x   = buffer[idx|0] || 0.0;
                stream[i] = (buffer[plyIndex] * 0.5) + (x * 0.5);
                plyIndex += 1;
                if (plyIndex >= buffer.length) plyIndex = 0;
                
                phase += phaseStep;
            }
            
            // glitch
            if (this.glitchmode === 0 && Math.random() < 0.010) {
                this.glitchmode = 1;
            }
            if (this.glitchmode === 1) {
                this.glitchmode = 2;
                this.glitchbuffer = [];
                this.glitchbufferLength = ((Math.random() * 10)|0) + 1;
                this.savedtime = time1;
                RY = 5;
            }
            if (this.glitchmode === 2) {
                this.glitchbuffer.push(new Float32Array(stream));
                if (this.glitchbuffer.length === this.glitchbufferLength) {
                    this.glitchmode  = 3;
                    this.glitchindex = 0;
                    this.glitchindexMax = ((Math.random() * 12)|0) + 2;
                    RY = 0;
                }
            }
            
            if (this.glitchmode === 3) {
                glitchbuffer = this.glitchbuffer[this.glitchindex % this.glitchbufferLength];
                for (i = 0, imax = stream.length; i < imax; i++) {
                    stream[i] = glitchbuffer[i];
                }
                this.glitchindex += 1;
                if (this.glitchindex === this.glitchindexMax) {
                    this.glitchmode = 4;
                    this.glitchindex = (((Math.random() * 12)|0) * 4) + 10;
                    rx = ( Math.random() * 360 ) * Math.PI / 180;
                }
                time1 = this.savedtime;
            }
            
            if (this.glitchmode === 4) {
                this.glitchindex -= 1;
                if (this.glitchindex === 0) {
                    this.glitchmode = 0;
                    time1 = time2;
                }
            }
            
            rx += RX;
            ry += RY;
            rz += RZ;

            if (this.muted) {
                for (i = 0, imax = stream.length; i < imax; i++) {
                    stream[i] = 0.0;
                }
            }
            
            this.phase    = phase;
            this.recIndex = recIndex;
            this.plyIndex = plyIndex;
        };
        
        return AudioProcessor;
    }());
    
    
    var main;
    if (window.webkitAudioContext) {
        // Google Chrome
        main = function() {
            var audioContext, xhr;
            audioContext = new webkitAudioContext();
            xhr = new XMLHttpRequest();
            xhr.open("GET", "/audio/perfume.ogg", true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function() {
                audioContext.decodeAudioData(xhr.response, function(buffer) {
                    var source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.loop = true;
                    
                    var node = audioContext.createJavaScriptNode(1024, 1, 1);
                    var stream = new Float32Array(node.bufferSize);
                    
                    var samplerate = audioContext.sampleRate;
                    var totaltime  = (source.buffer.length / samplerate) * 1000
                    var dt         = (node.bufferSize / samplerate) * 1000;
                    processor  = new AudioProcessor({samplerate:samplerate});
                    
                    node.onaudioprocess = function(e) {
                        var dataInL, dataInR, dataOutL, dataOutR, i;
                        
                        time1 += dt;
                        time2 += dt;
                        if (totaltime < time1) {
                            time1 -= totaltime;
                        }
                        if (totaltime < time2) {
                            time2 -= totaltime;
                        }
                        
                        dataInL = e.inputBuffer.getChannelData(0);
                        dataInR = e.inputBuffer.getChannelData(1);
                        
                        i = dataInL.length;
                        while (i--) {
                            stream[i] = dataInL[i];
                        }
                        
                        processor.process(stream);
                        
                        dataOutL = e.outputBuffer.getChannelData(0);
                        dataOutR = e.outputBuffer.getChannelData(1);
                        i = dataOutL.length;
                        while (i--) {
                            dataOutL[i] = dataOutR[i] = stream[i];
                        }
                    };
                    
                    A.setVisible(true);
                    K.setVisible(true);
                    N.setVisible(true);
                    
                    source.connect(node);
                    node.connect(audioContext.destination);
                    source.noteOn(0); 
                });
            };
            xhr.send();
        };
    } else if (!isMobile) {
        audio = new Audio("/audio/perfume.ogg");
        audio.loop = true;
        if (audio.mozSetup) {
            // Mozilla FireFox
            main = function() {
                var output = new Audio();
                var stream = new Float32Array(1024);
                
                audio.addEventListener("loadedmetadata", function(e) {
                    audio.volume = 0;
                    output.mozSetup(audio.mozChannels, audio.mozSampleRate);
                    processor = new AudioProcessor({samplerate:audio.mozSampleRate});
                    A.setVisible(true);
                    K.setVisible(true);
                    N.setVisible(true);
                    audio.play();
                }, false);
                audio.addEventListener("MozAudioAvailable", function(e) {
                    var samples, i, imax;
                    time1 = time2 = (audio.currentTime || 0) * 1000;
                    samples = e.frameBuffer;
                    for (i = samples.length; i--; ) {
                        stream[i] = samples[i];
                    }
                    processor.process(stream);
                    output.mozWriteAudio(stream);
                }, false);
                audio.load();
            };
        } else {
            // Others
            main = function() {
                var timeId;
                audio.addEventListener("loadeddata", function(e) {
                    timerId = setInterval(function() {
                        time = time2 = (audio.currentTime || 0) * 1000;
                    }, 100);
                    audio.play();
                }, false);
                audio.addEventListener("pause", function() {
                    clearInterval(timerId);
                }, false);
            };
        }
        audio.load();
    } else {
        audio = (function() {
            var timerId;
            audio = document.createElement("audio");
            jQuery(audio).attr("src", "/audio/perfume.mp3")
                .attr("controls", true)
                .css("position", "absolute").css("top", "10px").css("right", "0px")
                .appendTo(jQuery(document.body));
            audio.addEventListener("play", function() {
                A.setVisible(true);
                K.setVisible(true);
                N.setVisible(true);
                timerId = setInterval(function() {
                    time1 = time2 = (audio.currentTime || 0) * 1000;
                }, 100);
                if (isMobile) jQuery("#footer").fadeOut("slow");
            }, false);
            audio.addEventListener("pause", function() {
                clearInterval(timerId);
                if (isMobile) jQuery("#footer").fadeIn("fast");
            }, false);
            return audio;
        }());
    }
    main();
};
