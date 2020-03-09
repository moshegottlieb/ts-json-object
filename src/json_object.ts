import 'reflect-metadata'


let __optional = Symbol('optional')
let __keys = Symbol('keys')
let __mapping = Symbol('mapping')
let __union = Symbol('union')

export class JSONObject extends Object{

    private set(key:string,value:any){
        if (typeof value == 'object'){
            (<any>this)[key] = new (Reflect.getMetadata("design:type",this,key))(value)
        } else {
            if (Reflect.hasMetadata(__union,this,key)){
                let values = <Array<any>>(Reflect.getMetadata(__union,this,key))
                let is_valid = false
                for (let i=0;i<values.length && !is_valid;++i){
                    if (values === values[i]){
                        is_valid = true
                    }
                }
                if (!is_valid){
                    throw new TypeError(`${this.constructor.name}.${key} requires one of the following values:\n${values}\n, Got ${value} instead`)
                }
            }
            let computed = Reflect.getMetadata("design:type",this,key)(value)
            let computed_type = typeof computed
            let value_type = typeof value
            if (computed_type == value_type){
                (<any>this)[key] = Reflect.getMetadata("design:type",this,key)(value)
            } else {
                throw new TypeError(`${this.constructor.name}.${key} requires type '${computed_type}', got '${value_type}' instead`)
            }
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

    static union<T>(values:Array<T>){
        return Reflect.metadata(__mapping,values)
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

    public static required(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__optional,false,target,key)
    }

    public static optional(target:any,key:string){
        JSONObject.preprocess(target,key)
        Reflect.defineMetadata(__optional,true,target,key)
    }

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
