# `ts-json-object`

JSON object validation for typescript

Quick start:

* Add to your `tsconfig.json`:  

```json
"experimentalDecorators": true,
"emitDecoratorMetadata": true
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
		
	let book_error = new Book({
		name: 'Great Book',
		title: 'A great author'
	}) // Will throw a TypeError - Book.author is required
} catch (error){
	console.error(`Error: ${error}`)
}
```

## Notes

* **Important**
Properties that were not annonated will _not_ be loaded.
* The annonation code runs when your module is loaded, and the runtime checks run when your object constructor is running
* 

