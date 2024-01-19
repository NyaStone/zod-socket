import { z, ZodAny, ZodTypeAny } from "zod";

type RecursiveParamResoluion<
        Args extends readonly ZodAny[], 
        Callback extends readonly any[] = []
    > = 
        Args['length'] extends 0
            ? Callback
            : [
                Args[0] extends ZodTypeAny ? z.infer<Args[0]> : never,
                ...RecursiveParamResoluion<
                    Args extends readonly [first : any, rest: infer Rest] 
                        ? Rest extends readonly ZodAny[] ? Rest : never
                        : never,
                    Callback
                >    
            ];

export type EventCallback<Schema extends EventSchema<any, any, any>> = Schema extends EventSchema<any, infer Params, infer AckParams>
            ? AckParams['length'] extends 0
                ? (...args: RecursiveParamResoluion<Params>) => void
                : (...args: [...RecursiveParamResoluion<Params>, 
                    (...ackArgs: RecursiveParamResoluion<AckParams>) => void
                ]) => void
            : never;

export class EventSchema<
        Name extends string, 
        Params extends readonly ZodAny[],
        AckParams extends readonly ZodAny[],
    > {
    name: Name;
    params: Params;
    ackParams: AckParams;

    new<Name extends string>(name: Name): EventSchema<Name, [], []> {
        return new EventSchema(name, [], []);
    }

    private constructor(name: Name, params: Params, ackParams: AckParams) {
        this.params = params;
        this.name = name;
        this.ackParams = ackParams;
    }

    addParam<T extends ZodAny>(validator: T): EventSchema<Name, [...Params, T], AckParams> {
        return new EventSchema(this.name, [...this.params, validator], this.ackParams);
    }

    addAckParam<T extends ZodAny>(validator: T): EventSchema<Name, Params, [...AckParams, T]> {
        return new EventSchema(this.name, this.params, [...this.ackParams, validator]);
    }

    validate(...payload: RecursiveParamResoluion<Params> ): void {
        if (payload.length !== this.params.length) throw new Error('Validation Error: Incorrect number of arguments');
        
        this.params.forEach((validator, i) => {
            if (!validator.parse(payload[i])) throw new Error(`Validation Error: Failed to parse argument number ${i}`);
        })
    }
}