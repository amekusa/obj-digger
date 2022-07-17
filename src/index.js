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

function dig(obj, path, opts = {}) {
	let p = Array.isArray(path) ? path : path.split('.');
	let r = { path: [obj] };

	for (let i = 0;; i++) {
		let iP = p[i];

		if (iP in obj) { // path found
			if (i == p.length - 1) { // destination
				if ('set'    in opts) obj[iP] = opts.set;
				if ('mutate' in opts) obj[iP] = opts.mutate(obj[iP]);
				r.found = obj[iP];
				return r;

			} else if (isDiggable(obj[iP])) { // dig
				obj = obj[iP];
				r.path.push(obj);

			} else { // not diggable
				r.err = new Error(`property '${iP}' is not an object`);
				r.err.name = 'PathNotDiggable';
				r.err.info = {
					key: iP, value: obj[iP],
					path: r.path
				};
				if (opts.throw) throw r.err;
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
			r.err = new Error(`path not found`);
			r.err.name = 'PathNotFound';
			r.err.info = {
				key: iP,
				path: r.path
			};
			if (opts.throw) throw r.err;
			return r;
		}
	}
}

export default dig;
