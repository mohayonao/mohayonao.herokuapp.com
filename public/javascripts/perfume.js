jQuery(function() {
    
    var requestAnimationFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function (f) {
            setTimeout(f, 1000/60)
        };
    
	var PI2 = Math.PI * 2;
    var X_AXIS = new THREE.Vector3(1, 0, 0);
    var Y_AXIS = new THREE.Vector3(0, 1, 0);
    var Z_AXIS = new THREE.Vector3(0, 0, 1);
    
    // add Flash-like functions
    THREE.Matrix4.prototype.appendRotation = function(deg, axis) {
        var degPIper360 = deg / 360 * Math.PI;
        var w = Math.cos(degPIper360);
        var x = Math.sin(degPIper360) * axis.x;
        var y = Math.sin(degPIper360) * axis.y;
        var z = Math.sin(degPIper360) * axis.z;
        
		var n11 = this.n11, n12 = this.n12, n13 = this.n13, n14 = this.n14,
		n21 = this.n21, n22 = this.n22, n23 = this.n23, n24 = this.n24,
		n31 = this.n31, n32 = this.n32, n33 = this.n33, n34 = this.n34,
		n41 = this.n41, n42 = this.n42, n43 = this.n43, n44 = this.n44;
        
        var m11 = (w * w + x * x - y * y - z * z),
        m21 = 2 * (y * x + w * z),
        m31 = 2 * (z * x - w * y),
        m41 = 0,
        m12 = 2 * (y * x - w * z),
        m22 = (w * w - x * x + y * y - z * z),
        m32 = 2 * (w * x + z * y),
        m42 = 0,
        m13 = 2 * (z * x + w * y),
        m23 = 2 * (z * y - w * x),
        m33 = (w * w - x * x - y * y + z * z),
        m43 = 0,
        m14 = 0,
        m24 = 0,
        m34 = 0,
        m44 = 1;
        
        this.n11 = m11 * n11 + m12 * n21 + m13 * n31 + m14 * n41;
        this.n21 = m21 * n11 + m22 * n21 + m23 * n31 + m24 * n41;
        this.n31 = m31 * n11 + m32 * n21 + m33 * n31 + m34 * n41;
        this.n41 = m41 * n11 + m42 * n21 + m43 * n31 + m44 * n41;
        this.n12 = m11 * n12 + m12 * n22 + m13 * n32 + m14 * n42;
        this.n22 = m21 * n12 + m22 * n22 + m23 * n32 + m24 * n42;
        this.n32 = m31 * n12 + m32 * n22 + m33 * n32 + m34 * n42;
        this.n42 = m41 * n12 + m42 * n22 + m43 * n32 + m44 * n42;
        this.n13 = m11 * n13 + m12 * n23 + m13 * n33 + m14 * n43;
        this.n23 = m21 * n13 + m22 * n23 + m23 * n33 + m24 * n43;
        this.n33 = m31 * n13 + m32 * n23 + m33 * n33 + m34 * n43;
        this.n43 = m41 * n13 + m42 * n23 + m43 * n33 + m44 * n43;
        this.n14 = m11 * n14 + m12 * n24 + m13 * n34 + m14 * n44;
        this.n24 = m21 * n14 + m22 * n24 + m23 * n34 + m24 * n44;
        this.n34 = m31 * n14 + m32 * n24 + m33 * n34 + m34 * n44;
        this.n44 = m41 * n14 + m42 * n24 + m43 * n34 + m44 * n44;
    };
    THREE.Matrix4.prototype.appendTranslation = function(x, y, z) {
        this.n14 += x;
        this.n24 += y;
        this.n34 += z;
    };
    
    var MotionMan = (function() {
        var MotionMan = function() {
            initialize.apply(this, arguments);
        }, $this = MotionMan.prototype;
        
        var initialize = function(target, path) {
            this.bvh     = null;
            this.circles = null;
            this.target  = target;            
            this.group   = new THREE.Object3D();
            this.target.add(this.group);
            load.call(this, path);
        };
        
        var load = function(path) {
            var self = this;
            jQuery.get(path, function(data) {
                var bvh = self.bvh = new Bvh(data);
                bvh.isLoop = true;
                createObjects.call(self, bvh.bones.length + 5);
            });
        };
        
        var DATATABLE = {
            "Hips"  : {size: 8, color:0x00ffff},
            "Chest" : {size: 4, color:0xffffff}, "Chest2": {size: 4, color:0xffffff},
            "Chest3": {size: 8, color:0x00ff00}, "Chest4": {size: 4, color:0xffffff},
            "Neck"  : {size: 4, color:0xffffff}, "Head"  : {size: 4, color:0xffffff},
            "*Head" : {size: 8, color:0xffff00},
            "RightCollar": {size: 4, color:0xffffff}, "RightShoulder": {size: 4, color:0xffffff},
            "RightElbow" : {size: 4, color:0xffffff}, "RightWrist"   : {size: 6, color:0xffffff},
            "*RightWrist": {size: 8, color:0xffff00},
            "LeftCollar" : {size: 4, color:0xffffff}, "LeftShoulder" : {size: 4, color:0xffffff},
            "LeftElbow"  : {size: 4, color:0xffffff}, "LeftWrist"    : {size: 6, color:0xffffff},
            "*LeftWrist" : {size: 8, color:0xffff00},
            "RightHip"   : {size: 4, color:0xffffff}, "RightKnee"    : {size: 4, color:0xffffff},
            "RightAnkle" : {size: 4, color:0xffffff}, "RightToe"     : {size: 6, color:0xffffff},
            "*RightToe"  : {size: 8, color:0xffff00},
            "LeftHip"    : {size: 4, color:0xffffff}, "LeftKnee"     : {size: 4, color:0xffffff},
            "LeftAnkle"  : {size: 4, color:0xffffff}, "LeftToe"      : {size: 6, color:0xffffff},
            "*LeftToe"   : {size: 8, color:0xffff00}
        };
        
        var createObjects = (function() {
            var ovalProgram = function(context) {
				context.beginPath();
				context.arc(0, 0, 1, 0, PI2, true);
				context.closePath();
				context.fill();
			};
            
            return function(num) {
                var circles, line, group;
                var bones, bone;
                var particle, ovalMaterial;
                var size, color;
                var i, imax;
                
                circles = this.circles = [];
                group   = this.group;
                
                bones = this.bvh.bones;
                for (i = 0, imax = bones.length; i < imax; i++) {
                    bone = bones[i];
                    
                    size  = DATATABLE[bone.name].size;
                    color = DATATABLE[bone.name].color;
                    
                    ovalMaterial = new THREE.ParticleCanvasMaterial({
			            color:color, program:ovalProgram
		            });
                    particle = new THREE.Particle(ovalMaterial);
					particle.position.x = bone.offsetX;
					particle.position.y = bone.offsetY;
					particle.position.z = bone.offsetZ;
                    
                    particle.scale.x = particle.scale.y = size;
                    
                    group.add(particle);
                    circles.push(particle);
                    
                    if (bone.isEnd) {
                        size  = DATATABLE["*" + bone.name].size;
                        color = DATATABLE["*" + bone.name].color;
                        
                        ovalMaterial = new THREE.ParticleCanvasMaterial({
			                color:color, program:ovalProgram
		                });
                        particle = new THREE.Particle(ovalMaterial);
					    particle.position.x = bone.endOffsetX;
					    particle.position.y = bone.endOffsetY;
					    particle.position.z = bone.endOffsetZ;
                        particle.scale.x = particle.scale.y = size;
                        group.add(particle);
                        circles.push(particle);
                    }
                }                
            };
        }());

        $this.update = function(time) {
            var bvh;
            var a, bones, bone, matrix;
            var position, circles, particle;
            var i, imax;
            var x;

            if ((bvh = this.bvh) === null) return;
            
            // frame of BVH
            x = time / (bvh.frameTime * 1000);
            bvh.gotoFrame(x);
            
            // calculate joint's position
            a = [];
            bones = bvh.bones;
            for (i = 0, imax = bones.length; i < imax; i++) {
                bone = bones[i];
                matrix = new THREE.Matrix4();
                calcBonePosition(bone, matrix);
                
                position = matrix.getPosition();
                a.push(position.x, position.y, -position.z);
                
                if (bone.isEnd) { // endSite
                    matrix.identity();
                    matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
                    calcBonePosition(bone, matrix);
                    position = matrix.getPosition();
                    a.push(position.x, position.y, -position.z);
                }
            }
            
            // re-position
            circles = this.circles;
            for (i = 0, imax = a.length/3; i < imax; i++) {
                particle = circles[i];
                particle.position.x = +a[i * 3 + 0];
                particle.position.y = +a[i * 3 + 1] * 2;
                particle.position.z = +a[i * 3 + 2] * 2 + 200;
            }
        };

        $this.setPosition = function(x, y, z) {
            this.group.position.x = x;
            this.group.position.y = y;
            this.group.position.z = z;
        };
        
        $this.setVisible = function(value) {
            this.group.visible = !!value;
        };
        
        var calcBonePosition = function(bone, matrix) {
            var v;
            // coordinate system in BVH is right-handed.
            while (bone) {
                // +Z -X -Y
                matrix.appendRotation(+bone.Zrotation, Z_AXIS);
                matrix.appendRotation(-bone.Xrotation, X_AXIS);
                matrix.appendRotation(-bone.Yrotation, Y_AXIS);
                
                matrix.appendTranslation(+(bone.Xposition + bone.offsetX),
                                         +(bone.Yposition + bone.offsetY),
                                         -(bone.Zposition + bone.offsetZ));
                
                bone = bone.parent;
            }
        };
        
        return MotionMan;
    }());
    
    
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
        
        var a = new MotionMan(scene, "/data/spring-of-life-01.bvh");
        var k = new MotionMan(scene, "/data/spring-of-life-01.bvh");
        var n = new MotionMan(scene, "/data/spring-of-life-01.bvh");
        a.setPosition(-200, 0,   0);
        k.setPosition(-200, 0, 345);
        n.setPosition( 400, 0,   0);
        
        a.setVisible(false);
        k.setVisible(false);
        n.setVisible(false);
        
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