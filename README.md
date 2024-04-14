# OBJ-DIGGER
[![NPM Version](https://img.shields.io/npm/v/obj-digger?style=for-the-badge&label=npm%20package)](https://www.npmjs.com/package/obj-digger) [![NPM License](https://img.shields.io/npm/l/obj-digger?style=for-the-badge)](https://github.com/amekusa/obj-digger/blob/master/LICENSE) [![codecov](https://codecov.io/gh/amekusa/obj-digger/branch/master/graph/badge.svg?token=LYU3ZAOR84)](https://codecov.io/gh/amekusa/obj-digger)

Safely access the properties of deeply nested objects.


## How to install
Install it in your project via NPM:

```sh
npm i obj-digger
```

Then, `import` or `require` the package in your JS:

```js
// ES
import dig from 'obj-digger';

// CJS
const dig = require('obj-digger');
```


## How to use
*obj-digger* is just a single function.

```js
// example

let obj = {
  Alice: {
    age: 20,
    accounts: {
      twitter: 'alice123'
    }
  },
  Bob: {
    age: 30,
    accounts: {
      github: 'bob123'
    }
  }
};

let dug = dig(obj, 'Alice.accounts.twitter');
console.log( dug.value ); // 'alice123'

// Using object destructuring:
let { value } = dig(obj, 'Alice.accounts.twitter');
console.log( value ); // 'alice123'
```

The 2nd parameter is the **query** pointing at the property you want to access.
If the property was not found, the returned object gets to have **`err`** property.

```js
let dug = dig(obj, 'Alice.accounts.tiktok');
if (dug.err) console.error( dug.err.name ); // 'NoSuchKey'
```


## Advanced usage: OPTIONS
There is the optional 3rd parameter: **options** which enables you to easily manipulate deeply nested objects.

### `options.set`
This option assigns its value to the query destination property if it exists.

```js
let { value } = dig(obj, 'Alice.age', { set: 21 });
console.log( value );         // 21
console.log( obj.Alice.age ); // 21
```

---

### `options.makePath`
If this option is `true`, all the intermediate objects in the query get to be created in the "digging" process if they don't exist.

```js
console.log( obj.Charlie ); // undefined
dig(obj, 'Charlie.age', { makePath: true, set: 40 });
console.log( obj.Charlie ); // { age: 40 }
```

This creates the object `obj.Charlie` which didn't exist, and assigns `40` to `obj.Charlie.age`.

---

### `options.mutate`
This option is **a callback function** that can be used to mutate the current value of the property into a different value.

```js
console.log( obj.Bob.age ); // 30
dig(obj, 'Bob.age', { mutate: age => age * 2 });
console.log( obj.Bob.age ); // 60
```

The 1st parameter of `options.mutate` takes the current value of the queried property.
And the return value of `options.mutate` becomes the new value.

---

### `options.throw`
If this option is `true`, the function throws errors when they occur.

```js
try {
  dig(obj, 'non_existent', { throw: true });
} catch (e) {
  console.error(e); // 'NoSuchKey'
}
```


## Advanced usage: Array Queries
If you want to dig **multiple objects in an array** like this:

```js
// example

let obj = {
  items: [ // array
    {
      type:   'book',
      title:  'The Origin of Consciousness in the Breakdown of the Bicameral Mind',
      author: 'Julian Jaynes'
    }, {
      type:     'movie',
      title:    'Mulholland Dr.',
      director: 'David Lynch'
    }, {
      type:   'album',
      title:  'Grace',
      artist: 'Jeff Buckley'
    }
  ]
};
```

Then, put **square brackets `[]`** to the name of the array property in the query, like this:

```js
let dug = dig(obj, 'items[].type');
```

The return value, at this time, has a bit different structure.
The function **recusively operates** for each object in the array, and stores each result into **`results`** property of the return value.

```js
console.log( dug.results[0].value ); // 'book'
console.log( dug.results[1].value ); // 'movie'
console.log( dug.results[2].value ); // 'album'
```


## Advanced usage: Wildcards
You can use **asterisk `*`** character in the query as **a wildcard** which matches for any names of properties.

```js
// example

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
```

Just like Array Queries, the function recursively operates for every object that is a direct child of `obj.mammals` in this example. And you get each result stored in `dug.results` array.

```js
console.log( dug.results[0].value ); // 2
console.log( dug.results[1].value ); // 4
```

---
Licensed under the MIT license.  
2022 &copy; Satoshi Soma ([amekusa.com](https://amekusa.com))
