import assert from 'node:assert';
const {
	ok,
	equal: eq,
	deepEqual: deq,
	strictEqual: seq,
	deepStrictEqual: dseq,
	notEqual: neq,
} = assert;

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
		eq(r.key, 'alice');
		deq(r.value, dummy().alice);

		r = dig(dummy(), 'alice.age');
		eq(r.key, 'age');
		eq(r.value, 10);

		r = dig(dummy(), 'alice.sex');
		eq(r.key, 'sex');
		eq(r.value, 'female');

		r = dig(dummy(), 'alice.accounts.twitter');
		eq(r.key, 'twitter');
		eq(r.value, 'twitter.com/alice123');
	});
	it(`array`, () => {
		let r;
		r = dig(dummy(), 'charlie.wishlist[].type');
		eq(r.found.length, 3);
		eq(r.found[0].value, 'book');
		eq(r.found[1].value, 'movie');
		eq(r.found[2].value, 'album');
	});
	it(`array (last)`, () => {
		let r;
		r = dig(dummy(), 'charlie.wishlist[]');
		eq(r.found.length, 4);
		eq(r.found[0].type, 'book');
		eq(r.found[1].type, 'movie');
		eq(r.found[2].type, 'album');
		eq(r.found[3], 'xxx_not_an_object_xxx');
	});
	it(`wildcard`, () => {
		let r;
		r = dig(dummy(), '*.age');
		eq(Object.keys(r.found).length, 3);
		eq(r.found.alice.value,   10);
		eq(r.found.bob.value,     20);
		eq(r.found.charlie.value, 30);
	});
	it(`wildcard (last)`, () => {
		let r;
		r = dig(dummy(), 'alice.*');
		eq(Object.keys(r.found).length, 3);
		eq(r.found.age, 10);
		eq(r.found.sex, 'female');
		deq(r.found.accounts, {
			twitter: 'twitter.com/alice123',
			apple:   'apple.com/alice123'
		});
	});
	describe(`options`, () => {
		it(`has`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'alice', {has(obj, prop) {
				seq(obj, d);
				eq(prop, 'alice');
				return true;
			}});

			r = dig(d, 'alice.toString');
			ok(!r.err);

			r = dig(d, 'alice.toString', {has: Object.hasOwn});
			ok(r.err);
			eq(r.err.name, 'NoSuchKey');
		})
		it(`set`, () => {
			let r;
			let d1 = dummy();
			let d2 = dummy();
			r = dig(d2, 'bob.age', {set: 21});
			neq(r.value, d1.bob.age);
			eq(r.value, d2.bob.age);

			r = dig(dummy(), 'bob.non_existent', {set: 'XXX'});
			eq(r.value, undefined);
			eq(r.err.name, 'NoSuchKey');
		});
		it(`set (array)`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'charlie.wishlist[]', {set: 'abc'});
			deq(d.charlie.wishlist, ['abc', 'abc', 'abc', 'abc']);
		});
		it(`set (wildcard)`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'alice.*', {set: 'abc'});
			deq(d.alice, {
				age: 'abc',
				sex: 'abc',
				accounts: 'abc'
			});
		});
		it(`makePath`, () => {
			let r;
			let d = dummy();
			r = dig(d, 'bob.x.y.z', {makePath: true});
			ok('x' in d.bob);
			eq(typeof d.bob.x, 'object');

			ok('y' in d.bob.x);
			eq(typeof d.bob.x.y, 'object');

			ok('z' in d.bob.x.y);
			seq(d.bob.x.y.z, undefined);
		});
		it(`makePath (function)`, () => {
			let r;
			let d = dummy();
			let called = 0;
			r = dig(d, 'bob.x.y.z', {
				makePath: (obj, key, n) => {
					called++;
					if (n === 1) {
						seq(obj, d.bob);
						eq(key, 'x');
					} else if (n === 2) {
						seq(obj, d.bob.x);
						eq(key, 'y');
					}
					return {n};
				}
			});
			eq(called, 2);
			eq(d.bob.x.n, 1);
			eq(d.bob.x.y.n, 2);
		});
		it(`mutate`, () => {
			let d1 = dummy();
			let d2 = dummy();
			dig(d2, 'bob.age', {mutate: age => age * 2});
			eq(d2.bob.age, d1.bob.age * 2);
		});
		it(`mutate (array)`, () => {
			let d = dummy();
			dig(d, 'charlie.wishlist[]', {mutate: item => 'Mutated: ' + (typeof item == 'object' ? item.title : item)});
			deq(d.charlie.wishlist, [
				'Mutated: The Origin of Consciousness in the Breakdown of the Bicameral Mind',
				'Mutated: Mulholland Dr.',
				'Mutated: Grace',
				'Mutated: xxx_not_an_object_xxx',
			]);
		});
		it(`mutate (wildcard)`, () => {
			let d = dummy();
			dig(d, 'alice.accounts.*', {mutate: prop => 'Mutated: ' + prop});
			deq(d.alice.accounts, {
				apple:   'Mutated: apple.com/alice123',
				twitter: 'Mutated: twitter.com/alice123',
			});
		});
		it(`stack`, () => {
			let r, d;
			d = dummy();
			r = dig(d, 'alice.accounts.apple', {stack: true});
			eq(r.stack.length, 3);

			seq(r.stack[0].next, r.stack[1]);
			seq(r.stack[1].prev, r.stack[0]);
			seq(r.stack[1].next, r.stack[2]);
			seq(r.stack[2].prev, r.stack[1]);

			seq(r.stack[0].value, d);
			seq(r.stack[1].key,   'alice');
			seq(r.stack[1].value, d.alice);
			seq(r.stack[2].key,   'accounts');
			seq(r.stack[2].value, d.alice.accounts);
		});
	});
	describe(`error handling`, () => {
		function checkError(data) {
			let opts = data.args.length > 2 ? data.args[2] : {};
			let r = dig(data.args[0], data.args[1], Object.assign(opts, {throw: false}));
			// validate error
			if (data.name) eq(data.name, r.err.name);
			if (data.info) {
				for (let key in data.info) eq(data.info[key], r.err.info[key]);
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
			eq(dug.found.ape.value, 2);
			eq(dug.found.rhino.value, 4);
		});
	});
});
