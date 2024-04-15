/*!
 *  obj-digger
 * ------------ -
 *  Safely access properties of deeply nested objects
 *  @author Satoshi Soma (https://amekusa.com)
 * =================================================== *
 *
 *  MIT License
 *
 *  Copyright (c) 2022 Satoshi Soma
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 *
 */

function error(throws, name, info) {
	if (!throws) return {name, info};
	let msg = '';
	switch (name) {
	case 'InvalidArgument':
		msg = `argument is not diggable`;
		break;
	case 'NoSuchKey':
		msg = `property '${info.key}' is not found`;
		break;
	case 'TypeMismatch':
		msg = `unexpected type of value`;
		break;
	}
	let e = new Error(msg);
	e.name = name;
	e.info = info;
	throw e;
}

function isDiggable(x) {
	switch (typeof x) {
	case 'object':
	case 'function':
		return true;
	}
	return false;
}

/**
 * @param {object} obj - Object to dig into
 * @param {string|string[]} path - Sequence of property-keys to go through
 * @param {object} [opts] - Options
 * @return {object} the result
 */
function dig(obj, path, opts = {}) {
	if (!isDiggable(obj)) {
		return {err: error(opts.throw, 'InvalidArgument', {value: obj})};
	}
	let p = Array.isArray(path) ? path : path.split('.');
	if (!p.length) return obj;

	let r = {path: [obj]};
	for (let i = 0;; i++) {
		let iP = p[i];

		if (iP == '*') { // Path: Wildcard
			r.found = {};
			let keys = Object.keys(obj);
			if (i == p.length - 1) {
				// wildcard destination; add every property to results
				for (let j = 0; j < keys.length; j++) r.found[keys[j]] = obj[keys[j]];
			} else {
				// wildcard branching; dig every property one by one
				let pRest = p.slice(i + 1);
				for (let j = 0; j < keys.length; j++) {
					if (isDiggable(obj[keys[j]])) {
						let dug = dig(obj[keys[j]], pRest, opts); // recursion
						if (!dug.err) r.found[keys[j]] = dug;
					}
				}
			}
			r.results = r.found; // alias of 'found'
			return r;
		}

		if (iP.endsWith('[]')) { // Path: Array
			iP = iP.substring(0, iP.length - 2);
			if (iP in obj) {
				if (!Array.isArray(obj[iP])) { // not an array
					r.err = error(opts.throw, 'TypeMismatch', {
						path: r.path,
						key: iP, value: obj[iP],
						expectedType: 'Array'
					});
					return r;
				}
				r.path.push(obj[iP]);
				r.found = [];
				if (i == p.length - 1) {
					// array destination; add every element to results
					for (let j = 0; j < obj[iP].length; j++) r.found.push(obj[iP][j]);
				} else {
					// array branching; dig every element
					let pRest = p.slice(i + 1);
					for (let j = 0; j < obj[iP].length; j++) {
						if (isDiggable(obj[iP][j])) {
							let dug = dig(obj[iP][j], pRest, opts); // recursion
							if (!dug.err) r.found.push(dug);
						}
					}
				}
				r.results = r.found; // alias of 'found'
				return r;
			}
			// path not found
			r.err = error(opts.throw, 'NoSuchKey', {
				path: r.path,
				key: iP
			});
			return r;
		}

		if (iP in obj) { // Path Found
			if (i == p.length - 1) { // destination
				if ('set'    in opts) obj[iP] = opts.set;
				if ('mutate' in opts) obj[iP] = opts.mutate(obj[iP]);
				r.key   = iP;
				r.value = obj[iP];
				return r;
			}
			if (isDiggable(obj[iP])) { // dig
				obj = obj[iP];
				r.path.push(obj);

			} else { // not diggable
				r.err = error(opts.throw, 'TypeMismatch', {
					path: r.path,
					key: iP, value: obj[iP],
					expectedType: 'object'
				});
				return r;
			}

		} else if (opts.makePath) { // Make Path
			for (;; i++) {
				iP = p[i];
				if (i == p.length - 1) { // destination
					obj[iP] = ('set' in opts) ? opts.set : opts.default;
					if ('mutate' in opts) obj[iP] = opts.mutate(obj[iP]);
					r.key   = iP;
					r.value = obj[iP];
					return r;
				}
				// make the rest of the path
				obj[iP] = (opts.makePath === true) ? {} : opts.makePath(obj, iP, i);
				obj = obj[iP];
				r.path.push(obj);
			}

		} else { // Path Not Found
			r.err = error(opts.throw, 'NoSuchKey', {
				path: r.path,
				key: iP
			});
			return r;
		}
	}
}

export default dig;
