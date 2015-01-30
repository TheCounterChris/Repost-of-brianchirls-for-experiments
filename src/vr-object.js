module.exports = (function () {
	'use strict';

	var materials = require('./materials'),
		THREE = require('three');

	function VRObject(parent, creator, options) {
		var material;

		options = options || {};

		//todo: get material from options
		this.object = creator(parent, options);
		this.parent = this.object.parent || parent;

		this.object.position.set(
			parseFloat(options.x) || 0,
			parseFloat(options.y) || 0,
			parseFloat(options.z) || 0
		);

		if (options.color) {
			material = this.object.material;
			if (material === materials.standard) {
				material = this.object.material = material.clone();
			}
			material.color = new THREE.Color(options.color);
		}
	}

	VRObject.prototype.moveTo = function (x, y, z) {
		var position = this.object.position;

		x = !isNaN(x) ? x : position.x;
		y = !isNaN(y) ? y : position.y;
		z = !isNaN(z) ? z : position.z;

		position.set(x, y, z);

		return this;
	};

	VRObject.prototype.scale = function (x, y, z) {
		var scale = this.object.scale;

		if (x !== undefined && !isNaN(x)) {
			if (y === undefined && z === undefined) {
				y = z = x;
			} else {
				x = scale.x;
			}
		}

		x = !isNaN(x) ? x : scale.x;
		y = !isNaN(y) ? y : scale.y;
		z = !isNaN(z) ? z : scale.z;

		scale.multiply(new THREE.Vector3(x, y, z));

		return this;
	};

	VRObject.prototype.setScale = function (x, y, z) {
		var scale = this.object.scale;

		if (x !== undefined && !isNaN(x)) {
			if (y === undefined && z === undefined) {
				y = z = x;
			} else {
				x = scale.x;
			}
		}

		x = !isNaN(x) ? x : scale.x;
		y = !isNaN(y) ? y : scale.y;
		z = !isNaN(z) ? z : scale.z;

		scale.set(x, y, z);

		return this;
	};

	return VRObject;

}());