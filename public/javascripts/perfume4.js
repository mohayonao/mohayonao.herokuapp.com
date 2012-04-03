window.onload = function() {

    var container, width, height;
    var camera, scene, renderer;
    container = document.createElement("div");
    document.body.appendChild(container);

    width  = window.innerWidth;
    height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.x = -1000;
    camera.position.y =   600;
    camera.position.z =  -600;
    
    scene = new THREE.Scene();
	scene.add(camera);

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
    
    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    renderer.setClearColorHex(0x000000, 1);
	container.appendChild(renderer.domElement);

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
    
    MotionMan.prototype.init = function(color) {
        var objects, i, imax;
        
        objects = this.objects;
        for (i = 0, imax = objects.length; i < imax; i++) {
            objects[i].size = objects[i].scale.x;
            objects[i].material.color = new THREE.Color(color);
        }
    };
    
    MotionMan.prototype.draw = function(a) {
        var objects, o, i, imax;
        
        // re-position
        objects = this.objects;
        for (i = 0, imax = a.length/4; i < imax; i++) {
            o = objects[i];
            o.position.x = +a[i * 4 + 1];
            o.position.y = +a[i * 4 + 2] * 2;
            o.position.z = +a[i * 4 + 3] * 2 + 200;
            
            o.rotation.x = rx;
            o.rotation.y = ry;
            o.rotation.z = rz;
        }
    };
    
    
    var a = new MotionMan(scene);
    var k = new MotionMan(scene);
    var n = new MotionMan(scene);
    a.setPosition(-200, 0,   0);
    k.setPosition(-200, 0, 345);
    n.setPosition( 400, 0,   0);
    
    a.load("/data/spring-of-life-01.bvh", function() {
        console.log("loaded aachan");
        a.init(0xff3333);
        
        k.load("/data/spring-of-life-02.bvh", function() {
            k.init(0x339933);
            console.log("loaded kashiyuka");
            
            n.load("/data/spring-of-life-03.bvh", function() {
                n.init(0x6666ff);
                console.log("loaded nocchi");
            });
        });
    });
    
    var time, audioLevel;
    var rx, ry, rz, RX, RY, RZ;
    time = audioLevel = 0;
    rx = ry = rz = 0;
    RX = RY = 0;
    RZ = 0.05;
    
    var mouseX = -200 + (width /2);
    var mouseY =  300 + (height/4);
    document.addEventListener("mousemove", function(e) {
		mouseX = e.offsetX || e.layerX;
        mouseY = e.offsetY || e.layerY;
    }, false);
    
    function animate() {
        mx = (mouseX - (width /2)) * 5;
        my = (mouseY - (height/4)) * 2;
		camera.position.x += (mx - camera.position.x) * 0.05;
		camera.position.y += (my - camera.position.y) * 0.05;
        
        a.update(time);
        k.update(time);
        n.update(time);
        
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

            this.glitchmode = 0;
            
            this.recIndex = this.samplerate >> 2;
            this.plyIndex = 0;
            
            this.phase = 0;
            this.phaseStep = 1024 * 2 / this.samplerate;
            
            this.savedtime = 0;
        };
        
        $this.process = function(stream) {
            var buffer, recIndex, plyIndex;
            var phase, phaseStep, glitchbuffer;
            var idx, x, r, i, imax;
            
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
            if (this.glitchmode === 0) {
                r = Math.random();
                if (r < 0.025) {
                    this.glitchmode = 1;
                    this.glitchbuffer = [];
                    this.glitchbufferLength = ((Math.random() * 10)|0) + 1;
                    this.savedtime = time;
                    RY = 5;
                }
            }
            if (this.glitchmode === 1) {
                this.glitchbuffer.push(new Float32Array(stream));
                if (this.glitchbuffer.length === this.glitchbufferLength) {
                    this.glitchmode  = 2;
                    this.glitchindex = 0;
                    this.glitchindexMax = ((Math.random() * 12)|0) + 2;
                    RY = 0;
                }
            }
            
            if (this.glitchmode === 2) {
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
                time = this.savedtime;
            }
            
            if (this.glitchmode === 4) {
                this.glitchindex -= 1;
                if (this.glitchindex === 0) {
                    this.glitchmode = 0;
                }
            }
            
            rx += RX;
            ry += RY;
            rz += RZ;
            
            this.phase    = phase;
            this.recIndex = recIndex;
            this.plyIndex = plyIndex;
        };
        
        return AudioProcessor;
    }());
    
    
    var main, audio;
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
                    var processor  = new AudioProcessor({samplerate:samplerate});
                    
                    node.onaudioprocess = function(e) {
                        var dataInL, dataInR, dataOutL, dataOutR, i;
                        
                        time += dt;
                        if (totaltime < time) {
                            time -= totaltime;
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
                    
                    source.connect(node);
                    node.connect(audioContext.destination);
                    
                    console.log("on!!", source, node);
                    source.noteOn(0);
                });
            };
            xhr.send();
        };
    } else {
        audio = new Audio("/audio/perfume.ogg");
        audio.loop = true;
        if (audio.mozSetup) {
            // Mozilla FireFox
            main = function() {
                var output = new Audio();
                var stream = new Float32Array(1024);
                var processor;
                
                audio.addEventListener("loadedmetadata", function(e) {
                    audio.volume = 0;
                    output.mozSetup(audio.mozChannels, audio.mozSampleRate);
                    processor = new AudioProcessor({samplerate:audio.mozSampleRate});
                    audio.play();
                }, false);
                audio.addEventListener("MozAudioAvailable", function(e) {
                    var samples, i, imax;
                    time = (audio.currentTime || 0) * 1000;
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
                audioLevel = 0.25;
                audio.addEventListener("loadeddata", function(e) {
                    timerId = setInterval(function() {
                        time = (audio.currentTime || 0) * 1000;
                    }, 100);
                    audio.play();
                }, false);
            };
        }
        audio.load();
    }
    main();
};
