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
    
    MotionMan.prototype.draw = function(a) {
        var children, o, i, imax;
        
        // re-position
        children = this.group.children;
        for (i = 0, imax = a.length/3; i < imax; i++) {
            o = children[i];
            o.position.x = +a[i * 3 + 0];
            o.position.y = +a[i * 3 + 1] * 2;
            o.position.z = +a[i * 3 + 2] * 2 + 200;
            o.scale.x = o.scale.y = o.size * 8 * audioLevel;
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
                
                $msg.text("");
            });
        });
    });
    
    
    var isMobile = ["iPhone", "iPad", "android"].some(function(x) {
        return window.navigator.userAgent.indexOf(x) !== -1;
    });
    
    
    var processor, audio;
    var time, audioLevel;
    time = audioLevel = 0;
    
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
        
        A.update(time);
        K.update(time);
        N.update(time);
        
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
            this.muted = false;
        };
        
        $this.process = function(stream) {
            var i, imax;
            audioLevel = 0;
            if (this.muted) {
                for (i = 0, imax = stream.length; i < imax; i++) {
                    audioLevel += Math.abs(stream[i]);
                    stream[i] = 0.0;
                }
            } else {
                for (i = 0, imax = stream.length; i < imax; i++) {
                    audioLevel += Math.abs(stream[i]);
                }
            }
            audioLevel /= stream.length;
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
                    processor  = new AudioProcessor();
                    
                    
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
                    processor = new AudioProcessor();
                    A.setVisible(true);
                    K.setVisible(true);
                    N.setVisible(true);
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
                    A.setVisible(true);
                    K.setVisible(true);
                    N.setVisible(true);
                    timerId = setInterval(function() {
                        time = (audio.currentTime || 0) * 1000;
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
            audioLevel = 0.25;
            audio.addEventListener("play", function() {
                A.setVisible(true);
                K.setVisible(true);
                N.setVisible(true);
                timerId = setInterval(function() {
                    time = (audio.currentTime || 0) * 1000;
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
