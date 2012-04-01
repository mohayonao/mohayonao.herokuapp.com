jQuery(function() {
    
    // main
    (function() {
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
        
        (function(scene) { // Grid
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
        
        var a = new MotionMan(scene);
        var k = new MotionMan(scene);
        var n = new MotionMan(scene);
        a.setPosition(-200, 0,   0);
        k.setPosition(-200, 0, 345);
        n.setPosition( 400, 0,   0);
        
        a.setVisible(false);
        k.setVisible(false);
        n.setVisible(false);
        
        a.load("/data/spring-of-life-01.bvh", function() {
            console.log("loaded aachan");
            k.load("/data/spring-of-life-02.bvh", function() {
                console.log("loaded kashiyuka");
                n.load("/data/spring-of-life-03.bvh", function() {
                    console.log("loaded nocchi");
                });
            });
        });
        
        var mouseX = -200 + (width /2);
        var mouseY =  300 + (height/4);
        document.addEventListener("mousemove", function(e) {
			mouseX = e.offsetX || e.layerX;
            mouseY = e.offsetY || e.layerY;
        }, false);
        
        var audio = new Audio("/audio/perfume.ogg");
        audio.addEventListener("loadeddata", function() {
            audio.loop = true;
            audio.play();
        }, false);
        audio.addEventListener("play", function() {
            a.setVisible(true);
            k.setVisible(true);
            n.setVisible(true);
        }, false);
        audio.load();
        
        var prevTime = 0;
        function animate() {
            var time, mx, my;
            time = (audio.currentTime || 0) * 1000;
            
            mx = (mouseX - (width /2)) * 5;
            my = (mouseY - (height/4)) * 2;
			camera.position.x += (mx - camera.position.x) * 0.05;
			camera.position.y += (my - camera.position.y) * 0.05;
            
            if (prevTime != time) {
                a.update(time);
                k.update(time);
                n.update(time);
                prevTime = time;
            }
            
			camera.lookAt(scene.position);
			renderer.render(scene, camera);
            
            requestAnimationFrame(animate);
   		}
        animate();
    }());
});
