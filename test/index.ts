import {JSONObject, required} from '../src/index'
import {strict as assert} from 'assert'

class Book extends JSONObject {
	@JSONObject.required
	name:string
	@JSONObject.optional
	summary?:string
}

// This is ok
let book:Book = new Book({ name: "Moby Dick" , summary: "You're my obsession" })
// This is also ok
let b2:Book = new Book({ name: "Moby Dick" }) // Also ok
// Summary is undefined
assert(b2.summary === undefined)
// This will throw a TypeError, as 'name' is required
assert.throws(()=>{
    let book = new Book({ summary: "Once upon a time" })
})
assert.throws(()=>{
    let book = new Book({ name: 12345 } )
})
//Subobjects are supported

class Author extends JSONObject {
	@JSONObject.required
	name: string
}

class BookWithAuthor extends JSONObject {
	@JSONObject.required
	name:string
	@JSONObject.optional
	summary:string
	@JSONObject.required
	author:Author
}
let book2:BookWithAuthor = new BookWithAuthor({ name: "Moby Dick", author: {name: "Herman Melville" } })
assert.ok(book2.author instanceof Author)