import {Server as ServerIO, ServerOptions} from "socket.io";
import {Server as HttpServer} from "http";
import {Server as HttpsServer} from "https";
import { EventCategories, ResolveZodTypes, ZodCollection } from "./EventCategories";
import { z } from "zod";

export class Server< SocketData = {},
        Events extends Partial<EventCategories> = {},
        _ClientToServer extends ZodCollection = 
            Events extends { clientToServer: ZodCollection } ? Events['clientToServer'] : ZodCollection,
        _ServerToClient extends ZodCollection = 
            Events extends { serverToClient: ZodCollection } ? Events['serverToClient'] : ZodCollection,
        _ServerToServer extends ZodCollection = 
            Events extends { serverToServer: ZodCollection } ? Events['serverToServer'] : ZodCollection
        > 
    extends ServerIO<
        {[key in keyof _ClientToServer]: ResolveZodTypes<_ClientToServer[key]>},
        {[key in keyof _ServerToClient]: ResolveZodTypes<_ServerToClient[key]>},
        {[key in keyof _ServerToServer]: ResolveZodTypes<_ServerToServer[key]>},
        SocketData
    > 
    {

    private events: Events;
    private _superEmit: typeof this.emit;

    constructor(events: Events, httpServer: HttpServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, httpsServer: HttpsServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, port: number, opt?: Partial<ServerOptions>);
    constructor(events: Events, opt?: Partial<ServerOptions>);
    constructor(arg1: Events, arg2?, arg3?) {
        super(arg2, arg3);

        this.events = arg1;

        // overriding the emit method to typecheck incoming acknowledgement
        this._superEmit = this.emit;
        this.emit = (...args) => {
            return this._superEmit(...args);
        };

        // adding a middleware that will apply another middleware to all sockets
        this.use((socket, next) => {
            // adding a middleware to do type validation using the zod schema
            socket.use(([event, ...args], next) => {
                
                if (this.events.clientToServer && Object.keys(this.events.clientToServer).includes(event)) {
                    try {
                        for (let i = 0; i < this.events.clientToServer[event].length; i++) {
                            const zodArg = this.events.clientToServer[event][i];
                            if (!Array.isArray(zodArg)) // ignoring the callback
                                zodArg.parse(args[i]);
                        }
                        next();
                    }
                    catch (e) {
                        next(e);
                    }
                }
                else next();

            })
            next();
        });
    }
}