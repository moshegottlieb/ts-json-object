# `ts-json-object`

JSON object validation for typescript

### What does it do?
It saves you the need to validate the JSON objects you receive.  
Instead of having to verify your fields one by one, and having to verify sub objects for validity, you just need to annonate your properties and your code is automagically type checked and verified.  
Required JSON fields are verified to exist, and optionals are, well, optionals.

### How does it work?

Using [typescript decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).  
It also uses [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) because typescript verifies this package is loaded before emitting type information.  

### Quick start

* Add to your `tsconfig.json`:  

```json
"experimentalDecorators": true,
"emitDecoratorMetadata": true,
```

* Define your JSON objects as subclasses of `JSONObject`
* Annonate your properties with `@JSONObject.required` or `JSONObject.optional`
* Optionally change JSON property names to match your model using `JSONObject.map('your-json-name-here')`
* Create your objects using a constructor that accepts an object with JSON values
* Sub objects are supported


```typescript
import {JSONObject} form 'ts-json-object'

class Author extends JSONObject {
	@JSONObject.required
	name: string
}

class Book {
	@JSONObject.required
	isbn:string
	@JSONObject.required
	@JSONObject.map('title') // map json name title to this class property - 'name'
	name:string
	@JSONObject.optional
	summary:string
	@JSONObject.required
	author:Author
}

try {
	let book = new Book({
		isbn: '12345',
		title: 'Great Book',
		author: { name: 'A great author' }
	}) // ok
		
	let book_required_error = new Book({
		name: 'Great Book',
		title: 'A great author'
	}) // Will throw a TypeError - Book.isbn, Book.author are required
	
	let book_wrong_type_error = new Book({
		isbn: 12345,
		title: 'Great Book',
		author: { name: 'A great author' }
	}) // Will throw a TypeError - Book.isbn shoud be a string

} catch (error){
	console.error(`Error: ${error}`)
}
```

### I found something, or want to contribute

Cool!  
Let me know.

## Notes

* **Important**
Properties that were not annonated will _not_ be loaded.
* The annonation code runs when your module is loaded, and the runtime checks run when your object constructor is running
* Doesn't work on interfaces because typescript decorators don't work on interfaces, classes are required, and must subclass `JSONObject`.