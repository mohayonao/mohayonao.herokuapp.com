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
    
    (function(scene) { // Grid
        var lineMaterial, geometry, line, i;
        lineMaterial = new THREE.LineBasicMaterial({color: 0x666666, opacity:0.5});
		geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vertex( new THREE.Vector3(-2000, 0, 0)));
		geometry.vertices.push(new THREE.Vertex( new THREE.Vector3( 2000, 0, 0)));
		for (i = 0; i <= 20; i ++ ) {
			line = new THREE.Line(geometry, lineMaterial);
			line.position.z = (i * 200) - 2000;
			scene.add(line);
            
			line = new THREE.Line(geometry, lineMaterial);
			line.position.x = (i * 200) - 2000;
			line.rotation.y = 90 * Math.PI / 180;
			scene.add(line);
		}
    }(scene));
    
    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    renderer.setClearColorHex(0x000000, 1);
	container.appendChild(renderer.domElement);

    StaticMotionMan.prototype.createObject = (function() {
        var ovalProgram = function(context) {
			context.beginPath();
			context.arc(0, 0, 1, 0, PI2, true);
			context.closePath();
			context.stroke();
		};
        return function(options) {
            var o, size, color;
            var DATATABLE = MotionMan.DATATABLE;
            if (DATATABLE[options.name]) {
                size  = DATATABLE[options.name].size;
                color = DATATABLE[options.name].color;
            }
            if (typeof(size ) === "undefined") size  = 1;
            if (typeof(color) === "undefined") color = 0xffffff;
            o = new THREE.Particle(new THREE.ParticleCanvasMaterial({
			    color:color, program:ovalProgram
		    }));
            o.name = options.name;
            o.scale.x = o.scale.y = size;
            return o;
        };
    }());
    
    
    StaticMotionMan.prototype.init = function(color) {
        var objects, i, imax;
        
        objects = this.objects;
        for (i = 0, imax = objects.length; i < imax; i++) {
            objects[i].material.color = new THREE.Color(color);
        }
    };
    
    var N = new StaticMotionMan(scene);
    var nocchis = [];
    var COLORS = [
        0x660000, 0xff0000, 0xff9933, 0xffff33, 0x99ff33,
        0x66ff99, 0x33ffff, 0x0066ff, 0x0000ff, 0x000066
    ];

    var $msg = jQuery("#message");
    
    $msg.text("nocchi loading...");
    N.load("/data/spring-of-life-03.bvh", function() {
        var n, i, j;
        $msg.text("");
        
        for (i = 0; i < 10; i++) {
            for (j = 0; j < 10; j++) {
                if (i === 5 && j === 5) {
                    n = N;
                    n.timeStep = 3;
                    n.init(0xffffff);
                } else if (i === 3 && j === 7) {
                    n = N.clone(scene);
                    n.timeStep = 0.75;
                    n.init(0xffffff);
                } else {
                    n = N.clone(scene);
                    n.timeStep = 1;
                    n.init(COLORS[j]);
                }
                n.setPosition((i - 5) * 500, 0, (j - 5) * 500);
                nocchis.push(n);
            }
        }
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
    audio.load();
    
    var prevTime = 0;
    function animate() {
        var time, t, mx, my;
        var i, imax;
        time = (audio.currentTime || 0) * 1000;
        
        mx = (mouseX - (width /2)) * 5;
        my = (mouseY - (height/4)) * 2;
		camera.position.x += (mx - camera.position.x) * 0.05;
		camera.position.y += (my - camera.position.y) * 0.05;
        
        if (prevTime != time) {
            for (i = 0, imax = nocchis.length; i < imax; i++) {
                t = time * nocchis[i].timeStep;
                t = t - (i / 10) * -250;
                if (t < 0) t = 0;
                else while (t > 70500) t -= 70500;
                nocchis[i].update(t);
            }
            prevTime = time;
        }
        
		camera.lookAt(scene.position);
		renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
   	}
    animate();
};
