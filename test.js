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
			age: 20,
			sex: 'male',
			accounts: {
				twitter: 'twitter.com/bob123',
				microsoft: 'microsoft.com/bob123'
			}
		},
		charlie: {
			age: 30,
			sex: 'male',
			wishlist: [
				{
					type:   'book',
					title:  'The Origin of Consciousness in the Breakdown of the Bicameral Mind',
					author: 'Julian Jaynes'
				},
				{
					type:     'movie',
					title:    'Mulholland Dr.',
					director: 'David Lynch'
				},
				{
					type:   'album',
					title:  'Grace',
					artist: 'Jeff Buckley'
				}
			]
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
	it(`array`, () => {
		let r;
		r = dig(dummy(), 'charlie.wishlist[].type');
		assert.equal(r.results.length, 3);
		assert.equal(r.results[0].found, 'book');
		assert.equal(r.results[1].found, 'movie');
		assert.equal(r.results[2].found, 'album');
	});
	describe(`options`, () => {
		it(`set`, () => {
			let r;
			let d1 = dummy();
			let d2 = dummy();
			r = dig(d2, 'bob.age', { set: 21 });
			assert.notEqual(r.found, d1.bob.age);
			assert.equal(r.found, d2.bob.age);

			r = dig(dummy(), 'bob.non_existent', { set: 'XXX' });
			assert.equal(r.found, undefined);
			assert.equal(r.err.name, 'NoSuchKey');

			r = dig(dummy(), 'bob.non_existent', { default: 'XXX' });
			assert.equal(r.found, undefined);
			assert.equal(r.err.name, 'NoSuchKey');
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
		it(`error: NoSuchKey`, () => {
			let r;
			r = dig(dummy(), 'non_existent');
			assert.equal(r.err.name, 'NoSuchKey');
			assert.equal(r.err.info.key, 'non_existent');

			r = dig(dummy(), 'alice.non_existent');
			assert.equal(r.err.name, 'NoSuchKey');
			assert.equal(r.err.info.key, 'non_existent');

			r = dig(dummy(), 'alice.accounts.non_existent');
			assert.equal(r.err.name, 'NoSuchKey');
			assert.equal(r.err.info.key, 'non_existent');
		});
		it(`error: TypeMismatch`, () => {
			let r;
			r = dig(dummy(), 'alice.age.xxx');
			assert.equal(r.err.name, 'TypeMismatch');
			assert.equal(r.err.info.key, 'age');
			assert.equal(r.err.info.expectedType, 'object');
		});
		it(`error: TypeMismatch (array)`, () => {
			let r;
			r = dig(dummy(), 'alice.age[].xxx');
			assert.equal(r.err.name, 'TypeMismatch');
			assert.equal(r.err.info.key, 'age');
			assert.equal(r.err.info.expectedType, 'Array');
		});
		it(`throwing errors`, () => {
			assert.throws(() => {
				dig(dummy(), 'non_existent', { throw: true });
			});
		});
	});
});
