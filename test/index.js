import assert from 'node:assert';
import dig from '../src/index.js';

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
				},
				'xxx_not_an_object_xxx'
			]
		},
		xxx: 'xxx_not_an_object_xxx'
	};
	return r;
}

describe(`Function: dig`, () => {
	it(`simply get`, () => {
		let r;
		r = dig(dummy(), 'alice');
		assert.equal(r.key, 'alice');
		assert.deepEqual(r.value, dummy().alice);

		r = dig(dummy(), 'alice.age');
		assert.equal(r.key, 'age');
		assert.equal(r.value, 10);

		r = dig(dummy(), 'alice.sex');
		assert.equal(r.key, 'sex');
		assert.equal(r.value, 'female');

		r = dig(dummy(), 'alice.accounts.twitter');
		assert.equal(r.key, 'twitter');
		assert.equal(r.value, 'twitter.com/alice123');
	});
	it(`array`, () => {
		let r;
		r = dig(dummy(), 'charlie.wishlist[].type');
		assert.equal(r.results.length, 3);
		assert.equal(r.results[0].value, 'book');
		assert.equal(r.results[1].value, 'movie');
		assert.equal(r.results[2].value, 'album');
	});
	it(`array (last)`, () => {
		let r;
		r = dig(dummy(), 'charlie.wishlist[]');
		assert.equal(r.results.length, 4);
		assert.equal(r.results[0].type, 'book');
		assert.equal(r.results[1].type, 'movie');
		assert.equal(r.results[2].type, 'album');
		assert.equal(r.results[3], 'xxx_not_an_object_xxx');
	});
	it(`wildcard`, () => {
		let r;
		r = dig(dummy(), '*.age');
		assert.equal(Object.keys(r.results).length, 3);
		assert.equal(r.results.alice.value,   10);
		assert.equal(r.results.bob.value,     20);
		assert.equal(r.results.charlie.value, 30);
	});
	it(`wildcard (last)`, () => {
		let r;
		r = dig(dummy(), 'alice.*');
		assert.equal(Object.keys(r.results).length, 3);
		assert.equal(r.results.age, 10);
		assert.equal(r.results.sex, 'female');
		assert.deepEqual(r.results.accounts, {
			twitter: 'twitter.com/alice123',
			apple:   'apple.com/alice123'
		});
	});
	describe(`options`, () => {
		it(`set`, () => {
			let r;
			let d1 = dummy();
			let d2 = dummy();
			r = dig(d2, 'bob.age', {set: 21});
			assert.notEqual(r.value, d1.bob.age);
			assert.equal(r.value, d2.bob.age);

			r = dig(dummy(), 'bob.non_existent', {set: 'XXX'});
			assert.equal(r.value, undefined);
			assert.equal(r.err.name, 'NoSuchKey');

			r = dig(dummy(), 'bob.non_existent', {default: 'XXX'});
			assert.equal(r.value, undefined);
			assert.equal(r.err.name, 'NoSuchKey');
		});
		it(`makePath`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'bob.x.y.z', {makePath: true});
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
					return {n};
				}
			});
			assert.equal(called, 2);
			assert.equal(d.bob.x.n, 1);
			assert.equal(d.bob.x.y.n, 2);
		});
		it(`mutate`, () => {
			let r;
			let d1 = dummy();
			let d2 = dummy();
			dig(d2, 'bob.age', {mutate: age => age * 2});
			assert.equal(d2.bob.age, d1.bob.age * 2);
		});
	});
	describe(`error handling`, () => {
		function checkError(data) {
			let opts = data.args.length > 2 ? data.args[2] : {};
			let r = dig(data.args[0], data.args[1], Object.assign(opts, {throw: false}));
			// validate error
			if (data.name) assert.equal(data.name, r.err.name);
			if (data.info) {
				for (let key in data.info) assert.equal(data.info[key], r.err.info[key]);
			}
			// check if it throws the exact same error
			assert.throws(() => {
				dig(data.args[0], data.args[1], Object.assign(opts, {throw: true}));
			}, r.err);
		}
		it(`error: InvalidArgument`, () => {
			checkError({
				args: ['not_an_object', 'alice.age'],
				name: 'InvalidArgument',
				info: {value: 'not_an_object'}
			});
		});
		it(`error: NoSuchKey`, () => {
			checkError({
				args: [dummy(), 'non_existent'],
				info: {key: 'non_existent'}
			});
			checkError({
				args: [dummy(), 'alice.non_existent'],
				name: 'NoSuchKey',
				info: {key: 'non_existent'}
			});
			checkError({
				args: [dummy(), 'alice.accounts.non_existent'],
				name: 'NoSuchKey',
				info: {key: 'non_existent'}
			});
		});
		it(`error: TypeMismatch`, () => {
			checkError({
				args: [dummy(), 'alice.age.xxx'],
				name: 'TypeMismatch',
				info: {
					key: 'age',
					expectedType: 'object'
				}
			});
		});
		it(`error: TypeMismatch (array)`, () => {
			checkError({
				args: [dummy(), 'alice.age[].xxx'],
				name: 'TypeMismatch',
				info: {
					key: 'age',
					expectedType: 'Array'
				}
			});
		});
	});
	describe(`examples`, () => {
		it(`Advanced usage: Wildcards`, () => {
			let obj = {
			  mammals: {
			    ape:   { legs: 2 },
			    rhino: { legs: 4 }
			  },
			  birds: {
			    ostrich: { legs: 2 },
			    parrot:  { legs: 2 }
			  },
			  reptiles: {
			    snake:     { legs: 0 },
			    crocodile: { legs: 4 }
			  }
			};

			let dug = dig(obj, 'mammals.*.legs');
			assert.equal(dug.results.ape.value, 2);
			assert.equal(dug.results.rhino.value, 4);
		});
	});
});