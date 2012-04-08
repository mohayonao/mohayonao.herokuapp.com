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
    
    var A = new MotionMan({name:"aachan"});
    var K = new MotionMan({name:"kashiyuka"});
    var N = new MotionMan({name:"nocchi"});
    var Perfume  = [A, K, N];
    
    var $msg = jQuery("#message");
    
    $msg.text("aachan loading...");
    A.load("/data/spring-of-life-01.bvh", {unmoving:true}, function(msg) {
        if (msg !== "buildend") return;
        A.init(0xff9933);
        scene.add(A);
        
        $msg.text("kashiyuka loading...");
        K.load("/data/spring-of-life-02.bvh", {unmoving:true}, function(msg) {
            if (msg !== "buildend") return;
            K.init(0x3399ff);
            scene.add(K);
            K.position.x = 200;
            
            $msg.text("nocchi loading...");
            N.load("/data/spring-of-life-03.bvh", {unmoving:true}, function(msg) {
                if (msg !== "buildend") return;
                N.init(0x33ff99);
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
        
        A.info = new InformationView(A, {left:width*(1/3)+25, top:height/2+50});
        K.info = new InformationView(K, {left:width*(0/3)+25, top:height/2+50});
        N.info = new InformationView(N, {left:width*(2/3)+25, top:height/2+50});
        
        animate();
    };


    var InformationView = (function() {
        var InformationView = function() {
            initialize.apply(this, arguments);
        }, $this = InformationView.prototype;
        
        var initialize = function(src, options) {
            options = options || {};
            this.src  = src;
            this.name = options.name = src.name;
            initView.call(this, options);
        };

        var formatFrame = function(o) {
            return o.frameBegin + ".." + o.frameEnd + "; " + o.frameStep;
        };

        var formatPositionXYZ = function(o) {
            return (o.x|0) + ", " + (o.y|0) + ", " + (o.z|0);
        };
        
        var formatRotationXYZ = function(o) {
            var x, y, z;
            x = o.x / Math.PI * 180;
            y = o.y / Math.PI * 180;
            z = o.z / Math.PI * 180;
            return (x|0) + ", " + (y|0) + ", " + (z|0);
        };

        var formatScaleXYZ = function(o) {
            return (o.x) + ", " + (o.y) + ", " + (o.z);
        };
        
        var initView = function(options) {
            var div;
            div = jQuery(document.createElement("pre"))
                .css("position", "absolute")
                .css("left", options.left + "px").css("top", options.top + "px")
                .css("color", "white").css("font-family", "'Courier New',monospace")
                .text(options.name)
                .appendTo(document.body);
            this.frame = jQuery(document.createElement("div"))
                .text("frame   : " + formatFrame(this.src))
                .appendTo(div);
            this.position = jQuery(document.createElement("div"))
                .text("position: " + formatPositionXYZ(this.src.position))
                .appendTo(div);
            this.rotation = jQuery(document.createElement("div"))
                .text("rotation: " + formatRotationXYZ(this.src.rotation))
                .appendTo(div);
            this.rotation = jQuery(document.createElement("div"))
                .text("rotation: " + formatRotationXYZ(this.src.rotation))
                .appendTo(div);
            this.scale = jQuery(document.createElement("div"))
                .text("scale   : " + formatScaleXYZ(this.src.scale))
                .appendTo(div);
        };

        $this.update = function() {
            this.frame   .text("frame   : " + formatFrame(this.src));
            this.position.text("position: " + formatPositionXYZ(this.src.position));
            this.rotation.text("rotation: " + formatRotationXYZ(this.src.rotation));
            this.scale   .text("scale   : " + formatScaleXYZ   (this.src.scale));
            
        };
        
        return InformationView;
    }());
    
    
    
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
        var m, v, items, xyz = {x:src.x, y:src.y, z:src.z}, duration = 500;
        if ((m = cmd.indexOf(";")) !== -1) {
            duration = cmd.substr(m+1)|0;
            cmd = cmd.substr(0, m);
        }
        
        if ((m = /^([xyz])\s*([-+]?[.0-9]*)$/.exec(cmd)) !== null) {
            v = +m[2]; if (isNaN(v)) v = 0;
            xyz[m[1]] = func ? func(v) : v;
        } else {
            items = cmd.split(",");
            if (items.length === 1) {
                v = +items[0]; if (isNaN(v)) v = 0;
                xyz.x = xyz.y = xyz.z = func ? func(v) : v;
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
                    var to = fetchXYZ(q.scale, items);
                    console.log(to);
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
    var infoUpdateTime = begin;
    var animate = function() {
        var now, time, frame;
        var i, q;

        now  = +new Date();
        time = now - begin;
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


        time = now - infoUpdateTime;
        if (time > 500) {
            A.info.update();
            K.info.update();
            N.info.update();
            infoUpdateTime = now;
        }
        
		TWEEN.update();
        
		renderer.render(scene, camera);
        requestAnimationFrame(animate);
   	};
};