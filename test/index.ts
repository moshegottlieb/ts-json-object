import {JSONObject, required,optional, union, map, gt, lt , gte, lte, eq, ne, validate, passthrough, integer, array } from '../src/index'
import {strict as assert} from 'assert'

type TestFn = ()=>void
type Tests = Array<TestFn >

class Test {
    constructor(tests:Tests){
        this._tests = tests
    }
    run(){
        const CLEAR = "\x1b[0m"
        const BOLD = "\x1b[1m"
        const FAIL = "\x1b[31m"
        const OK = "\x1b[32m"

        for (let i=0;i<this._tests.length;++i){
            process.stdout.write(`[${i+1}/${this._tests.length}] - ${BOLD}`)
            try {
                this._tests[i]()
                process.stdout.write(`${OK}OK`)
            } catch (error){
                process.stdout.write(`${FAIL}FAILED`)
            } finally {
                process.stdout.write(`${CLEAR}\n`)
            }
        }
    }
    private _tests:Tests
}

let test = new Test([
    ()=>{
        class Book extends JSONObject {
            @JSONObject.required
            name:string
            @JSONObject.optional
            summary?:string
        }
        const title = 'Moby Dick'
        const summary = "You're my obsession"
        let book:Book = new Book({ name: title , summary: summary })
        assert.ok(book.name == title)
        assert.ok(book.summary == summary)
        let b2:Book = new Book({ name: title }) // Also ok
        assert.ok(book.name == title)
        assert.ok(b2.summary === undefined)
        assert.throws(()=>{
            let book = new Book({ name: 12345 } )
        })
        assert.throws(()=>{
            let book = new Book({ summary: "Once upon a time" })
        })
    },
    ()=>{        
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
        const title = 'Moby Dick'
        const author = "Herman Melville"
        let book = new BookWithAuthor({ name: title, author: {name: author } })
        assert.ok(book.name == title)
        assert.ok(book.author.name == author)
        assert.ok(book.author instanceof Author)
    },
    ()=>{
        class Person extends JSONObject {
            id:number
        }
        let p = new Person({id: 10})
        assert.ok(p.id === undefined)
    },
    ()=>{
        class Person extends JSONObject {
            @required
            @lt(10)
            @gt(5)
            @ne(6)
            id:number
        }
        assert.throws(()=>{
            let p = new Person({id: 10})
        })
        assert.throws(()=>{
            let p = new Person({id: 5})
        })
        assert.throws(()=>{
            let p = new Person({id: 6})
        })
        let p = new Person({id: 7})
    },
    ()=>{
        class Person extends JSONObject {
            @lte(5)
            id:number
        }
        assert.throws(()=>{
            let p = new Person({id: 6})
        })
        let p1 = new Person({id: 5})
        let p2 = new Person({id: 4})
    },
    ()=>{
        class Person extends JSONObject {
            @gte(5)
            id:number
        }
        assert.throws(()=>{
            let p = new Person({id: 4})
        })
        let p1 = new Person({id: 5})
        let p2 = new Person({id: 6})
    },
    ()=>{
        class Person extends JSONObject {
            @required
            @eq(10)
            id:number
        }
        assert.throws(()=>{            
            let p = new Person({id: 11})
        })
        let p = new Person({id: 10})
    },
    ()=>{
        class Person extends JSONObject {
            @required
            @validate((person:Person,key:string,value:number)=>{
                if (value < 8) throw new Error()
            })
            id:number
        }
        let p = new Person({id : 10})
        assert.throws(()=>{
            let p = new Person({ id: 7 })
        })
    },
    ()=>{
        class Person extends JSONObject {
            @required
            @union([1,2,3,4,5])
            id:number
        }
        for (let i=1;i<=5;++i){
            let p = new Person({id : i})
        }
        assert.throws(()=>{
            let p = new Person({ id: 6 })
        })
    },
    ()=>{
        const title = 'Moby Dick'
        class Book extends JSONObject {
            @map('title')
            @required
            name:string
        }
        let book = new Book({ title: title })
        assert.ok(book.name == title)
        assert.throws(()=>{
            let book = new Book({ name: title })
        })
    },
    ()=>{
        class Car extends JSONObject {
            @passthrough
            userManual:any
        }
        let car = new Car({})
        assert.ok(car.userManual === undefined)
        let car2 = new Car({ userManual: '12345'})
        assert.ok(car2.userManual == '12345')
        let car3 = new Car({ userManual : {
            pages : ['page1','page2']
        }})
        assert.ok(car3.userManual.pages[1] == 'page2')
    },
    ()=>{
        class Car extends JSONObject {
            @optional(false)
            electric:boolean
        }
        let electric_car = new Car({electric:true})
        assert.ok(electric_car.electric)
        let carbon_emitting_car = new Car({})
        assert.ok(carbon_emitting_car.electric === false)
    },
    ()=>{
        class Int extends JSONObject {
            @required
            @integer
            value:number
        }
        let i = new Int({ value: 13 })
        assert.throws(()=>{
            let i = new Int({ value: 13.4 })
        })
    },
    ()=>{
        class Element extends JSONObject {
            @optional
            x?:number
        }
        class ArrayTest extends JSONObject {
            @required
            @array(Element)
            a:Array<Element>
        }
        let json = {a:[{x:2},{}]}
        let arrayTest = new ArrayTest(json)
        assert.ok(arrayTest.a[0] instanceof Element)
        assert.ok(arrayTest.a[0].x == 2)
        assert.ok(arrayTest.a[1].x === undefined)
        assert.ok(arrayTest.a.length == 2)
    },
    ()=>{
        // Simply type
        class ArrayTest extends JSONObject {
            @required
            a:Array<any>
        }
        let json = {a:[{x:2},{}]}
        let arrayTest = new ArrayTest(json)
        assert.ok(arrayTest.a[0].x == 2)
        assert.ok(arrayTest.a[1].x === undefined)
        assert.ok(arrayTest.a.length == 2)
    }
])
test.run()

// Summary is undefined
// This will throw a TypeError, as 'name' is required

