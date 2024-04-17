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

function modify(obj, key, opts) {
	if ('set' in opts) obj[key] = opts.set;
	if (opts.mutate) obj[key] = opts.mutate(obj[key]);
	return obj;
}

function pushStack(stack, data) {
	data.prev = stack[stack.length - 1];
	data.prev.next = data;
	stack.push(data);
}

function _has(obj, key) {
	return key in obj;
}

/**
 * @param {object} obj - Object to dig into
 * @param {string|string[]} path - Sequence of property-keys to go through
 * @param {object} [opts] - Options
 * @return {object} the result
 */
function dig(obj, path, opts = {}) {
	if (!isDiggable(obj)) return {err: error(opts.throw, 'InvalidArgument', {value: obj})};
	if (!Array.isArray(path)) path = path.split('.');
	if (!path.length) return obj;
	return _dig(obj, path, opts);
}

function _dig(obj, path, opts) {
	let r = opts.stack ? {stack: [{value: obj}]} : {};
	let last = path.length - 1;
	let has = opts.has || _has;
	for (let i = 0;; i++) {
		let p = path[i]; // pick up a crumb

		if (p == '*') { // Path: Wildcard
			r.found = {};
			let keys = Object.keys(obj);
			if (i == last) {
				// wildcard destination; add every property to results
				for (let j = 0; j < keys.length; j++) {
					modify(obj, keys[j], opts);
					r.found[keys[j]] = obj[keys[j]];
				}
			} else {
				// wildcard branching; dig every property one by one
				path = path.slice(i + 1); // remaining crumbs to pick up
				for (let j = 0; j < keys.length; j++) {
					if (isDiggable(obj[keys[j]])) {
						let dug = _dig(obj[keys[j]], path, opts); // recursion
						if (!dug.err) r.found[keys[j]] = dug;
					}
				}
			}
			r.results = r.found; // @deprecated alias of 'found'
			return r;
		}

		if (p.endsWith('[]')) { // Path: Array
			p = p.substring(0, p.length - 2);
			if (has(obj, p)) {
				obj = obj[p];
				if (!Array.isArray(obj)) { // not an array
					r.err = error(opts.throw, 'TypeMismatch', {
						key: p,
						value: obj,
						expectedType: 'Array'
					});
					return r;
				}
				r.found = [];
				if (i == last) {
					// array destination; add every element to results
					for (let j = 0; j < obj.length; j++) {
						modify(obj, j, opts);
						r.found.push(obj[j]);
					}
				} else {
					// array branching; dig every element
					if (r.stack) pushStack(r.stack, {key: p, value: obj});
					path = path.slice(i + 1); // remaining crumbs to pick up
					for (let j = 0; j < obj.length; j++) {
						if (isDiggable(obj[j])) {
							let dug = _dig(obj[j], path, opts); // recursion
							if (!dug.err) r.found.push(dug);
						}
					}
				}
				r.results = r.found; // @deprecated alias of 'found'
				return r;
			}
			// path not found
			r.err = error(opts.throw, 'NoSuchKey', {key: p});
			return r;
		}

		if (has(obj, p)) { // Path Found
			if (i == last) { // destination
				modify(obj, p, opts);
				r.key   = p;
				r.value = obj[p];
				return r;
			}
			if (isDiggable(obj[p])) { // dig
				obj = obj[p];
				if (r.stack) pushStack(r.stack, {key: p, value: obj});

			} else { // not diggable
				r.err = error(opts.throw, 'TypeMismatch', {
					key: p,
					value: obj[p],
					expectedType: 'object'
				});
				return r;
			}

		} else if (opts.makePath) { // Make Path
			for (;; i++) {
				p = path[i];
				if (i == last) { // destination
					obj[p] = undefined;
					modify(obj, p, opts);
					r.key   = p;
					r.value = obj[p];
					return r;
				}
				// make the rest of the path
				obj[p] = (opts.makePath === true) ? {} : opts.makePath(obj, p, i);
				obj = obj[p];
				if (r.stack) pushStack(r.stack, {key: p, value: obj});
			}

		} else { // Path Not Found
			r.err = error(opts.throw, 'NoSuchKey', {key: p});
			return r;
		}
	}
}

export default dig;

