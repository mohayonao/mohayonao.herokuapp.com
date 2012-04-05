(function(global) {
    "use strict";
    
    var extend = function(Klass, SuperKlass) {
        var F = function() {};
        F.prototype = SuperKlass.prototype;
        Klass.prototype = new F();
        return Klass.prototype;
    };
    
    
    var MotionMan = (function() {
        var MotionMan = function() {
            this.initialize.apply(this, arguments);
        }, $this = MotionMan.prototype;
        
        MotionMan.DATATABLE = {
            "Hips"  : {size: 8, color:0x00ffff},
            "Chest" : {size: 4, color:0xffffff},
            "Chest2": {size: 4, color:0xffffff},
            "Chest3": {size: 4, color:0xffffff},
            "Chest4": {size: 8, color:0x00ff00},
            "Neck"  : {size: 4, color:0xffffff},
            "Head"  : {size: 4, color:0xffffff},
            "*Head" : {size: 8, color:0xffff00},
            "RightCollar"  : {size: 4, color:0xffffff},
            "RightShoulder": {size: 4, color:0xffffff},
            "RightElbow"   : {size: 4, color:0xffffff},
            "RightWrist"   : {size: 6, color:0xffffff},
            "*RightWrist"  : {size: 8, color:0xffff00},
            "LeftCollar"   : {size: 4, color:0xffffff},
            "LeftShoulder" : {size: 4, color:0xffffff},
            "LeftElbow"    : {size: 4, color:0xffffff},
            "LeftWrist"    : {size: 6, color:0xffffff},
            "*LeftWrist"   : {size: 8, color:0xffff00},
            "RightHip"     : {size: 4, color:0xffffff},
            "RightKnee"    : {size: 4, color:0xffffff},
            "RightAnkle"   : {size: 4, color:0xffffff},
            "RightToe"     : {size: 6, color:0xffffff},
            "*RightToe"    : {size: 8, color:0xffff00},
            "LeftHip"      : {size: 4, color:0xffffff},
            "LeftKnee"     : {size: 4, color:0xffffff},
            "LeftAnkle"    : {size: 4, color:0xffffff},
            "LeftToe"      : {size: 6, color:0xffffff},
            "*LeftToe"     : {size: 8, color:0xffff00}
        };
        
        $this.initialize = function(target) {
            this.bvh     = null;
            this.objectm = null;
            this.target  = target;
            this.group   = new THREE.Object3D();
            this.target.add(this.group);
        };
        
        $this.load = function(url, callback) {
            var self = this;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onload = function() {
                self.bvh = new Bvh(xhr.response);
                self.bvh.isLoop = true;
                self.compile();
                if (callback) callback();
            };
            xhr.send();
        };
        
        
        $this.clone = function(target) {
            var newOne;
            if (this.bvh) {
                target = target || this.target;
                newOne = new MotionMan(target);
                newOne.bvh = this.bvh.clone();
                newOne.bvh.isLoop = true;
                newOne.compile();
            } else {
                newOne = null;
            }
            return newOne;
        };
        
        
        $this.createObject = (function() {
            var ovalProgram = function(context) {
			    context.beginPath();
			    context.arc(0, 0, 1, 0, PI2, true);
			    context.closePath();
			    context.fill();
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
        
        
        $this.compile = function() {
            var objectm, group;
            var geometry;
            var bones, bone, o;
            var i, imax;
            
            objectm = this.objectm = {};
            group   = this.group;
            
            geometry = (this.getGeometry) ? this.getGeometry() : null;
            
            bones = this.bvh.bones;
            for (i = 0, imax = bones.length; i < imax; i++) {
                bone = bones[i];
                
                o = this.createObject({geometry:geometry, name:bone.name});
                objectm[o.name] = o;
			    o.position.x = bone.offsetX;
			    o.position.y = bone.offsetY;
			    o.position.z = bone.offsetZ;
                
                group.add(o);
                
                if (bone.isEnd) {
                    o = this.createObject({geometry:geometry, name:"*"+bone.name});
                    objectm[o.name] = o;
				    o.position.x = bone.endOffsetX;
				    o.position.y = bone.endOffsetY;
				    o.position.z = bone.endOffsetZ;
                    group.add(o);
                }
            }
        };
        
        
        $this.draw = function(a) {
            var children, o, i, imax;
            
            children = this.group.children;
            for (i = 0, imax = a.length/3; i < imax; i++) {
                o = children[i];
                o.position.x = +a[i * 3 + 0];
                o.position.y = +a[i * 3 + 1] * 2;
                o.position.z = +a[i * 3 + 2] * 2 + 200;
            }
        };
        
        $this.update = function(time) {
            var bvh, a;
            var bones, bone, matrix, position;
            var matrix, position;
            var i, imax;
            
            if ((bvh = this.bvh) === null) return;
            
            // frame of BVH
            bvh.gotoFrame(time / (bvh.frameTime * 1000));
            
            // calculate joint's position
            a = [];
            bones = bvh.bones;
            for (i = 0, imax = bones.length; i < imax; i++) {
                bone = bones[i];
                matrix = new THREE.Matrix4();
                this.calcBonePosition(bone, matrix);
                
                position = matrix.getPosition();
                a.push(position.x, position.y, -position.z);
                
                if (bone.isEnd) {
                    matrix.identity();
                    matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
                    this.calcBonePosition(bone, matrix);
                    position = matrix.getPosition();
                    a.push(position.x, position.y, -position.z);
                }
            }
            
            this.draw(a);
        };
        
        $this.setPosition = function(x, y, z) {
            this.group.position.x = x;
            this.group.position.y = y;
            this.group.position.z = z;
        };
        
        $this.setVisible = function(value) {
            this.group.visible = !!value;
        };
        
        $this.calcBonePosition = function(bone, matrix) {
            while (bone) {
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
    global.MotionMan = MotionMan;
    
    
    var StaticMotionMan = (function() {
        var StaticMotionMan = function() {
            this.initialize.apply(this, arguments);
        }, $this = extend(StaticMotionMan, MotionMan);
        
        
        $this.initialize = function(target) {
            MotionMan.prototype.initialize.call(this, target);
            this.numFrames = 0;
            this.frameTime = 0;
            this.frames = [];
            this.isLoop = false;
        };
        
        
        $this.clone = function(target) {
            var newOne, children, o, i, imax;
            var objectm, group;
            target = target || this.target;
            newOne = new StaticMotionMan(target);
            
            children = this.group.children;
            objectm  = {};
            group    = newOne.group;
            for (i = 0, imax = children.length; i < imax; i++) {
                o = newOne.createObject({name:children[i].name});
                objectm[o.name] = o;
                o.position.x = children[i].position.x;
                o.position.y = children[i].position.y;
                o.position.z = children[i].position.z;
                group.add(o);
            }
            newOne.objectm = objectm;
            newOne.numFrames = this.numFrames;
            newOne.frameTime = this.frameTime;
            newOne.frames = this.frames;
            newOne.isLoop = this.isLoop;
            return newOne;
        };

        $this.compile = function() {
            MotionMan.prototype.compile.call(this);
            
            var bvh, bones, bone;
            var a, frame, frames;
            var matrix, position;
            var i, imax, j, jmax;
            
            bvh    = this.bvh;
            frames = this.frames = [];
            for (i = 0, imax = bvh.numFrames; i < imax; i++) {
                bvh.gotoFrame(i);
                
                a = [];
                bones = bvh.bones;
                for (j = 0, jmax = bones.length; j < jmax; j++) {
                    bone = bones[j];
                    matrix = new THREE.Matrix4();
                    this.calcBonePosition(bone, matrix);
                    
                    position = matrix.getPosition();
                    a.push(position.x, position.y, -position.z);
                    
                    if (bone.isEnd) {
                        matrix.identity();
                        matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
                        this.calcBonePosition(bone, matrix);
                        position = matrix.getPosition();
                        a.push(position.x, position.y, -position.z);
                    }
                }
                frames.push(a);
            }
            
            this.numFrames = this.bvh.numFrames;        
            this.frameTime = this.bvh.frameTime;
            this.isLoop = this.bvh.isLoop;
            
            this.bvh = null;
        };
        
        
        $this.update = function(time) {
            var numFrames, frame;
            var bvh, a;
            var bones, bone, matrix, position;
            var i, imax;
            
            frame = (time / (this.frameTime * 1000))|0;
            numFrames = this.numFrames;
            if (!this.isLoop) {
                if (frame >= numFrames) frame = numFrames - 1;
            } else {
                while (frame >= numFrames) frame -= numFrames;
            }
            a = this.frames[frame];
            this.draw(a);
        };
        
        return StaticMotionMan;
    }());
    global.StaticMotionMan = StaticMotionMan;
    
    
}(this));
