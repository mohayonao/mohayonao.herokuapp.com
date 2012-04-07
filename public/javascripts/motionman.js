(function(global) {
    "use strict";
    
    var calcBonePosition = function(bone, matrix, unmoving) {
        while (bone) {
            matrix.appendRotation(+bone.Zrotation, THREE.Z_AXIS);
            matrix.appendRotation(-bone.Xrotation, THREE.X_AXIS);
            matrix.appendRotation(-bone.Yrotation, THREE.Y_AXIS);
            
            if (unmoving) {
                matrix.appendTranslation(+(bone.offsetX),
                                         +(bone.offsetY),
                                         -(bone.offsetZ));
            } else {
                matrix.appendTranslation(+(bone.Xposition + bone.offsetX),
                                         +(bone.Yposition + bone.offsetY),
                                         -(bone.Zposition + bone.offsetZ));
            }
            bone = bone.parent;
        }
    };
    
    if (typeof(window) !== "undefined") {
        // in MainThread
        (function(window) {
            var extend = function(Klass, SuperKlass) {
                var F = function() {};
                F.prototype = SuperKlass.prototype;
                Klass.prototype = new F();
                return Klass.prototype;
            };
            
            var MotionMan = (function() {
                var MotionMan = function() {
                    initialize.apply(this, arguments);
                }, $this = extend(MotionMan, THREE.Object3D);
                
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
                
                var initialize = function() {
                    THREE.Object3D.call(this);
                    
                    this.bvh     = null;
                    this.objectm = null;
                    this.prevFrameIndex  = -1;
                    this.isUnmoving = false;
                };
                
                $this.clone = function() {
                    var newOne;
                    if (this.bvh) {
                        newOne = new MotionMan();
                        newOne.bvh = this.bvh.clone();
                        newOne.bvh.isLoop = true;
                        newOne.isUnmoving = isUnmoving;
                        newOne.build();
                    } else {
                        newOne = null;
                    }
                    return newOne;
                };
                
                $this.load = function() {
                    var self = this;
                    var url, options, callback, xhr;
                    var i, imax;
                    for (i = 0, imax = arguments.length; i < imax; i++) {
                        switch (typeof(arguments[i])) {
                        case "string"  : url      = arguments[i]; break;
                        case "function": callback = arguments[i]; break;
                        case "object"  : options  = arguments[i]; break;
                        }
                    }
                    options = options || {};
                    if (options.unmoving !== undefined) {
                        this.isUnmoving = options.unmoving;
                    }
                    
                    if (url) {
                        xhr = new XMLHttpRequest();
                        xhr.open("GET", url, true);
                        xhr.onload = function() {
                            self.bvh = new Bvh(xhr.response, options);
                            self.bvh.isLoop = true;
                            self.build();
                            if (callback) callback();
                        };
                        xhr.send();
                    }
                };
                
                $this.build = function() {
                    var objectm, geometry;
                    var objectTree;
                    var bones, bone;
                    var name, o, i, imax;
                    
                    objectTree = {};
                    objectm  = this.objectm = {};
                    geometry = (this.getGeometry) ? this.getGeometry() : null;
                    
                    bones = this.bvh.bones;
                    for (i = 0, imax = bones.length; i < imax; i++) {
                        bone = bones[i];
                        
                        name = bone.name;
                        o = this.createObject({geometry:geometry, name:name});
                        objectm[o.name] = o;
			            o.position.x = bone.offsetX;
			            o.position.y = bone.offsetY;
			            o.position.z = bone.offsetZ;
                        o.$parent    = null;
                        o.$children  = [];
                        this.add(o);
                        
                        objectTree[name] = bone.children.map(function(x) {
                            return x.name;
                        });
                        
                        if (bone.isEnd) {
                            name = "*" + bone.name;
                            o = this.createObject({geometry:geometry, name:name});
                            objectm[o.name] = o;
				            o.position.x = bone.endOffsetX;
				            o.position.y = bone.endOffsetY;
				            o.position.z = bone.endOffsetZ;
                            this.add(o);
                            
                            objectTree[bone.name].push(name);
                            objectTree[name] = [];
                        }
                    }
                    
                    for (i = 0, imax = bones.length; i < imax; i++) {
                        name = bones[i].name;
                        o = objectm[name];
                        objectTree[name].forEach(function(x) {
                            objectm[x].$parent = o;
                            o.$children.push(objectm[x]);
                        });
                    }
                    
                    this.numFrames = this.bvh.numFrames;
                    this.frameTime = (this.bvh.frameTime * 1000)|0;
                    this.totalTime = this.numFrames * this.frameTime;
                };
                
                $this.createObject = (function() {
                    var PI2 = Math.PI * 2;
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
                        o.scale.x = o.scale.y = o.scale.z = size;
                        return o;
                    };
                }());
                
                $this.update = function(time) {
                    var bvh, a;
                    var frameIndex;
                    var bones, bone, matrix, position;
                    var matrix, position;
                    var unmoving;
                    var i, imax, j;
                    
                    if ((bvh = this.bvh) === null) return;
                    
                    // frame of BVH
                    frameIndex = (time / this.frameTime)|0;
                    if (this.prevFrameIndex === frameIndex) return;
                    
                    bvh.gotoFrame(frameIndex);
                    this.prevFrameIndex = frameIndex;
                    
                    // calculate joint's position
                    a = new Float32Array(this.children.length * 3);
                    bones = bvh.bones;
                    unmoving = this.isUnmoving;
                    for (i = j = 0, imax = bones.length; i < imax; i++) {
                        bone = bones[i];
                        matrix = new THREE.Matrix4();
                        calcBonePosition(bone, matrix, unmoving);
                        
                        position = matrix.getPosition();
                        a[j++] = +position.x;
                        a[j++] = +position.y;
                        a[j++] = -position.z;
                        
                        if (bone.isEnd) {
                            matrix.identity();
                            matrix.appendTranslation(+bone.endOffsetX,
                                                     +bone.endOffsetY,
                                                     -bone.endOffsetZ);
                            calcBonePosition(bone, matrix, unmoving);
                            position = matrix.getPosition();
                            a[j++] = +position.x;
                            a[j++] = +position.y;
                            a[j++] = -position.z;
                        }
                    }
                    
                    this.draw(a);
                };
                
                $this.draw = function(a) {
                    var children, o, i, imax;
                    if (a) {                    
                        children = this.children;
                        for (i = 0, imax = a.length/3; i < imax; i++) {
                            o = children[i];
                            o.position.x = +a[i * 3 + 0];
                            o.position.y = +a[i * 3 + 1];
                            o.position.z = +a[i * 3 + 2];
                        }
                    }
                };
                
                return MotionMan;
            }());
            window.MotionMan = MotionMan;
            
            
            var StaticMotionMan = (function() {
                var StaticMotionMan = function() {
                    initialize.apply(this, arguments);
                }, $this = extend(StaticMotionMan, MotionMan);
                
                var initialize = function() {
                    MotionMan.call(this);
                    this.numFrames = 0;
                    this.frameTime = 0;
                    this.totalTime = 0;
                    this.frames = [];
                    this.isLoop = false;
                };
                
                $this.clone = function() {
                    var newOne, children, o, i, imax;
                    var objectm;
                    newOne = new StaticMotionMan();
                    
                    children = this.children;
                    objectm  = {};
                    for (i = 0, imax = children.length; i < imax; i++) {
                        o = newOne.createObject({name:children[i].name});
                        objectm[o.name] = o;
                        o.position.x = children[i].position.x;
                        o.position.y = children[i].position.y;
                        o.position.z = children[i].position.z;
                        newOne.add(o);
                    }
                    newOne.objectm = objectm;
                    newOne.numFrames = this.numFrames;
                    newOne.frameTime = this.frameTime;
                    newOne.totalTime = this.totalTime;
                    newOne.frames = this.frames;
                    newOne.isLoop = this.isLoop;
                    newOne.isUnmoving = this.isUnmoving;
                    return newOne;
                };
                
                $this.load = function() {
                    var self = this;
                    var url, options, callback;
                    var i, imax;                    
                    var worker;
                    
                    for (i = 0, imax = arguments.length; i < imax; i++) {
                        switch (typeof(arguments[i])) {
                        case "string"  : url      = arguments[i]; break;
                        case "function": callback = arguments[i]; break;
                        case "object"  : options  = arguments[i]; break;
                        }
                    }
                    options = options || {};
                    
                    if (url) {
                        worker = new Worker("/javascripts/motionman.js");
                        worker.addEventListener("message", function(e) {
                            if (e.data.klass === "staticmotionman") {
                                switch (e.data.type) {
                                case "loadend":
                                    if (callback) callback("loadend");
                                    break;
                                case "metadata":
                                    self.build(e.data);
                                    if (callback) callback("builded");
                                    break;
                                case "data":
                                    self.frames.push(e.data.data);
                                    break;
                                case "completed":
                                    if (callback) callback("completed");
                                    break;
                                }
                            }
                        }, false);
                        options.klass = "staticmotionman";
                        options.url   = url;
                        if (options.unmoving === undefined) {
                            options.unmoving = this.isUnmoving;
                        }
                        worker.postMessage(options);
                    }
                };
                
                $this.build = function(data) {
                    var objectm, geometry;
                    var objectNames;
                    var objectTree;
                    var name, o, i, imax;
                    
                    this.numFrames = data.numFrames;
                    this.frameTime = data.frameTime;
                    this.totalTime = data.numFrames * data.frameTime;
                    this.frames = [];
                    this.isLoop = true;
                    
                    objectNames = data.objectNames;
                    objectTree  = data.objectTree;
                    objectm     = this.objectm = {};
                    geometry = (this.getGeometry) ? this.getGeometry() : null;
                    
                    for (i = 0, imax = data.numObjects; i < imax; i++) {
                        name = objectNames[i];
                        o = this.createObject({geometry:geometry, name:name});
                        objectm[o.name] = o;
			            o.position.x = 0;
			            o.position.y = 0;
			            o.position.z = 0;
                        o.$parent    = null;
                        o.$children  = [];
                        this.add(o);
                    }
                    
                    for (i = 0, imax = data.numObjects; i < imax; i++) {
                        name = objectNames[i];
                        o = objectm[name];
                        objectTree[name].forEach(function(x) {
                            objectm[x].$parent = o;
                            o.$children.push(objectm[x]);
                        });
                    }
                };
                
                $this.update = function(time) {
                    var numFrames, frame;
                    var frameIndex;
                    var bvh, a;
                    var bones, bone, matrix, position;
                    var i, imax;
                    
                    frameIndex = (time / this.frameTime)|0;
                    if (this.prevFrameIndex === frameIndex) return;
                    
                    numFrames = this.numFrames;
                    if (!this.isLoop) {
                        if (frameIndex >= numFrames) frameIndex = numFrames - 1;
                    } else {
                        while (frameIndex >= numFrames) frameIndex -= numFrames;
                    }
                    this.prevFrameIndex = frameIndex;
                    
                    a = this.frames[frameIndex];
                    this.draw(a);
                };
                
                return StaticMotionMan;
            }());
            window.StaticMotionMan = StaticMotionMan;
        }(global));
        
    } else {
        // in WebWorkers
        (function(worker) {
            worker.THREE = {};
            importScripts("/javascripts/libs/ThreeVector3.js");
            importScripts("/javascripts/libs/ThreeMatrix3.js");
            importScripts("/javascripts/libs/ThreeMatrix4.js");
            importScripts("/javascripts/ext.Three.js");
            importScripts("/javascripts/bvh.js");
            
            worker.addEventListener("message", function(e) {
                if (e.data.klass === "staticmotionman") {
                    staticmotionman_process(e.data);
                }
            }, false);
            
            var staticmotionman_process = (function() {
                var getBvh = function(url, options, callback) {
                    var self = this;
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url, true);
                    xhr.onload = function() {
                        callback(new Bvh(xhr.response, options));
                    };
                    xhr.send();
                }
                
                return function(options) {
                    getBvh(options.url, options, function(bvh) {
                        var bones, bone, o, a;
                        var objectNames, objectTree, numObjects;
                        var matrix, position;
                        var unmoving;
                        var i, imax, j, jmax;
                        
                        worker.postMessage({
                            klass:"staticmotionman",
                            type :"loadend"
                        });
                        
                        bones = bvh.bones;
                        objectNames = [];
                        objectTree  = {};
                        numObjects  = 0;
                        for (i = 0, imax = bones.length; i < imax; i++) {
                            bone = bones[i];
                            objectNames.push(bone.name);
                            objectTree[bone.name] = bone.children.map(function(x) {
                                return x.name;
                            });
                            numObjects += 1;
                            if (bone.isEnd) {
                                objectNames.push("*" + bone.name);
                                objectTree[bone.name].push("*" + bone.name);
                                objectTree["*" + bone.name] = [];
                                numObjects += 1;                                
                            }
                        }
                        worker.postMessage({
                            klass:"staticmotionman",
                            type :"metadata",
                            numObjects : numObjects,
                            objectTree : objectTree,
                            objectNames: objectNames,
                            numFrames: bvh.numFrames,
                            frameTime: (bvh.frameTime * 1000)|0,
                        });
                        
                        
                        unmoving = options.unmoving;
                        for (i = 0, imax = bvh.numFrames; i < imax; i++) {
                            bvh.gotoFrame(i);
                            
                            a = [];
                            for (j = 0, jmax = bones.length; j < jmax; j++) {
                                bone = bones[j];
                                matrix = new THREE.Matrix4();
                                calcBonePosition(bone, matrix, unmoving);
                                
                                position = matrix.getPosition();
                                a.push(position.x, position.y, position.z);
                                
                                if (bone.isEnd) {
                                    matrix.identity();
                                    matrix.appendTranslation(+bone.endOffsetX,
                                                             +bone.endOffsetY,
                                                             -bone.endOffsetZ);
                                    calcBonePosition(bone, matrix, unmoving);
                                    position = matrix.getPosition();
                                    a.push(position.x, position.y, position.z);
                                }
                            }
                            
                            worker.postMessage({
                                klass:"staticmotionman",
                                type :"data",
                                data:new Float32Array(a)
                            });
                        }
                        
                        worker.postMessage({
                            klas: "staticmotionman",
                            type: "completed"
                        });
                    });
                };
            }());
        }(global));
    }
}(this));
