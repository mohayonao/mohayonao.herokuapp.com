window.onload = function() {
    "use strict";
    
    var container, width, height;
    var camera, scene, renderer;
    container = document.createElement("div");
    document.body.appendChild(container);
    
    width  = window.innerWidth;
    height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.set(0, 50, -300);
    camera.lookAt({x:0, y:75, z:0});
    
    scene = new THREE.Scene();
	scene.add(camera);
    
    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    renderer.setClearColorHex(0x0000ff, 0.2);
	container.appendChild(renderer.domElement);
    
    MotionMan.prototype.init = function() {
        var children, o, i, imax;
        var geometry, line;
        
        children = this.children;
        for (i = 0, imax = children.length; i < imax; i++) {
            o = children[i];
            o.material.color = new THREE.Color(0xffffff);
            
            if (o.$parent) {
                geometry = new THREE.Geometry();
                geometry.vertices.push(new THREE.Vertex(o.position));
                geometry.vertices.push(new THREE.Vertex(o.$parent.position));
                line = new THREE.Line(geometry, new THREE.LineBasicMaterial(
                    {color:0xffffff, linewidth:5, opacity:0.5}));
                
                this.add(line);
            }
        }
    };

    var frameBegin, frameEnd, frameStep;
    frameBegin =    0;
    frameEnd   = 2820;
    frameStep  =    1;
    
    var K = new MotionMan(scene);
    
    scene.add(K);
    
    K.load("/data/spring-of-life-02.bvh", {unmoving:true}, function() {
        K.init();
        animate();
    });
    K.position.set(0, 170, 0);
    
    var animate = (function() {
        var begin, time, tx;
        begin = +new Date();
        time  = 0;
        return function animate() {
            var frame;
            
            time = +new Date() - begin;
            time %= K.totalTime;
            
            if (frameBegin === frameEnd) {
                frame = frameBegin;
            } else {
                frame = (time / K.frameTime * frameStep)|0;
                frame %= (frameEnd - frameBegin);
                frame += frameBegin;
            }
            time = frame * K.frameTime;
            
            K.update(time);
		    renderer.render(scene, camera);
            
            requestAnimationFrame(animate);
   	    };
    }());
    
    
    //// UI
    (function() {
        var t1;
        t1 = jQuery(document.createElement("input"))
            .val(frameBegin + ".." + frameEnd)
            .css("position", "absolute").css("top", "10px").css("left", "10px")
            .on("change", function(e) {
                var m, v1, v2, v3;
                m = /^(\d+)(?:\.\.(\d+)(?:;([.0-9]+))?)?$/.exec(t1.val().trim());
                if (m) {
                    t1.css("color", "black");
                    v1 = m[1]|0;
                    v2 = (m[2]|0) || v1;
                    v3 = +m[3];
                    if (isNaN(v3)) v3 = 1;
                    else if (v3 < 0) v3 = 0;
                    if (v2 < v1) v2 = v1;
                    frameBegin = v1;
                    frameEnd   = v2;
                    frameStep = v3;
                } else {
                    t1.css("color", "red");
                }
            }).appendTo(document.body);
    }());
};