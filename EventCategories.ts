import {ZodTypeAny} from "zod";

export type ZodCollection = {
    [key: string]: ZodTypeAny
}

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