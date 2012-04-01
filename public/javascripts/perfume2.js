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
        for (i = 0, imax = a.length/4; i < imax; i++) {
            o = objects[i];
            o.position.x = +a[i * 4 + 1];
            o.position.y = +a[i * 4 + 2] * 2;
            o.position.z = +a[i * 4 + 3] * 2 + 200;
            o.scale.x = o.scale.y = o.size * 6 * audioLevel;
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
    
    
    var main = function() {
        var audioContext, bufferLoader;
        audioContext = new webkitAudioContext();
        bufferLoader = new BufferLoader(
            audioContext,
            ["/audio/perfume.ogg"],
            function(bufferList) {
                var source = audioContext.createBufferSource();
                source.buffer = bufferList[0];
                source.loop = true;
                
                var node   = audioContext.createJavaScriptNode(4096, 1, 2);
                console.log(source, node);
                
                var sampleRate = audioContext.sampleRate;
                var nodeBufferSize = node.bufferSize;
                var totalTime = (source.buffer.length / sampleRate) * 1000;
                var dt = (nodeBufferSize / sampleRate) * 1000;
                console.log(time, dt, totalTime);
                
                var DEBUG = 0;
                node.onaudioprocess = function(e) {
                    var dataInL, dataInR, dataOutL, dataOutR, i;
                    
                    dataInL = e.inputBuffer.getChannelData(0);
                    dataInR = e.inputBuffer.getChannelData(1);
                    dataOutL = e.outputBuffer.getChannelData(0);
                    dataOutR = e.outputBuffer.getChannelData(1);
                    
                    time += dt;
                    if (totalTime < time) {
                        time -= totalTime;
                    }
                    
                    audioLevel = 0;
                    i = dataInL.length;
                    while (i--) {
                        dataOutL[i] = dataInL[i];
                        dataOutR[i] = dataInR[i];
                        audioLevel += Math.abs(dataInR[i]);
                    }
                    audioLevel /= dataInL.length;
                };
                
                source.connect(node);
                node.connect(audioContext.destination);

                
                console.log("noteOn");
                source.noteOn(0);
            });
        bufferLoader.load();
    };
    main();

};
