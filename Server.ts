import {Server as ServerIO, ServerOptions} from "socket.io";
import {Server as HttpServer} from "http";
import {Server as HttpsServer} from "https";
import { EventCategories, ExtractAckArgs, ExtractZodCollection, ResolveEvents, ZodCollection } from "./EventCategories";
import { ZodTypeAny } from "zod";
import { EventNames, EventsMap } from "socket.io/dist/typed-events";

export class Server< SocketData = {},
        Events extends Partial<EventCategories> = {}> 
    extends ServerIO<
        ResolveEvents<ExtractZodCollection<Events, 'clientToServer'>>,
        ResolveEvents<ExtractZodCollection<Events, 'serverToClient'>>,
        ResolveEvents<ExtractZodCollection<Events, 'serverToServer'>>,
        SocketData
    > 
    {

    private events: EventCategories<ExtractZodCollection<Events, 'clientToServer'>, ExtractZodCollection<Events, 'serverToClient'>, ExtractZodCollection<Events, 'serverToServer'>>;
    private _superEmit: typeof this.emit;


    constructor(events: Events, httpServer: HttpServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, httpsServer: HttpsServer, opt?: Partial<ServerOptions>);
    constructor(events: Events, port: number, opt?: Partial<ServerOptions>);
    constructor(events: Events, opt?: Partial<ServerOptions>);
    constructor(arg1: Events, arg2?, arg3?) {
        type ServerToClientEvents = ResolveEvents<ExtractZodCollection<Events, 'serverToClient'>>;
        super(arg2, arg3);

        this.events = {
            clientToServer: arg1.clientToServer ? arg1.clientToServer : {},
            serverToClient: arg1.serverToClient ? arg1.serverToClient : {},
            serverToServer: arg1.serverToServer ? arg1.serverToServer : {}

        };

        // overriding the emit method to wrap the acknowlegement callback with a typechecking method
        this._superEmit = this.emit;
        this.emit = <Event extends EventNames<ServerToClientEvents>>(event: Event, ...args: Parameters<ServerToClientEvents[Event]>) => {
                
                const newArgs = args.map((arg) => {
                    if (typeof arg !== 'function') return arg;
                    return (...ackArgs: ExtractAckArgs<ExtractZodCollection<Events, 'serverToClient'>[Event]>) => {
                        // typecheck the args
                        for (let i = 0; i < ackArgs.length; i++) {
                            const zodArg: ZodTypeAny = this.events.serverToClient[event.toString()][this.events.serverToClient[event.toString()].length - 1][i];
                            zodArg.parse(ackArgs[i])
                        }
                        return arg(...ackArgs);
                    }
                }) as typeof args; // typecast nessecary, don't know why Array.map method doesn't pass types properly
                return this._superEmit(event, ...newArgs);
        };

        // adding a middleware that will apply another middleware to all sockets
        this.use((socket, next) => {
            // adding a middleware to do type validation using the zod schema
            socket.use(([event, ...args], next) => {
                
                if (Object.keys(this.events.clientToServer).includes(event)) {
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