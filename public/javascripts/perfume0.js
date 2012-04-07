window.onload = function() {
    "use strict";
    
    var container, width, height;
    var camera, scene, renderer;
    container = document.createElement("div");
    document.body.appendChild(container);
    
    width  = window.innerWidth;
    height = window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.x =    0;
    camera.position.y =   50;
    camera.position.z = -300;
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
        
        children = this.group.children;
        for (i = 0, imax = children.length; i < imax; i++) {
            o = children[i];
            o.material.color = new THREE.Color(0xffffff);
            
            if (o.$parent) {
                geometry = new THREE.Geometry();
                geometry.vertices.push(new THREE.Vertex(o.position));
                geometry.vertices.push(new THREE.Vertex(o.$parent.position));
                line = new THREE.Line(geometry, new THREE.LineBasicMaterial(
                    {color:0xffffff, linewidth:5, opacity:0.5}));
                
                this.group.add(line);
            }
        }
    };
    
    
    var K = new StaticMotionMan(scene);
    K.load("/data/spring-of-life-02.bvh", {unmoving:true}, function() {
        K.init();
    });
    K.setPosition(0, 170, 0);
    
    var animate = (function() {
        var begin, time, tx;
        begin = +new Date();
        time  = 0;
        return function animate() {
            time = +new Date() - begin;
            time %= K.totalTime;
            
            K.update(time);
		    renderer.render(scene, camera);
            
            requestAnimationFrame(animate);
   	    };
    }());
    animate();
};