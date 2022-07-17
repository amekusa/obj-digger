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
				return r.err;
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
