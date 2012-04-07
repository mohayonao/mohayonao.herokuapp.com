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
    
    MotionMan.prototype.init = function(color) {
        var children, o, i, imax;
        var geometry, line;
        
        this.position.set(0, 170, 0);
        
        children = this.children;
        for (i = 0, imax = children.length; i < imax; i++) {
            o = children[i];
            o.material.color = new THREE.Color(color);
            
            if (o.$parent) {
                geometry = new THREE.Geometry();
                geometry.vertices.push(new THREE.Vertex(o.position));
                geometry.vertices.push(new THREE.Vertex(o.$parent.position));
                line = new THREE.Line(geometry, new THREE.LineBasicMaterial(
                    {color:color, linewidth:5, opacity:0.5}));
                
                this.add(line);
            }
        }
        
        this.frameBegin = 0;
        this.frameEnd   = 2820;
        this.frameStep  = 1;
        this.muted = false;
    };
    
    var A = new MotionMan();
    var K = new MotionMan();
    var N = new MotionMan();
    var Perfume  = [A, K, N];
    
    var $msg = jQuery("#message");
    
    $msg.text("aachan loading...");
    A.load("/data/spring-of-life-01.bvh", {unmoving:true}, function() {
        A.init(0xff9933);
        A.name = "aachan";
        scene.add(A);
        
        $msg.text("kashiyuka loading...");
        K.load("/data/spring-of-life-02.bvh", {unmoving:true}, function() {
            K.init(0x3399ff);
            K.name = "kashiyuka";
            scene.add(K);
            K.position.x = 200;
            
            $msg.text("nocchi loading...");
            N.load("/data/spring-of-life-03.bvh", {unmoving:true}, function() {
                N.init(0x33ff99);
                N.name = "nocchi";
                N.position.x = -200;
                scene.add(N);
                
                initUI();
            });
        });
    });
    
    
    var initUI = function() {
        var t;
        $msg.remove();
        t = jQuery(document.createElement("input"))
            .css("position", "absolute").css("top", "0px").css("left", "0px")
            .css("font-size", "2em").css("font-weight", "bold")
            .css("border", "solid 0px").attr("placeholder", "command")
            .width("100%")
            .on("change", function(e) {
                var cmd = t.val().trim();
                if (doCommand(cmd)) {
                    t.css("color", "black");
                    t.val("");
                    console.log(cmd);
                } else {
                    t.css("color", "red");
                }
            }).appendTo(document.body);
        animate();
    };
    
    
    var doCommand = function(cmd) {
        var m, func;
        if (cmd === "help") {
            // TODO: show command list
            return true;
        } else if ((m = /^(?:([aknc]|aachan|kashiyuka|nocchi|cam|camera)\s+)?(.+)$/.exec(cmd)) !== null) {
            if ((m[1]||"")[0] === "c") {
                func = functionSelectorForCamera(m[2]);
                if (func) return func() || true; 
            } else {
                func = functionSelectorForPerfume(m[2]);
                if (func) {
                    return ({a:[A],k:[K],n:[N]}[(m[1]||"")[0]] || [A,K,N]).forEach(function(q) {
                        func(q);
                    }) || true;
                }
            }
        }
        return false;
    };
    
    var fetchXYZ = function(src, cmd, func) {
        var m, items, xyz = {x:src.x, y:src.y, z:src.z}, duration = 500;
        if ((m = cmd.indexOf(";")) !== -1) {
            duration = cmd.substr(m+1)|0;
            cmd = cmd.substr(0, m);
        }
        
        if ((m = /^([xyz])\s*([-+]?\d*)$/.exec(cmd)) !== null) {
            xyz[m[1]] = func ? func(m[2]|0) : m[2]|0;
        } else {
            items = cmd.split(",");
            if (items.length === 1) {
                xyz.x = xyz.y = xyz.z = func ? func(items[0]||0) : items[0]||0;
            } else if (items.length === 3) {
                if (func) {
                    xyz.x = func(items[0]||0);
                    xyz.y = func(items[1]||0);
                    xyz.z = func(items[2]||0);
                } else {
                    xyz.x = items[0]||0;
                    xyz.y = items[1]||0;
                    xyz.z = items[2]||0;
                }
            }
        }
        return {xyz:xyz, duration:duration};
    };
    
    
    var functionSelectorForPerfume = function(cmd) {
        var m, xyz, items;
        
        if ((m = /^(\d+)(?:\.\.(\d+)(?:;([.0-9]+))?)?$/.exec(cmd)) !== null) {
            items = [m[1]|0, (m[2]|0)||m[1]|0, +m[3] ];
            if (isNaN(items[2])) items[2] = 1;
            else if (items[2] < 0) items[2] = 0;
            if (items[1] < items[0]) items[1] = items[0];
            
            return function(q) {
                q.frameBegin = items[0];
                q.frameEnd   = items[1];
                q.frameStep  = items[2];
            };
        } else {
            items = cmd.split(/\s+/);
            if (items[0] === "pos" || items[0] === "position") {
                items = items.slice(1).join(" ");
                return function(q) {
                    var to = fetchXYZ(q.position, items);
                    new TWEEN.Tween(q.position)
                        .to(to.xyz, to.duration)
                        .easing(TWEEN.Easing.Cubic.EaseOut)
                        .start();
                };
            } else if (items[0] === "rot" || items[0] === "rotation") {
                items = items.slice(1).join(" ");
                return function(q) {
                    var to = fetchXYZ(q.rotation, items, function(x) {
                        return (x|0) / 180 * Math.PI;
                    });
                    new TWEEN.Tween(q.rotation)
                        .to(to.xyz, to.duration)
                        .easing(TWEEN.Easing.Cubic.EaseOut)
                        .start();
                };
            } else if (items[0] === "scale") {
                items = items.slice(1).join(" ");
                return function(q) {
                    var to = fetchXYZ(q.position, items);
                    new TWEEN.Tween(q.scale)
                        .to(to.xyz, to.duration)
                        .easing(TWEEN.Easing.Cubic.EaseOut)
                        .start();
                };
            }
        }
    };
    
    var functionSelectorForCamera = function(cmd) {
        var items = cmd.split(/\s+/);
        if (items[0] === "pos" || items[0] === "position") {
            items = items.slice(1).join(" ");
            return function() {
                var to = fetchXYZ(camera.position, items);
                console.log("camera", camera.position);
                new TWEEN.Tween(camera.position)
                    .to(to.xyz, to.duration)
                    .easing(TWEEN.Easing.Cubic.EaseOut)
                    .start();
            };
        }
    };
    
    
    var begin = +new Date();
    var animate = function() {
        var time, frame;
        var i, q;
        
        time = +new Date() - begin;
        time %= A.totalTime;
        
        for (i = 0; i < 3; i++) {
            q = Perfume[i];
            
            if (q.frameBegin === q.frameEnd) {
                frame = q.frameBegin;
            } else {
                frame = (time / q.frameTime * q.frameStep)|0;
                frame %= (q.frameEnd - q.frameBegin);
                frame += q.frameBegin;
            }
            frame *= q.frameTime;
            q.update(frame);
        }
        
		TWEEN.update();
        
		renderer.render(scene, camera);
        requestAnimationFrame(animate);
   	};
};