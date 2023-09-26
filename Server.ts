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
        {[key in keyof _ClientToServer]: (...args: ResolveZodTypes<_ClientToServer[key]>) => void},
        {[key in keyof _ServerToClient]: (...args: ResolveZodTypes<_ServerToClient[key]>) => void},
        {[key in keyof _ServerToServer]: (...args: ResolveZodTypes<_ServerToServer[key]>) => void},
        SocketData
    > 
    {

    private events: Events;

    constructor(events: Events, httpServer: HttpServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, httpsServer: HttpsServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, port: number, opt?: Partial<ServerOptions>);
    constructor(events: Events, opt?: Partial<ServerOptions>);
    constructor(arg1: Events, arg2?, arg3?) {
        super(arg2, arg3);
        this.events = arg1;
        // adding a middleware that will apply another middleware to all sockets
        this.use((socket, next) => {
            // adding a middleware to do type validation using the zod schema
            socket.use(([event, ...args], next) => {
                
                if (this.events.clientToServer && Object.keys(this.events.clientToServer).includes(event)) {
                    try {
                        for (let i = 0; i < this.events.clientToServer[event].length; i++) {
                            this.events.clientToServer[event][i].parse(args[i]);
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