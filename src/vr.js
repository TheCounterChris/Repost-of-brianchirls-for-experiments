(function () {
	'use strict';

	//constants
	var NEAR = 1,
		FAR = 10000,

	//global-ish declarations
		THREE,
		eventEmitter,
		materials = require('./materials'),

	//scene assets
		camera,
		scene,
		body,
		renderer,
		vrControls,
		vrEffect,
		mouseControls,
		raycaster,
		target,

		floor,

	//state
		going = false,

	//exported object
		VR,
		objectMethods = [
			'box',
			'cylinder',
			'torus',
			'empty',
			'floor',
			'panorama',
			'image'
		],

		lastTick = 0,
		animationCallbacks = [];

	function raycast() {
		var i,
			intersect,
			object,
			intersects;

		raycaster.ray.origin.copy( camera.position );
		raycaster.ray.direction.set(0, 0, 0.5).unproject(camera).sub(camera.position).normalize();

		intersects = raycaster.intersectObjects( scene.children );
		for (i = 0; i < intersects.length; i++) {
			intersect = intersects[i];
			if (intersect.object instanceof THREE.Mesh) {
				object = intersect.object;
				break;
			}
		}

		if (target !== object) {
			if (target) {
				VR.emit('lookoff', target);
			}
			target = object;
			if (target) {
				VR.emit('lookat', target);
			}
		}
	}

	function render() {
		var now = Date.now() / 1000,
			delta = Math.max(1, now - lastTick);

		vrControls.update();

		animationCallbacks.forEach(function (cb) {
			cb(delta, now);
		});

		raycast();

		vrEffect.render(scene, camera);

		lastTick = now;
	}

	function renderLoop() {
		if (going) {
			render();
			requestAnimationFrame(renderLoop);
		}
	}

	function stop() {
		going = false;
	}

	function start() {
		if (!going) {
			going = true;
			renderLoop();
		}
	}

	function resize(width, height) {
		width = width || window.innerWidth;
		height = height || window.innerHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		//renderer.setSize(width, height);
	}

	function initScene() {
		if (renderer) {
			return;
		}

		//create renderer and place in document
		renderer = new THREE.WebGLRenderer();
		// renderer.shadowMapEnabled = true;
		// renderer.shadowMapSoft = true;
		document.body.insertBefore(renderer.domElement, document.body.firstChild || null);

		//need a scene to put all our objects in
		scene = new THREE.Scene();

		//need a camera with which to look at stuff
		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, NEAR, FAR);

		// set camera position so that OrbitControls works properly.
		camera.position.z = 0.0001;

		body = new THREE.Object3D();
		body.name = 'body';
		body.position.y = 2;
		scene.add(body);
		body.add(camera);

		//VRControls point the camera wherever we're looking
		vrControls = new THREE.VRControls( camera );
		vrControls.freeze = true;

		//render left and right eye
		vrEffect = new THREE.VRStereoEffect(renderer);
		vrEffect.near = NEAR;
		vrEffect.far = FAR;
		vrEffect.addEventListener('fullscreenchange', function () {
			var fs = document.fullscreenElement ||
				document.mozFullScreenElement ||
				document.webkitFullscreenElement;

			vrControls.freeze = !(vrEffect.isFullscreen() || vrEffect.vrPreview() || fs && vrControls.mode() === 'deviceorientation');
			if (vrControls.freeze) {
				vrControls.reset();
				camera.position.z = 0.0001;
			}
		});

		//report on HMD
		vrControls.addEventListener('devicechange', function () {
			VR.emit('devicechange', vrControls.mode, vrEffect.hmd());
		});

		//mouse control in case got no orientation device
		mouseControls = new THREE.OrbitControls(camera);

		//todo: remove any default lights once other lights are added
		var dLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dLight.position.set(2, 10, 10);

		dLight.castShadow = true;
		dLight.shadowCameraVisible = true;

		dLight.shadowMapWidth = 2048;
		dLight.shadowMapHeight = 2048;

		dLight.shadowCameraLeft = -10;
		dLight.shadowCameraRight = 10;
		dLight.shadowCameraTop = 10;
		dLight.shadowCameraBottom = -10;

		dLight.shadowCameraFar = 50;
		dLight.shadowCameraNear = 3;
		dLight.shadowDarkness = 1;

		scene.add(dLight);

		scene.add(new THREE.AmbientLight(0x444444));

		if (VR) {
			VR.camera = camera;
			VR.camera = camera;
			VR.canvas = renderer.domElement;
			VR.requestFullScreen = vrEffect.requestFullScreen;
			VR.zeroSensor = vrControls.zeroSensor;
		}

		raycaster = new THREE.Raycaster();
	}

	function initRequirements() {
		//load external requirements
		THREE = require('three');
		require('imports?THREE=three!DeviceOrientationControls');
		require('imports?THREE=three!OrbitControls');

		//if (typeof __DEV__ !== 'undefined' && __DEV__) {
			require('imports?THREE=three!AugmentedConsole');
		//}

		THREE.ImageUtils.crossOrigin = '';

		eventEmitter = require('event-emitter');

		//my VR stuff. todo: move these to a separate repo or two for easy packaging
		require('imports?THREE=three!./lib/VRStereoEffect');
		require('imports?THREE=three!./lib/VRControls');
	}

	function initialize() {
		//todo: set up button/info elements

		initScene();

		resize();
	}

	module.exports = VR = {
		init: initialize,
		render: render,
		start: start,
		stop: stop,
		resize: resize,

		THREE: THREE,

		materials: materials,

		animate: function (callback) {
			var i;
			if (typeof callback === 'function') {
				i = animationCallbacks.indexOf(callback);
				if (i < 0) {
					animationCallbacks.push(callback);
				}
			}
		},

		end: function (callback) {
			var i;

			if (!callback) {
				animationCallbacks.length = 0;
				return;
			}

			if (typeof callback === 'function') {
				i = animationCallbacks.indexOf(callback);
				if (i >= 0) {
					animationCallbacks.splice(i, 1);
				}
			}
		},

		requestFullScreen: function () {},
		zeroSensor: function () {},
		preview: function () {
			var fs;
			if (vrEffect && !vrEffect.isFullscreen()) {
				vrEffect.vrPreview(!vrEffect.vrPreview());

				fs = document.fullscreenElement ||
					document.mozFullScreenElement ||
					document.webkitFullscreenElement;

				vrControls.freeze = !(vrEffect.isFullscreen() || vrEffect.vrPreview() || vrControls.mode() === 'deviceorientation');
				if (vrControls.freeze) {
					vrControls.reset();
					camera.position.z = 0.0001;
				}
			}
		},

		//todo: wrap these?
		camera: camera,
		scene: scene,
		canvas: renderer && renderer.domElement || null
	};

	initRequirements();

	objectMethods.forEach(function (method) {
		var VRObject = require('./vr-object'),
			creator = require('./objects/' + method);

		VR[method] = function (options) {
			var obj = new VRObject(scene, creator, options);
			return obj;
		};

		VRObject.prototype[method] = function (options) {
			var obj = new VRObject(this.object, creator, options);
			return obj;
		};
	});

	eventEmitter(VR);

	Object.defineProperty(VR, 'target', {
		get: function () {
			return target;
		}
	});
}());
