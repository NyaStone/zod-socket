import {z, ZodTypeAny} from "zod";

export type ZodCollection = {
    [key: string]: [...ZodTypeAny[]];
}

export type ResolveZodTypes<ZodTuple extends [...ZodTypeAny[]]> = {
    [Index in keyof ZodTuple]: z.infer<ZodTuple[Index]>;
} & {length: ZodTuple['length']}

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