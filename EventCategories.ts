import {z, ZodType, ZodTypeAny} from "zod";

export type ZodCollection = {
    [key: string]: EventArguments;
}

type EventArguments = [...ZodTypeAny[], ZodTypeAny | [...ZodTypeAny[]]];

type LengthOfTuple<T extends any[]> = T extends { length: infer L } ? L : never;
type DropFirstInTuple<T extends any[]> = T extends [arg: any, ...rest: infer U] ? U : T;
type LastInTuple<T extends any[]> = T[LengthOfTuple<DropFirstInTuple<T>>];
type DropLastInTuple<T extends any[]> = T extends [rest: infer U, ...args: any[]] ? U : T;

type ExtractAckArgs<T extends EventArguments, AckArgs = LastInTuple<T>> = AckArgs extends ZodTypeAny[]
    ? {
        [Index in keyof AckArgs]: AckArgs[Index] extends ZodTypeAny ? z.infer<AckArgs[Index]> : never
    } & {length: AckArgs['length']}
    : never
type ResolveZodTuple<T extends ZodTypeAny[]> = {
    [Index in keyof T]: z.infer<T[Index]>;
} & {length: T['length']}

type ResolveToCallback<T extends any[]> = (...args: T) => void;

export type ResolveZodTypes<ZodTuple extends EventArguments,
                            ExcludeLast = DropLastInTuple<ZodTuple>> = 
ZodTuple extends ZodTypeAny[]
    ? ResolveToCallback<ResolveZodTuple<ZodTuple>>
    : ExcludeLast extends ZodTypeAny[] 
        ? ResolveToCallback<[...ResolveZodTuple<ExcludeLast>, ResolveToCallback<ExtractAckArgs<ZodTuple>>]>
        : never


export type DefaultCategories = {
    clientToServer: {},
    serverToClient: {},
    // serverToServer: {}
}

export type EventCategories = {
    clientToServer: ZodCollection,
    serverToClient: ZodCollection,
    // serverToServer: ZodCollection
}