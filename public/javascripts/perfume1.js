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
    
    
    var A = new MotionMan(scene);
    var K = new MotionMan(scene);
    var N = new MotionMan(scene);
    A.setPosition(-300, 0, -200);
    K.setPosition(-200, 0,  245);
    N.setPosition( 400, 0, -200);

    var bvh_url;
    var $msg = jQuery("#message");
    
    $msg.text("aachan loading...");
    bvh_url = isMobile ? "/data/spring-of-life-01.min.bvh" : "/data/spring-of-life-01.bvh";
    A.load(bvh_url, function() {
        
        $msg.text("kashiyuka loading...");
        bvh_url = isMobile ? "/data/spring-of-life-02.min.bvh" : "/data/spring-of-life-02.bvh";
        K.load(bvh_url, function() {
            
            $msg.text("nocchi loading...");
            bvh_url = isMobile ? "/data/spring-of-life-03.min.bvh" : "/data/spring-of-life-03.bvh";
            N.load(bvh_url, function() {
                
                $msg.text("");
            });
        });
    });
    
    
    var isMobile = ["iPhone", "iPad", "android"].some(function(x) {
        return window.navigator.userAgent.indexOf(x) !== -1;
    });
    
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
    
    var audio = (function() {
        var audio;
        if (isMobile) {
            audio = document.createElement("audio");
            jQuery(audio).attr("src", "/audio/perfume.mp3")
                .attr("controls", true)
                .css("position", "absolute").css("top", "10px").css("right", "0px")
                .appendTo(jQuery(document.body));
            return audio;
        } else if ((new Audio("")).canPlayType("audio/ogg")) {
            return new Audio("/audio/perfume.ogg");
        } else {
            return new Audio("/audio/perfume.mp3");
        }
    }());
    
    
    A.setVisible(false);
    K.setVisible(false);
    N.setVisible(false);
    audio.addEventListener("loadeddata", function() {
        audio.loop = true;
        audio.play();
    }, false);
    audio.addEventListener("play", function() {
        A.setVisible(true);
        K.setVisible(true);
        N.setVisible(true);
        if (isMobile) jQuery("#footer").fadeOut("slow");
    }, false);
    audio.addEventListener("pause", function() {
        if (isMobile) jQuery("#footer").fadeIn("fast");
    }, false);
    
    if (!isMobile) {
        audio.load();
        (function() {
            var a = document.createElement("a");
            jQuery(a).text("MUTE")
                .css("position", "absolute").css("top", "10px").css("right", "10px")
                .css("color", "gray").css("font-size", "0.8em")
                .click(function() {
                    audio.muted = !audio.muted;
                    jQuery(this).css("color", audio.muted ? "lime" : "gray");
                }).appendTo(document.body);
        }());
    }
    
    var animate = (function() {
        var prevTime = 0;
        return function animate() {
            var time, mx, my;
            time = (audio.currentTime || 0) * 1000;
            
            mx = (mouseX - (width /2)) * 5;
            my = (mouseY - (height/4)) * 2;
		    camera.position.x += (mx - camera.position.x) * 0.05;
		    camera.position.y += (my - camera.position.y) * 0.05;
            
            if (prevTime != time) {
                A.update(time);
                K.update(time);
                N.update(time);
                prevTime = time;
            }
            
		    camera.lookAt(scene.position);
		    renderer.render(scene, camera);
            
            requestAnimationFrame(animate);
   	    };
    }());
    animate();
};
