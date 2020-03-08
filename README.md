# `json-object`

JSON object validation for typescript


```typescript

import 'json-object'

class Book {
	@JSONObject.required
	isbn:string
	@JSONObject.required
	name:string
	@JSONObject.optional
	summary:string
	@JSONObject.map('writer')
	@JSONObject.required
	author:string
}

try {
	let book = new Book({
		isbn: '12345',
		name: 'Great Book',
		writer: 'A great author'
	}) // ok
	
	book.author == 'A great author' // 'writer' mapped to 'author'
	
	let book_error = new Book({
		name: 'Great Book',
		writer: 'A great author'
	}) // Will throw a TypeError
} catch (error){
	console.error(`Error: ${error}`)
}


```