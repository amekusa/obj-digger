const assert = require('assert');
const dig = require('./index.js');

function dummy() {
	let r = {
		alice: {
			age: 10,
			sex: 'female',
			accounts: {
				twitter: 'twitter.com/alice123',
				apple: 'apple.com/alice123'
			}
		},
		bob: {
			age: 11,
			sex: 'male',
			accounts: {
				twitter: 'twitter.com/bob123',
				microsoft: 'microsoft.com/bob123'
			}
		},
		charlie: {
			age: 12,
			sex: 'male'
		}
	};
	return r;
}

describe(`Function: dig`, () => {
	it(`simply get`, () => {
		let r;
		r = dig(dummy(), 'alice');
		assert.deepEqual(r.found, dummy().alice);

		r = dig(dummy(), 'alice.age');
		assert.equal(r.found, 10);

		r = dig(dummy(), 'alice.sex');
		assert.equal(r.found, 'female');

		r = dig(dummy(), 'alice.accounts.twitter');
		assert.equal(r.found, 'twitter.com/alice123');
	});
	describe(`options`, () => {
		it(`set`, () => {
			let r;
			let d1 = dummy();
			let d2 = dummy();
			r = dig(d2, 'bob.age', { set: 12 });
			assert.notEqual(r.found, d1.bob.age);
			assert.equal(r.found, d2.bob.age);

			r = dig(dummy(), 'bob.non_existent', { set: 'XXX' });
			assert.equal(r.found, undefined);
			assert.equal(r.err.name, 'PathNotFound');

			r = dig(dummy(), 'bob.non_existent', { default: 'XXX' });
			assert.equal(r.found, undefined);
			assert.equal(r.err.name, 'PathNotFound');
		});
		it(`makePath`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'bob.x.y.z', { makePath: true });
			assert.ok('x' in d.bob);
			assert.equal(typeof d.bob.x, 'object');

			assert.ok('y' in d.bob.x);
			assert.equal(typeof d.bob.x.y, 'object');

			assert.ok('z' in d.bob.x.y);
			assert.strictEqual(d.bob.x.y.z, undefined);
		});
		it(`makePath (function)`, () => {
			let r;
			let d = dummy();
			let called = 0;
			r = dig(d, 'bob.x.y.z', {
				makePath: (obj, key, n) => {
					called++;
					if (n === 1) {
						assert.strictEqual(obj, d.bob);
						assert.equal(key, 'x');
					} else if (n === 2) {
						assert.strictEqual(obj, d.bob.x);
						assert.equal(key, 'y');
					}
					return { n };
				}
			});
			assert.equal(called, 2);
			assert.equal(d.bob.x.n, 1);
			assert.equal(d.bob.x.y.n, 2);
		});
	});
	describe(`error handling`, () => {
		it(`error: PathNotFound`, () => {
			let r;
			r = dig(dummy(), 'non_existent');
			assert.equal(r.err.name, 'PathNotFound');
			assert.equal(r.err.info.key, 'non_existent');

			r = dig(dummy(), 'alice.non_existent');
			assert.equal(r.err.name, 'PathNotFound');
			assert.equal(r.err.info.key, 'non_existent');

			r = dig(dummy(), 'alice.accounts.non_existent');
			assert.equal(r.err.name, 'PathNotFound');
			assert.equal(r.err.info.key, 'non_existent');
		});
		it(`throwing errors`, () => {
			assert.throws(() => {
				dig(dummy(), 'non_existent', { throw: true });
			});
		});
	});
});
