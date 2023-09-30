import {z, ZodType, ZodTypeAny} from "zod";


export type LastInTuple<T extends any[]> = T extends [...args: any[], last: infer Last] ? Last : never;
type DropLastInTuple<T extends any[]> = T extends [...args: infer U, rest: any[]] ? U : T;

export type ExtractAckArgs<T extends EventArguments, AckArgs = LastInTuple<T>> = AckArgs extends ZodTypeAny[]
    ? {
        [Index in keyof AckArgs]: AckArgs[Index] extends ZodTypeAny ? z.infer<AckArgs[Index]> : never
    } & {length: AckArgs['length']}
    : never
type ResolveZodTuple<T extends ZodTypeAny[]> = {
    [Index in keyof T]: z.infer<T[Index]>;
} & {length: T['length']}

type ResolveToCallback<T extends any[]> = (...args: T) => void;

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
    clientToServer: CtoS | {},
    serverToClient: StoC | {},
    serverToServer: StoS | {}
}

export type ZodCollection = {
    [key: string]: EventArguments;
}

export type ExtractZodCollection<Event extends Partial<EventCategories>, Name extends keyof EventCategories> =
    Event[Name] extends ZodCollection ? Event[Name] : ZodCollection

type EventArguments = [...ZodTypeAny[]] | [...ZodTypeAny[], [...ZodTypeAny[]]];
