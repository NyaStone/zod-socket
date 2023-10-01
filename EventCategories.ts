import {z, ZodType, ZodTypeAny} from "zod";


export type LastInTuple<T extends EventArguments> = T extends [...args: any[], last: infer Last] ? Last : never;
type DropLastInTuple<T extends EventArguments> = T extends [...args: infer U, rest: any[]] ? U : never;

export type ExtractAckArgs<T extends EventArguments> = LastInTuple<T> extends ZodTypeAny[]
    ? {
        [Index in keyof LastInTuple<T>]: LastInTuple<T>[Index] extends ZodTypeAny ? z.infer<LastInTuple<T>[Index]> : never
    } & {length: LastInTuple<T>['length']}
    : never
type ResolveZodTuple<T extends ZodTypeAny[]> = {
    [Index in keyof T]: z.infer<T[Index]>;
} & {length: T['length']}

export type ResolveToCallback<T extends any[]> = (...args: T) => void;

export type ResolveEvents<SchemaMap extends ZodCollection> =  {[key in keyof SchemaMap]: ResolveZodTypes<SchemaMap[key]>}

export type ResolveZodTypes<ZodTuple extends EventArguments> = 
ZodTuple extends ZodTypeAny[]
    ? ResolveToCallback<ResolveZodTuple<ZodTuple>>
    : DropLastInTuple<ZodTuple> extends ZodTypeAny[] 
        ? ResolveToCallback<[...ResolveZodTuple<DropLastInTuple<ZodTuple>>, ResolveToCallback<ExtractAckArgs<ZodTuple>>]>
        : never


export type EventCategories<
    CtoS extends ZodCollection = {},
    StoC extends ZodCollection = {},
    StoS extends ZodCollection = {}
> = {
    clientToServer: CtoS,
    serverToClient: StoC,
    serverToServer: StoS
}

export type ZodCollection = {
    [key: string]: EventArguments;
}

export type ExtractZodCollection<Event extends Partial<EventCategories>, Name extends keyof EventCategories> =
    Event[Name] extends ZodCollection ? Event[Name] : ZodCollection

type EventArguments = [...ZodTypeAny[]] | [...ZodTypeAny[], [...ZodTypeAny[]]];

