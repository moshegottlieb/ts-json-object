import {JSONObject, required,optional, union, map, gt, lt , gte, lte, eq, ne, validate, custom, passthrough, integer, array } from '../src/index'
import {strict as assert} from 'assert'

type TestFn = ()=>(void | Promise<void>)
interface TestObject {
    name:string
    run:TestFn
}
type Tests = Array<TestObject>

const CLEAR = "\x1b[0m"
const BOLD = "\x1b[1m"
const FAIL = "\x1b[31m"
const OK = "\x1b[32m"
const RUN = "\x1b[33m"


class Test {
    constructor(tests:Tests){
        this._tests = tests
    }

    async run(){
        
        const COUNT = '' + this._tests.length
        // Find max name length for preattier printing
        let name_len = 0
        for (let i=0;i<this._tests.length;++i){
            let test = this._tests[i]
            name_len = Math.max(test.name.length,name_len)
        }
        for (let i=0;i<this._tests.length;++i){
            let test = this._tests[i]
            process.stdout.write(`[${(''+(i+1)).padStart(COUNT.length)}/${COUNT} ${RUN}${test.name.padEnd(name_len)}${CLEAR}] - ${BOLD}`)
            try {
                let ret = test.run()
                if (ret instanceof Promise){
                    let wait = async (promise:Promise<void>)=>{
                        return promise
                    }
                    await wait(ret)
                }
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
    {
        name:'required',
        run:()=>{
            class Book extends JSONObject {
                @JSONObject.required
                name:string
            }
            const title = 'Moby Dick'
            let book:Book = new Book({ name: title })
            assert.ok(book.name == title)
            assert.throws(()=>{
                // Name is required
                let book = new Book
            })
        }
    },
    {
        name:'type',
        run:()=>{
            class Book extends JSONObject {
                @JSONObject.required
                name:string
            }
            const title = 'Moby Dick'
            let book:Book = new Book({ name: title })
            assert.ok(book.name == title)
            assert.throws(()=>{
                // Wrong type for name
                let book = new Book({ name: 12345 } )
            })
        }
    },
    {
        name:'optional',
        run:()=>{
        class Book extends JSONObject {
            @JSONObject.optional
            name:string
        }
        const title = 'Moby Dick'
        let book1:Book = new Book({ name: title })
        assert.ok(book1.name == title)
        let book2:Book = new Book
        assert.ok(book2.name == undefined)
    }},
    {
        name:'recursive',
        run:()=>{        
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
    }},
    {
        name:'unannonated',
        run:()=>{
        class Person extends JSONObject {
            id:number
        }
        let p = new Person({id: 10})
        assert.ok(p.id === undefined)
    }},
    {
        name:'lt-gt-ne',
        run:()=>{
        class Person extends JSONObject {
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
        assert.ok(p.id == 7)
    }},
    {
        name:'lte',
        run:()=>{
        class Person extends JSONObject {
            @lte(5)
            id:number
        }
        assert.throws(()=>{
            let p = new Person({id: 6})
        })
        let p1 = new Person({id: 5})
        assert.ok(p1.id == 5)
        let p2 = new Person({id: 4})
        assert.ok(p2.id == 4)
    }},
    {
        name:'gte',
        run:()=>{
        class Person extends JSONObject {
            @gte(5)
            id:number
        }
        assert.throws(()=>{
            let p = new Person({id: 4})
        })
        let p1 = new Person({id: 5})
        assert.ok(p1.id == 5)
        let p2 = new Person({id: 6})
        assert.ok(p2.id == 6)
    }},
    {
        name:'eq',
        run:()=>{
        class Person extends JSONObject {
            @eq(10)
            id:number
        }
        assert.throws(()=>{            
            let p = new Person({id: 11})
        })
        let p = new Person({id: 10})
        assert.ok(p.id == 10)
    }},
    {
        name:'validate',
        run:()=>{
        class Person extends JSONObject {
            @validate((person:Person,key:string,value:number)=>{
                if (value < 8) throw new Error()
            })
            id:number
        }
        let p = new Person({id : 10})
        assert.ok(p.id == 10)
        assert.throws(()=>{
            let p = new Person({ id: 7 })
        })
    }},
    {
        name:'custom',
        run:()=>{
            class User extends JSONObject {
                @required
                specie:string
                @custom( (user:User,key:string,value:number) => {
                    // Translate to dog years if needed, using previously defiend values
                    return (user.specie == 'Canine')? value*7 : value
                    // Note that user.name is not yet defined!
                })
                @required
                age: number
                @required
                name:string
            }
            
            let user1 = new User({ specie : 'Homo Sapiens', age: 28, name: 'Bob' })
            assert.ok(user1.age == 28)
            let user2 = new User({ specie : 'Canine', age: 4, name: 'Fido' })
            assert.ok(user2.age == 28)
        }
    },
    {
        name: 'custom assign',
        run:()=>{
            class User extends JSONObject {
                @required
                specie:string
                @custom( (user:User,key:string,value:number) => {
                    // Translate to dog years if needed, using previously defiend values
                    user.realAge = (user.specie == 'Canine')? value*7 : value
                    return value
                })
                @required
                age: number
                realAge:number // No notation, do not assign this property from the json object
                @required
                name:string
            }
            
            let user1 = new User({ specie : 'Homo Sapiens', age: 28, name: 'Bob' })
            assert.ok(user1.age == 28)
            assert.ok(user1.realAge == 28)
            let user2 = new User({ specie : 'Canine', age: 4, name: 'Fido' })
            assert.ok(user2.age == 4)
            assert.ok(user2.realAge == 28)
        }
    },
    {
        name:'union',
        run:()=>{
        class Person extends JSONObject {
            @required
            @union([1,2,3,4,5])
            id:number
        }
        for (let i=1;i<=5;++i){
            let p = new Person({id : i})
            assert.ok(p.id == i)
        }
        assert.throws(()=>{
            let p = new Person({ id: 6 })
        })
    }},
    {
        name:'map',
        run:()=>{
        const title = 'Moby Dick'
        class Book extends JSONObject {
            @map('title')
            name:string
        }
        let book = new Book({ title: title })
        assert.ok(book.name == title)
        assert.throws(()=>{
            // Make 'name' required, make sure this fails
            class Book extends JSONObject {
                @map('title')
                @required
                name:string
            }
            let book = new Book({ name: title })
        })
    }},
    {
        name:'passthrough',
        run:()=>{
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
        assert.ok(car3.userManual.pages[0] == 'page1')
        assert.ok(car3.userManual.pages[1] == 'page2')
    }},
    {
        name:'default',
        run:()=>{
        class Car extends JSONObject {
            @optional(false)
            electric:boolean
        }
        let electric_car = new Car({electric:true})
        assert.ok(electric_car.electric)
        let carbon_emitting_car = new Car({})
        assert.ok(carbon_emitting_car.electric === false)
    }},
    {
        name:'integer',
        run:()=>{
        class Int extends JSONObject {
            @integer
            value:number
        }
        let i = new Int({ value: 13 })
        assert.throws(()=>{
            let i = new Int({ value: 13.4 })
        })
    }},
    {
        name:'array_simple',
        run:()=>{
        class SimpleArrayTest extends JSONObject {
            @array(String)
            strings:[string]
            @array(Number)
            numbers:[number]
        }
        let sa1 = new SimpleArrayTest({ strings: ['a','b','c']})
        assert.throws(()=>{
            let sa2 = new SimpleArrayTest({ strings: [1,2,3]})
        })
        let sa2 = new SimpleArrayTest({ numbers: [1,2,3]})
        assert.throws(()=>{
            let sa2 = new SimpleArrayTest({ numbers: ['a','b','c']})
        })
    }},
    {
        name:'array_object',
        run:()=>{
        class Element extends JSONObject {
            @optional
            x?:number
        }
        class ArrayTest extends JSONObject {
            @array(Element)
            a:Array<Element>
        }
        let json = {a:[{x:2},{}]}
        let arrayTest = new ArrayTest(json)
        assert.ok(arrayTest.a[0] instanceof Element)
        assert.ok(arrayTest.a[0].x == 2)
        assert.ok(arrayTest.a[1].x === undefined)
        assert.ok(arrayTest.a.length == 2)
    }},
    {
        name:'array_passthrough',
        run:()=>{
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
    }},
    {
        name:'inheritance',
        run:()=>{
        // Simply type
        class Base extends JSONObject {
            @required
            a:number
        }
        class Sub extends Base {
            @required
            b:number
        }
        let s = new Sub({a:1, b:2})
        assert.ok(s.a == 1)
        assert.ok(s.b == 2)
    }},
    {
        name:'Date',
        run:()=>{
        // Simply type
        class DateTest extends JSONObject {
            @required
            date:Date
        }
        let test = new DateTest({date:1})
        assert.ok(Date.prototype.isPrototypeOf(test.date))
    }},
])
test.run()