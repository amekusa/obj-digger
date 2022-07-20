/*!
 *  obj-digger
 * ------------ ---- -  *
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

function isDiggable(x) {
	switch (typeof x) {
	case 'object':
	case 'function':
		return true;
	}
	return false;
}

function error(throws, msg, name, info) {
	let r = new Error(msg);
	if (name) r.name = name;
	if (info) r.info = info;
	if (throws) throw r;
	return r;
}

function dig(obj, path, opts = {}) {
	let r = { path: [] };
	if (!isDiggable(obj)) {
		r.err = error(opts.throw, `argument is not diggable`, 'InvalidArgument', { value: obj });
		return r;
	}
	let p = Array.isArray(path) ? path : path.split('.');
	r.path.push(obj);

	for (let i = 0;; i++) {
		let iP = p[i];

		if (iP == '*') { // wildcard
			r.results = [];
			let pRest = p.slice(i + 1);
			let keys = Object.keys(obj);
			for (let j = 0; j < keys.length; j++) {
				if (isDiggable(obj[keys[j]])) r.results.push(dig(obj[keys[j]], pRest, opts)); // recursion
			}
			return r;
		}

		if (iP.endsWith('[]')) { // array access
			iP = iP.substring(0, iP.length - 2);
			if (iP in obj) {
				if (!Array.isArray(obj[iP])) { // not an array
					r.err = error(opts.throw, `property '${iP}' is not an array`, 'TypeMismatch', {
						path: r.path,
						key: iP, value: obj[iP],
						expectedType: 'Array'
					});
					return r;
				}
				// dig each elements in the array
				r.path.push(obj[iP]);
				r.results = [];
				let pRest = p.slice(i + 1);
				for (let j = 0; j < obj[iP].length; j++) {
					if (isDiggable(obj[iP][j])) r.results.push(dig(obj[iP][j], pRest, opts)); // recursion
				}
				return r;
			}
			// path not found
			r.err = error(opts.throw, `property '${iP}' is not found`, 'NoSuchKey', {
				path: r.path,
				key: iP
			});
			return r;
		}

		if (iP in obj) { // path found
			if (i == p.length - 1) { // destination
				if ('set'    in opts) obj[iP] = opts.set;
				if ('mutate' in opts) obj[iP] = opts.mutate(obj[iP]);
				r.found = obj[iP];
				return r;
			}
			if (isDiggable(obj[iP])) { // dig
				obj = obj[iP];
				r.path.push(obj);

			} else { // not diggable
				r.err = error(opts.throw, `property '${iP}' is not an object`, 'TypeMismatch', {
					path: r.path,
					key: iP, value: obj[iP],
					expectedType: 'object'
				});
				return r;
			}

		} else if (opts.makePath) { // make path
			for (;; i++) {
				iP = p[i];
				if (i == p.length - 1) { // destination
					obj[iP] = ('set' in opts) ? opts.set : opts.default;
					if ('mutate' in opts) obj[iP] = opts.mutate(obj[iP]);
					r.found = obj[iP];
					return r;
				}
				// make the rest of the path
				obj[iP] = (opts.makePath === true) ? {} : opts.makePath(obj, iP, i);
				obj = obj[iP];
				r.path.push(obj);
			}

		} else { // path not found
			r.err = error(opts.throw, `property '${iP}' is not found`, 'NoSuchKey', {
				path: r.path,
				key: iP
			});
			return r;
		}
	}
}

export default dig;
