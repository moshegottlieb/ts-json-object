![Node.js CI](https://github.com/moshegottlieb/ts-json-object/workflows/Node.js%20CI/badge.svg)

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

* Add it to your project - `npm install ts-json-object`
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
b2.summary === undefined
// This will throw a TypeError, as 'name' is required
let book:Book = new Book({ summary: "Once upon a time" })
// This will throw a TypeError, as 'name' must be a string
let book:Book = new Book({ name: 12345 } )

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
(book2.author instanceof Author) == true
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
book.title == 'A great title!' // mapped from 'name'

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

#### Custom assignment

Sometimes you need to mutate the json values a bit, possibly based on other values.  
Use `@custom` for that

```typescript
import {JSONObject} from 'ts-json-object'

class User extends JSONObject {
    @JSONObject.required
    specie:string
    @JSONObject.custom( (user:User,key:string,value:number) => {
        // Translate to dog years if needed, using previously defiend values
        return (user.specie == 'Canine')? value*7 : value
        // Note that user.name is not yet defined!
    })
    @JSONObject.required
    age: number
    @JSONObject.required
    name:string
}

let user1 = new User({ specie : 'Homo Sapiens', age: 28, name: 'Bob' })
user1.age == 28
let user2 = new User({ specie : 'Canine', age: 4, name: 'Fido' })
user2.age == 28
```

An even nicer trick would be to add a calculated value:

```typescript
import {JSONObject} from 'ts-json-object'

class User extends JSONObject {
    @JSONObject.required
    specie:string
    @JSONObject.custom( (user:User,key:string,value:number) => {
        // Translate to dog years if needed, using previously defiend values
        user.realAge = (user.specie == 'Canine')? value*7 : value
        return value
    })
    @JSONObject.required
    age: number
    realAge:number // No notation, do not assign this property from the json object
    @JSONObject.required
	name:string
}

let user1 = new User({ specie : 'Homo Sapiens', age: 28, name: 'Bob' })
user1.realAge == 28
let user2 = new User({ specie : 'Canine', age: 4, name: 'Fido' })
user2.realAge == 28
```


#### Custom validation

What if you need your own custom validation?   
Wouldn't it be easier to use a decorator for that?

```typescript
import {JSONObject} from 'ts-json-object'

class User extends JSONObject {
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


#### Passthrough

You can also use `@passthrough` to omit built in type checks.  
In this case, the json value will be stored in your property without verifying it's type (will be considered as `any`).  

```typescript
import {JSONObject} from 'ts-json-object'

// The value is optional by default
class Person extends JSONObject {
	@JSONObject.passthrough
	info: any
}

let p = new Person({ info: { anything : goes }})

// You can still specify all constraints, only the type is not checked
class Person extends JSONObject {
	@JSONObject.passthrough
	@JSONObject.required
	@JSONObject.eq('secret')
	info: any
}
let p = new Person({ info: 'secret' }) // ok
let p = new Person({ info: 'not so secret' }) // error, @eq will fail
let p = new Person({}) // error, info is required

```

#### Default values

Specify a default value by providing a default value to `@JSONObject.optional`

```typescript
import {JSONObject, optional } from 'ts-json-object'

class Car extends JSONObject {
	@JSONObject.optional(false)
	electric:boolean
}
let electric_car = new Car({electric:true}) // provide a value
electric_car.electric == true
let carbon_emitting_car = new Car({}) // use a default value
carbon_emitting_car.electric === false
```


#### Arrays

Arrays aren't really supprted by typescript type information.  
However, we would not be very helpful if arrays weren't supported, right?  
The `@JSONObject.array(type)` decorator is here to help!  
If you need an array of `string`, `boolean` or other primitieves, use the wrapper objects for these types:  
For string, use `String` etc.  
The actual property can still be the primitive type (`string[]`, `Array<string>`, but `String[]` would work too).  

```typescript
class Element extends JSONObject {
	@optional
	x?:number
}
class ArrayTest extends JSONObject {
    @required
    @array(Element)
    a:Array<Element>
    @optional
    @array(String)
    b:string[]
}
let json = {a:[{x:2},{}], b:['Fox','Cat']}
let arrayTest = new ArrayTest(json)
arrayTest.a[0] instanceof Element
arrayTest.a[0].x == 2
arrayTest.a[1].x === undefined
arrayTest.a.length == 2
arrayTest.b.length == 2
arrayTest.b[0] == 'Fox'
arrayTest.b[1] == 'Cat'
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
`@optional(value)` | Marks a property as optional and sets a default value
`@passthrough` | Skips type checks (optional by default)
`@map(key:string)` | Maps a property to the json `key`
`@union(values:Array<any>)` | Validates the json key is one of the values specified in the `values` arrays
`@array(Type)` | Specify the type of the array element (optional by default)
`@custom(code:(object:T,key:string,value:V)=>V)` | Runs a custom code segment and allows custom manipulation on the JSON value
`@validate(validator:(object:T,key:string,value:V)=>void)` | Runs a custom validation code on your property
`@integer` | Validates the value is an integer and not a floating point value, implies @optional
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

#### Limitations

**Generics are not supported**

Unfortunately, typescript doesn't pass the correct runtime information for generics.  

```typescript
class Generic<T> extends JSONObject {
        @required
        value:T
}
// Won't work as typescript will always pass `Object` as the type information for T, no matter how we generalize it
let g:Generic<number> = new Generic({value:8})
```

### I found something, or want to contribute

Cool!  
Let me know.

## Notes

* **Known issues**
  * It looks like there's an [issue](../../issues/2) with **react** apps built with something like `npx create-react-app my-app --typescript`

* **Important**
  * Properties that were not annonated will _not_ be loaded.
  * If you plan to use `--strictPropertyInitialization` or set it in your `tsconfig.json` file, make sure you add the ts linter annonations: `// @ts-ignore` to your properties, as typescript does not know how your properties are initialized - otherwise you'd see the compilation error:
`Property 'propertyNameHere' has no initializer and is not definitely assigned in the constructor.  TS2564`  
Typescript doesn't have built in support for this.  
This is similar to **swift**'s built in codable support - which doesn't exist in typescript, unfortunately.
  * The annonation code runs when your module is loaded, and the runtime checks run when your object constructor is running
  * Doesn't work on interfaces because typescript decorators don't work on interfaces, classes are required, and must subclass `JSONObject`.
