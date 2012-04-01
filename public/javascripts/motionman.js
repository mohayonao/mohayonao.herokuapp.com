var MotionMan = (function() {
    var MotionMan = function() {
        initialize.apply(this, arguments);
    }, $this = MotionMan.prototype;
    
    var initialize = function(target) {
        this.bvh     = null;
        this.objects = null;
        this.objectMap = null;
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
            self.createObjects();
            if (callback) callback();
        };
        xhr.send();
    };
    
    $this.clone = function() {
        var newOne;
        if (this.bvh) {
            newOne = new MotionMan(this.target);
            newOne.bvh = this.bvh;
            newOne.createObjects();
        } else {
            newOne = null;
        }
        return newOne;
    };
    
    MotionMan.DATATABLE = {
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
    
    $this.createObjectFromBone = (function() {
        var ovalProgram = function(context) {
			context.beginPath();
			context.arc(0, 0, 1, 0, PI2, true);
			context.closePath();
			context.fill();
		};
        return function(bone, options) {
            var o, size, color;
            var DATATABLE = MotionMan.DATATABLE;
            size  = DATATABLE[options.name].size;
            color = DATATABLE[options.name].color;
            o = new THREE.Particle(new THREE.ParticleCanvasMaterial({
			    color:color, program:ovalProgram
		    }));
            o.name = options.name;
            o.scale.x = o.scale.y = size;
            return o;
        };
    }());
    
    
    $this.createObjects = (function() {
        var ovalProgram = function(context) {
			context.beginPath();
			context.arc(0, 0, 1, 0, PI2, true);
			context.closePath();
			context.fill();
		};
        
        return function() {
            var objects, objectMap, group;
            var bones, bone, o;
            var i, imax;
            var DATATABLE;
            
            DATATABLE = MotionMan.DATATABLE;
            
            objects   = this.objects   = [];
            objectMap = this.objectMap = {};
            group     = this.group;
            
            bones = this.bvh.bones;
            for (i = 0, imax = bones.length; i < imax; i++) {
                bone = bones[i];
                
                o = this.createObjectFromBone(bone, {name:bone.name});
                objectMap[o.name] = o;
				o.position.x = bone.offsetX;
				o.position.y = bone.offsetY;
				o.position.z = bone.offsetZ;
                
                group.add(o);
                objects.push(o);
                
                if (bone.isEnd) {
                    o = this.createObjectFromBone(bone, {name:"*"+bone.name});
                    objectMap[o.name] = o;
					o.position.x = bone.endOffsetX;
					o.position.y = bone.endOffsetY;
					o.position.z = bone.endOffsetZ;
                    group.add(o);
                    objects.push(o);
                }
            }
        };
    }());
    
    $this.draw = function(a) {
        var objects, o, i, imax;
        
        // re-position
        objects = this.objects;
        for (i = 0, imax = a.length/4; i < imax; i++) {
            o = objects[i];
            o.position.x = +a[i * 4 + 1];
            o.position.y = +a[i * 4 + 2] * 2;
            o.position.z = +a[i * 4 + 3] * 2 + 200;
        }
    };
    
    $this.update = function(time) {
        var bvh, a;
        var bones, bone, matrix, position;
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
            calcBonePosition(bone, matrix);
            
            position = matrix.getPosition();
            a.push(bone, position.x, position.y, -position.z);
            
            if (bone.isEnd) { // endSite
                matrix.identity();
                matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
                calcBonePosition(bone, matrix);
                position = matrix.getPosition();
                a.push(bone, position.x, position.y, -position.z);
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
