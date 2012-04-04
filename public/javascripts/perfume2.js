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
    camera.position.z =  -700;
    
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
        for (i = 0, imax = a.length/3; i < imax; i++) {
            o = objects[i];
            o.position.x = +a[i * 3 + 0];
            o.position.y = +a[i * 3 + 1] * 2;
            o.position.z = +a[i * 3 + 2] * 2 + 200;
            o.scale.x = o.scale.y = o.size * 6 * audioLevel;
        }
    };
    
    var a = new MotionMan(scene);
    var k = new MotionMan(scene);
    var n = new MotionMan(scene);
    a.setPosition(-300, 0, -200);
    k.setPosition(-200, 0,  245);
    n.setPosition( 400, 0, -200);
    
    var $msg = jQuery("#message");
    $msg.text("aachan loading...");
    a.load("/data/spring-of-life-01.bvh", function() {
        $msg.text("kashiyuka loading...");
        a.init(0xff3333);
        k.load("/data/spring-of-life-02.bvh", function() {
            k.init(0x339933);
            $msg.text("nocchi loading...");
            n.load("/data/spring-of-life-03.bvh", function() {
                n.init(0x6666ff);
                $msg.text("");
            });
        });
    });
    
    var time, audioLevel;
    time = audioLevel = 0;
    
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
        
        var initialize = function(options) {
            
        };
        
        $this.process = function(stream) {
            var i, imax;
            audioLevel = 0;
            for (i = 0, imax = stream.length; i < imax; i++) {
                audioLevel += Math.abs(stream[i]);
            }
            audioLevel /= stream.length;
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
                    var processor  = new AudioProcessor();
                    var isStart    = false;
                    
                    node.onaudioprocess = function(e) {
                        var dataInL, dataInR, dataOutL, dataOutR, i;
                        isStart = true;

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
                    source.noteOn(0);
                    
                    var timerId = setInterval(function() {
                        if (isStart) {
                            clearInterval(timerId);
                        } else {
                            console.log("timerId!!", timerId);
                            source.connect(node);
                            node.connect(audioContext.destination);
                            source.noteOn(0);
                        }
                    }, 1000);
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
                    processor = new AudioProcessor();
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
