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
let __passthrough = Symbol('passthrough')

type Validator = (object:any,key:string,value:any) => void

export class JSONObject extends Object{

    private set(key:string,value:any){
        let new_value:any
        if (typeof value == 'object'){
            new_value = new (Reflect.getMetadata("design:type",this,key))(value)
        } else {
            if (Reflect.hasMetadata(__union,this,key)){
                let values = <Array<any>>(Reflect.getMetadata(__union,this,key))
                let is_valid = false
                for (let i=0;i<values.length && !is_valid;++i){
                    if (value === values[i]){
                        is_valid = true
                    }
                }
                if (!is_valid){
                    throw new TypeError(`${this.constructor.name}.${key} requires one of the following values:[${values}], got '${value}' instead`)
                }
            }
            if (Reflect.hasMetadata(__passthrough,this,key) && Reflect.getMetadata(__passthrough,this,key) == true){
                new_value = value
            } else {
                let expected = Reflect.getMetadata("design:type",this,key)(value)
                let expected_type = typeof expected
                let value_type = typeof value
                if (expected_type == value_type){
                    new_value = Reflect.getMetadata("design:type",this,key)(value)
                } else {
                    throw new TypeError(`${this.constructor.name}.${key} requires type '${expected_type}', got '${value_type}' instead`)
                }    
            }
            let symbols = [__code,__gt,__gte,__eq,__ne,__lt,__lte]
            for (let symbol of symbols){
                if (Reflect.hasMetadata(symbol,this,key)){
                    let code = <Validator>(Reflect.getMetadata(symbol,this,key))
                    code(this,key,new_value)
                }
            }
            (<any>this)[key] = new_value
        }
    }

    private get(key:string) : any{
        return (<any>this)[key]
    }

    constructor(json:any){
        super()
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
            if (json_value === undefined){
                if (this.get(key) === undefined && !JSONObject.isOptional(this,key)) {
                    throw new TypeError(`${this.constructor.name}.${key} is required`)
                }
            } else {
                this.set(key,json_value)
            }
        }
    }

    static validate(code:(object:any,key:string,value:any)=>void){
        return Reflect.metadata(__code,code)
    }

    static union<T>(values:Array<T>){
        return Reflect.metadata(__union,values)
    }

    static map(newKey:string){
        return Reflect.metadata(__mapping,newKey)
    }

    private static isOptional(target:any,key:string){
        return Reflect.getMetadata(__optional,target,key)
    }

    private static jsonKeys(target:any){
        return Reflect.getMetadata(__keys,target)
    }

    private static preprocess(target:any,key:string){
        let optional = this.isOptional(target,key)
        if (optional !== undefined){
            throw new SyntaxError(`Cannot mark ${target.constructor.name} as required, already set as ${optional ? 'optional' : 'required'}`)
        }
        let keys:Array<string>
        if (Reflect.hasMetadata(__keys,target)){
            keys = Reflect.getMetadata(__keys,target)
        } else {
            keys = Array<string>()
            Reflect.defineMetadata(__keys,keys,target)
        }
        keys.push(key)
    }

    private validateNumeric(key:string,value:any){
        if (typeof value !== 'number'){
            throw new TypeError(`${this.constructor.name}.${key}: requires numeric type for comparison operators`)
        }
    }

    public static gt(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue > capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} > ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__gt,validator)
    }

    public static gte(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue >= capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} >= ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__gte,validator)
    }
    public static lt(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue < capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} < ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__lt,validator)
    }
    public static lte(value:number){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            object.validateNumeric(key,jsonValue)
            if (!(jsonValue <= capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} <= ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__lte,validator)
    }
    public static eq(value:any){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            if (!(jsonValue == capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} == ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__eq,validator)
    }
    public static ne(value:any){
        let capture = value
        let validator = function (object:JSONObject,key:string,jsonValue:any) : void {
            if (!(jsonValue != capture)){
                throw new TypeError(`${object.constructor.name}.${key}: ${jsonValue} != ${capture} requirement failed`)
            }
        }
        return Reflect.metadata(__ne,validator)
    }

    public static passthrough(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__passthrough,true,target,key)
    }


    public static required(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__optional,false,target,key)
    }

    public static optional(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__optional,true,target,key)
    }

}

export function validate(code:(object:any,key:string,value:any)=>void){
    return JSONObject.validate(code)
}

export function union<T>(values:Array<T>){
    return JSONObject.union(values)
}

export function required(target:any,key:string){
    JSONObject.required(target,key)
}
export function optional(target:any,key:string){
    JSONObject.optional(target,key)
}
export function map(jsonKey:string){
    return JSONObject.map(jsonKey)
}

export function passthrough(target:any,key:string){
    return JSONObject.passthrough(target,key)
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
