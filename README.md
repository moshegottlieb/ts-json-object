# `ts-json-object`

JSON object validation for typescript

1. Define your JSON objects as subclasses of `JSONObject`
1. Annonate your properties with `@JSONObject.required` or `JSONObject.optional`
1. Optionally change JSON property names to match your model using `JSONObject.map('your-json-name-here')`
1. Create your objects using a constructor that accepts an object with JSON values
1. Sub objects are supported


```typescript

import {JSONObject} form 'ts-json-object'

class Author extends JSONObject {
	@JSONObject.required
	name: string
}

/*
Annonate your JSON wrappers
*/
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