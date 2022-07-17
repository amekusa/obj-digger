# OBJ-DIGGER
Safely access properties of deeply nested objects.

## How to install
Install it to your project via NPM:

```sh
npm i obj-digger
```

Then, `require` or `import` it in your JS:

```js
// CJS
const dig = require('obj-digger');
```

```js
// ES6
import dig from 'obj-digger';
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

console.log( dug.found ); // 'alice123'
```

The 2nd parameter is the **query** pointing at the property you want to access.
If the property was not found, the returned object gets to have **`err`** property.

```js
let dug = dig(obj, 'Alice.accounts.tiktok');
if (dug.err) console.error( dug.err ); // 'NoSuchKey'
```

## Advanced Usage
There is the optional 3rd parameter: **options** which can enable you to achieve various data manipulation tasks on deeply nested objects.

### `options.set`
This option assigns its value to the property if it exists.

```js
dig(obj, 'Alice.age', { set: 21 });
```

---

### `options.makePath`
If this option is `true`, all the intermediate objects in the query get to be created in the "digging" process if they don't exist.

```js
dig(obj, 'Charlie.age', { makePath: true, set: 40 });
```

This creates the object `obj.Charlie` which didn't exist, and assigns `40` to `obj.Charlie.age`.

---

### `options.mutate`
This option is **a callback function** that can be used to mutate the current value of a property into a different value.

```js
console.log( obj.Bob.age ); // 30

dig(obj, 'Bob.age', { mutate: age => age * 2 });

console.log( obj.Bob.age ); // 60
```

The 1st parameter of `options.mutate` takes the current value of the queried property.
And the return value of `options.mutate` gets to be a new value.

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


---
Licensed under the MIT license.  
2022 &copy; Satoshi Soma ([amekusa.com](https://amekusa.com))
