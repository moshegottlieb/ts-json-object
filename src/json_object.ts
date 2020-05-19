import 'reflect-metadata'


let __optional = Symbol('optional')
let __keys = Symbol('keys')
let __mapping = Symbol('mapping')
let __union = Symbol('union')
let __code = Symbol('code')
let __gt = Symbol('gt')
let __lt = Symbol('lt')
let __eq = Symbol('eq')
let __ne = Symbol('ne')
let __gte = Symbol('gte')
let __lte = Symbol('lte')
let __default = Symbol('default')
let __passthrough = Symbol('passthrough')
let __integer = Symbol('integer')
let __array = Symbol('array')
let __custom = Symbol('custom')

type Validator = (object:any,key:string,value:any) => void | any

export class JSONTypeError extends TypeError {}

export class JSONObject extends Object{


    private newValue(value:any,design_type:any,key:string){
        if (typeof value == 'object'){
            if (Array.isArray(value)){
                let array_meta = Reflect.hasMetadata(__array,this,key) ? Reflect.getMetadata(__array,this,key) : null
                if (array_meta && value.length){
                    let ret = Array()
                    for (let i=0;i<value.length;++i){
                        let e = value[i]
                        let new_e:any
                        if (typeof e == 'object'){
                            if (Array.isArray(e)){ // (at least) 2 dim array, throw an unsupported error
                                throw new JSONTypeError(`${this.constructor.name}.${key}: array type cannot be array, consider using @passthrough and @validate`)
                            }
                            new_e = new array_meta(e)
                        } else {
                            new_e = array_meta(e)
                        }
                        let expected_type = typeof e
                        let value_type = typeof new_e
                        if (expected_type != value_type){
                            throw new JSONTypeError(`${this.constructor.name}.${key} array element requires type '${expected_type}', got '${value_type}' instead`)
                        }
                        ret.push(new_e)
                    }
                    return ret
                } else {
                    return value
                }
                
            } else {
                return new design_type(value)
            }
        } else if (design_type.name == 'Date'){
            return new design_type(value)
        } else {
            return design_type(value)
        }            
    }

    private set(key:string,value:any){
        let new_value:any
        let design_type = Reflect.getMetadata("design:type",this,key)
        if (Reflect.hasMetadata(__union,this,key)){
            let values = <Array<any>>(Reflect.getMetadata(__union,this,key))
            let is_valid = false
            for (let i=0;i<values.length && !is_valid;++i){
                if (value === values[i]){
                    is_valid = true
                }
            }
            if (!is_valid){
                throw new JSONTypeError(`${this.constructor.name}.${key} requires one of the following values:[${values}], got '${value}' instead`)
            }
        }
        if (Reflect.hasMetadata(__passthrough,this,key) && Reflect.getMetadata(__passthrough,this,key) == true){
            new_value = value
        } else {
            new_value = this.newValue(value,design_type,key)
            // If not date
            if (design_type.name == 'Date'){
                if (!Date.prototype.isPrototypeOf(new_value)){
                    throw new JSONTypeError(`${this.constructor.name}.${key} requires a type that can be converted to a date, got '${typeof value}' instead`)
                }
            } else {
                let expected_type = typeof new_value
                let value_type = typeof value
                if (expected_type != value_type){
                    throw new JSONTypeError(`${this.constructor.name}.${key} requires type '${expected_type}', got '${value_type}' instead`)
                }
            }
        }
        // Run custom assignment if exists
        if (Reflect.hasMetadata(__custom,this,key)){
            let code = <Validator>(Reflect.getMetadata(__custom,this,key))
            let ret = code(this,key,new_value)
            if (ret !== undefined) new_value = ret
        }
        // Run validations if exists
        let symbols = [__code,__gt,__gte,__eq,__ne,__lt,__lte]
        for (let symbol of symbols){
            if (Reflect.hasMetadata(symbol,this,key)){
                let code = <Validator>(Reflect.getMetadata(symbol,this,key))
                code(this,key,new_value)
            }
        }
        // Run integer validator
        if (Reflect.hasMetadata(__integer,this,key)){
            this.validateNumeric(key,new_value)
            if (new_value != Math.floor(new_value)){
                throw new JSONTypeError(`${this.constructor.name}.${key} should be an integer value, got ${new_value} instead`)
            }
        }
        (<any>this)[key] = new_value
    }

    private get(key:string) : any{
        return (<any>this)[key]
    }

    constructor(json?:any){
        super()
        if (json === undefined){
            json = {}
        }
        let json_keys = JSONObject.jsonKeys(this)
        if (!json_keys) return // no properties defined
        for (let key of JSONObject.jsonKeys(this)){
            let json_value:any
            let json_key:string
            // Is there a mapping this value?
            if (Reflect.hasMetadata(__mapping,this,key)){
                json_key = Reflect.getMetadata(__mapping,this,key)
            } else {
                json_key = key
            }
            json_value = json[json_key]
            // Is there a default?
            if (json_value === undefined){
                json_value = Reflect.getMetadata(__default,this,key)
            }
            // Still undefined?
            if (json_value === undefined){
                if (this.get(key) === undefined && !JSONObject.isOptional(this,key) ) {
                    throw new JSONTypeError(`${this.constructor.name}.${key} is required`)
                }
            } else {
                this.set(key,json_value)
            }
        }
    }

    static metadata(symbol:Symbol,value:any){
        let meta = Reflect.metadata(symbol,value)
        let ret = (target:any,key:any)=>{
            JSONObject.preprocess(target,key)
            meta(target,key)
        }
        return ret
    }

    static custom(code:(object:any,key:string,value:any)=>any){
        return JSONObject.metadata(__custom,code)
    }

    static validate(code:(object:any,key:string,value:any)=>void){
        return JSONObject.metadata(__code,code)
    }

    static union<T>(values:Array<T>){
        return JSONObject.metadata(__union,values)
    }

    static map(newKey:string){
        return JSONObject.metadata(__mapping,newKey)
    }

    private static isOptional(target:any,key:string){
        let ret = Reflect.getMetadata(__optional,target,key)
        return ret == true || ret === undefined
    }

    private static jsonKeys(target:any){
        return Reflect.getMetadata(__keys,target)
    }

    private static preprocess(target:any,key:string){
        let keys:Array<string>
        if (Reflect.hasMetadata(__keys,target)){
            keys = Reflect.getMetadata(__keys,target)
        } else {
            keys = Array<string>()
            Reflect.defineMetadata(__keys,keys,target)
        }
        if (!keys.length || keys[keys.length - 1] != key){
            keys.push(key)    
        }
    }

    private validateNumeric(key:string,value:any){
        if (typeof value !== 'number'){
            throw new JSONTypeError(`${this.constructor.name}.${key}: requires numeric type for validation operators`)
        }
    }

    static array(type:Function){
        return JSONObject.metadata(__array,type)
    }

    static integer(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__integer,true,target,key)
    }

    public static gt(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue > capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} > ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__gt,validator)
    }

    public static gte(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue >= capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} >= ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__gte,validator)
    }
    public static lt(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue < capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} < ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__lt,validator)
    }
    public static lte(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue <= capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} <= ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__lte,validator)
    }
    public static eq(value:any){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            if (!(jsonValue == capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} == ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__eq,validator)
    }
    public static ne(value:any){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            if (!(jsonValue != capture)){
                throw new JSONTypeError(`${object.constructor.name}.${key}: ${jsonValue} != ${capture} requirement failed`)
            }
        }
        return JSONObject.metadata(__ne,validator)
    }

    public static passthrough(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__passthrough,true,target,key)
    }


    public static required(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__optional,false,target,key)
    }

    public static optional(target:any,key?:string) : void | any{
        if (key === undefined){
            let meta = Reflect.metadata(__default,target)
            let ret = (target:any,key:any)=>{
                JSONObject.optional(target,key) // Make it optional
                meta(target,key)
            }
            return ret
        } else {
            JSONObject.preprocess(target,key)
            Reflect.defineMetadata(__optional,true,target,key)    
        }
    }

}

export function validate(code:(object:any,key:string,value:any)=>void){
    return JSONObject.validate(code)
}

export function custom(code:(object:any,key:string,value:any)=>any){
    return JSONObject.custom(code)
}

export function union<T>(values:Array<T>){
    return JSONObject.union(values)
}

export function required(target:any,key:string){
    JSONObject.required(target,key)
}
export function optional(target:any,key?:string):void | any{
    if (key === undefined) {
        return JSONObject.optional(target,key)
    } else {
        JSONObject.optional(target,key)
    }
}
export function map(jsonKey:string){
    return JSONObject.map(jsonKey)
}

export function passthrough(target:any,key:string){
    return JSONObject.passthrough(target,key)
}

export function integer(target:any,key:string){
    return JSONObject.integer(target,key)
}

export function gt(value:number){
    return JSONObject.gt(value)
}
export function gte(value:number){
    return JSONObject.gte(value)
}
export function lt(value:number){
    return JSONObject.lt(value)
}
export function lte(value:number){
    return JSONObject.lte(value)
}
export function eq(value:any){
    return JSONObject.eq(value)
}
export function ne(value:any){
    return JSONObject.ne(value)
}
export function array(value:any){
    return JSONObject.array(value)
}