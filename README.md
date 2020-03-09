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
* Create your objects using a constructor that accepts an object with JSON values
* Sub objects are supported


```typescript
import {JSONObject} from 'ts-json-object'

// Declare your sub objects first, make sure these extends JSONObject as well
class Author extends JSONObject {
	@JSONObject.required
	name: string
}

// A book can use the Author type as a property
class Book {
	@JSONObject.required
	isbn:string
	@JSONObject.required
	name:string
	@JSONObject.optional
	summary:string
	@JSONObject.required
	author:Author
}


// Create instances of your class from JSON objects

try {
	let book = new Book({
		isbn: '12345',
		name: 'Great Book',
		author: { name: 'A great author' }
	}) // ok
	
	let book_summary = new Book({
		isbn: '12345',
		name: 'Great Book',
		author: { name: 'A great author' },
		summary: 'An optional summary'
	}) // ok as well
		
	let book_required_error = new Book({
		name: 'Great Book',
		author:{
			name: 'A great author'
		}
	}) // Will throw a TypeError - Book.isbn is required
	
	let book_wrong_type_error = new Book({
		isbn: 12345,
		name: 'Great Book',
		author: { name: 'A great author' }
	}) // Will throw a TypeError - Book.isbn must be a string

} catch (error){
	console.error(`Error: ${error}`)
}
```

#### Mapping JSON keys

Sometimes the JSON key name is not the same as your class property name.  
In these cases, use the `@JSONObject.map` decorator to map a JSON key to your class:

```typescript
import {JSONObject} from 'ts-json-object'

class Book extends JSONObject {

	@JSONObject.map('name') // Will map the JSON key 'name' to this class property ('title')
	@JSONObject.required
	title : string
}

let book = new Book({ name : 'A great title!' })

```

#### Union

It is possible to specify union literals, unfurtunately, there is no way to auto retrieve the list of possible values

```typescript
import {JSONObject} from 'ts-json-object'

class Book extends JSONObject {
	@JSONObject.union(['children' , 'fiction' , 'reference'])
	@JSONObject.required
	genre: 'children' | 'fiction' | 'reference'
}

```

#### Custom validation

What if you need your own custom validation?   
Wouldn't it be easier to use a decorator for that?

```typescript
import {JSONObject} from 'ts-json-object'

class User extends JSONObject {
	@JSONObject.required
	name: string
	@JSONObject.validate( (user:User,key:string,value:string) => {
		// the user object already has the properties defined before this key ('name', in our case)
		const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
       if (!re.test(value)){
       	throw new TypeError(`User.${key} - invalid email address for user: ${user.name}`)
       }
	})
	@JSONObject.required
	email: string
}

```


#### Short notation

It's also possible to use a shorter notation:  
* `@required`, `@optional`, `@union`, `@map`, `@validate` instead of `@JSONObject.xxx`

```typescript
import {JSONObject, required, optional } from 'ts-json-object'

class Book extends JSONObject {
	
	@required
	@map('id')
	isbn:string
	
	@required
	name: string
	
	@optional 
	summary: string
}

```

#### Full decorator list

The table uses the short notation, but the long notation can be used as well by adding the `JSONObject.` prefix.

Decorator | Description
--- | ---
`@required` | Marks a property as required
`@optional` | Marks a property as optional
`@map(key:string)` | Maps a property to the json `key`
`@validate(validator:(object:T,key:string,value:V)=>void)` | Runs a custom validation code on your property
`@gt(n:number)` | Runs a `greater than` validation on the json value, for example: `@gt(5)` would mean the json value must be greater than 5
`@gte(n:number)` | Runs a `greater than or equal` validation on the json value
`@lt(n:number)` | Runs a `less than` validation on the json value
`@lte(n:number)` | Runs a `less than or equal` validation on the json value
`@eq(v:any)` | Runs a `equal to` validation on the json value (does not require a numeric type)
`@ne(v:any)` | Runs a `not equal to` validation on the json value (does not require a numeric type)

* It is possible to mix comparison operators, the following example will create a range and exclude a single value

```typescript
@required
@gte(5)
@ne(8)
@lte(10)
value:number // number is validated as between 5 to 10 (inclusive) but not 8
```

### I found something, or want to contribute

Cool!  
Let me know.

## Notes

* **Important**
Properties that were not annonated will _not_ be loaded.
* The annonation code runs when your module is loaded, and the runtime checks run when your object constructor is running
* Doesn't work on interfaces because typescript decorators don't work on interfaces, classes are required, and must subclass `JSONObject`.