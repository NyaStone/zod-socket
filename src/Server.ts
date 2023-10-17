import {Server as ServerIO, ServerOptions} from "socket.io";
import {Server as HttpServer} from "http";
import {Server as HttpsServer} from "https";
import { z, ZodTypeAny } from "zod";

interface EventsMap {
    [event: string]: any;
  }
  
type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);


/**
 * Option type definitions
 */
type EventCategories = {
    clientToServer: ZodCollection,
    serverToClient: ZodCollection,
    serverToServer: ZodCollection
}
type ZodCollection = {
    [key: string]: EventArguments;
}
type EventWithoutAck = readonly [...ZodTypeAny[]]
type EventWithAck = readonly[readonly [...ZodTypeAny[]], ...ZodTypeAny[]];
type EventArguments = EventWithAck | EventWithoutAck;


/**
 * Recursive type to map the tuple type to their inferred type from zod
 * 
 * Recursion is nessecary to obtain a propper tuple type that can be used as spread argument type for a function
 */
type ResolveEvent<
    Args extends EventArguments, 
    Callback extends (...args: any[]) => void = ()=>void
    > =
        Args['length'] extends 0
            ? Callback
            : Args[0] extends EventWithoutAck 
                ? (...args: [
                    ...Parameters<ResolveEvent<Args extends readonly[first: any, ...rest: infer Rest] ? Rest : never>>,
                    ResolveAcknowledgement<Args[0]>]
                ) => void
                : (...args: [
                    Args[0] extends ZodTypeAny ? z.infer<Args[0]>: never, 
                    ...Parameters<ResolveEvent<Args extends readonly[first: any, ...rest: infer Rest] ? Rest : never, Callback>>]
                ) => void

/**
 * Second recursive type, used to differenciate the names of parameters of the resolved function
 */
type ResolveAcknowledgement<
    Args extends EventWithoutAck, 
    Callback extends (...args: any[]) => void = ()=>void
    > = 
    Args['length'] extends 0
        ? Callback
        :  (...ackArgs: [
            Args[0] extends ZodTypeAny ? z.infer<Args[0]>: never, 
            ...Parameters<ResolveAcknowledgement<
                Args extends readonly[first: ZodTypeAny, ...rest: infer Rest] 
                    ? Rest extends EventWithoutAck ? Rest : never
                    : never,
                Callback>>]
        ) => void

/**
 * Type to map out the options to socket.io types
 */
type ResolveInferrence<EventArgs extends Partial<EventCategories>> = {
    clientToServer: EventArgs['clientToServer'] extends ZodCollection
        ? {[key in keyof EventArgs['clientToServer']]: ResolveEvent<EventArgs['clientToServer'][key]>}
        : {},
    serverToClient: EventArgs['serverToClient'] extends ZodCollection
        ? {[key in keyof EventArgs['serverToClient']]: ResolveEvent<EventArgs['serverToClient'][key]>}
        : {},
    serverToServer: EventArgs['serverToServer'] extends ZodCollection
        ? {[key in keyof EventArgs['serverToServer']]: ResolveEvent<EventArgs['serverToServer'][key]>}
        : {}
}

export class Server<SocketData = {},
        EventArgs extends Partial<EventCategories> = EventCategories,
        EventFuncts extends ResolveInferrence<EventArgs> = ResolveInferrence<EventArgs>> 
    extends ServerIO<
        EventFuncts['clientToServer'],
        EventFuncts['serverToClient'],
        EventFuncts['serverToServer'],
        SocketData
    > 
    {

    private readonly eventsArgs: EventCategories;
    private _superEmit: typeof this.emit;



    constructor(events: EventArgs, httpServer: HttpServer, opt?: Partial<ServerOptions>);
    constructor(events: EventArgs, httpsServer: HttpsServer, opt?: Partial<ServerOptions>);
    constructor(events: EventArgs, port: number, opt?: Partial<ServerOptions>);
    constructor(events: EventArgs, opt?: Partial<ServerOptions>);
    constructor(
        arg1: EventArgs, 
        arg2?: HttpServer | HttpsServer | number | Partial<ServerOptions>, 
        arg3?: Partial<ServerOptions>) {
        super(arg2, arg3);

        if (!arg1.clientToServer) arg1.clientToServer = {};
        if (!arg1.serverToClient) arg1.serverToClient = {};
        if (!arg1.serverToServer) arg1.serverToServer = {};
        
        this.eventsArgs = arg1 as EventCategories;
        

        this._superEmit = this.emit;
        
        // overriding the emit method to wrap the acknowlegement callback with a typechecking method
        // emitWithAck() uses emit under the hood so doesn't need to be changed
        this.emit = <E extends EventNames<EventFuncts["serverToClient"]>>(
                e: E,
                ...args: EventFuncts['serverToClient'][E] extends ((...args: any) => any)
                    ? Parameters<EventFuncts['serverToClient'][E]>
                    : never) => {      
            const serverToClient = this.eventsArgs.serverToClient ? this.eventsArgs.serverToClient : {}

            if (typeof args[args.length - 1] === 'function') {
                const arg: (...ackArgs: any[]) => void = args[args.length - 1];
                args[args.length - 1] = ((...ackArgs: any[]) => {
                    const eventValidators = serverToClient[e.toString()];
                    if (!eventValidators) throw new Error("Unknown event");
                    const ackArgValidators = eventValidators[0];
                    if (!Array.isArray(ackArgValidators)) throw new Error('Event without acknowlegement recieved function');
                    // typecheck the args
                    for (let i = 0; i < ackArgs.length; i++) {
                        const zodValidator = ackArgValidators[i];
                        zodValidator.parse(ackArgs[i])
                    }
                    return arg(...ackArgs);
                });
            }
            
            return this._superEmit(e, ...args);
        };


        // adding a middleware that will apply modifications to extend sockets
        this.use((socket, next) => {
            // extending the emit method to account for acknowlegement callback type validation 
            const superEmit = socket.emit;
            socket.emit = <E extends EventNames<EventFuncts["serverToClient"]>>(
                e: E, 
                ...args: EventFuncts['serverToClient'][E] extends ((...args: any) => any)
                    ? Parameters<EventFuncts["serverToClient"][E]>
                    : never) => {
            
                const serverToClient = this.eventsArgs.serverToClient ? this.eventsArgs.serverToClient : {}
                
                if (typeof args[args.length - 1] === 'function') {
                    const arg: (...ackArgs: any[]) => void = args[args.length - 1]
                    args[args.length - 1] = (...ackArgs: any[]) => {
                        const eventValidators = serverToClient[e.toString()];
                        if (!eventValidators) throw new Error("Unknown event");
                        const ackArgValidators = eventValidators[0];
                        if (!Array.isArray(ackArgValidators)) throw new Error('Event without acknowlegement recieved function');
                        // typecheck the args
                        for (let i = 0; i < ackArgs.length; i++) {
                            const zodValidator = ackArgValidators[i];
                            zodValidator.parse(ackArgs[i])
                        }
                        return arg(...ackArgs);
                    }
                }
                
                return superEmit(e, ...args);
            }
            // adding a middleware to do type validation using the zod schema
            socket.use(([event, ...args], next) => {
                
                if (this.eventsArgs.clientToServer && Object.keys(this.eventsArgs.clientToServer).includes(event)) {
                    try {
                        const eventValidators = this.eventsArgs.clientToServer[event];
                        if (!eventValidators) throw new Error('Unknown incomming event');
                        for (let i = 0; i < eventValidators.length; i++) {
                            const zodArg = eventValidators[i];
                            if (!zodArg) throw new Error('Unkown incomming event argument')
                            if (!this.isArray(zodArg)) {// ignoring the callback 
                                zodArg.parse(args[i]);
                            }
                        }
                        next();
                    }
                    catch (e) {
                        next(e as Error);
                    }
                }
                else next();

            })
            next();
        });
    }

    /**
     * Narrowing method since Array.isArray() doesn't narrow readonly arrays
     * @param arg object to narrow the type of
     * @returns type narrowing if the argument is an Array or readonly Array
     */
    private isArray(arg: any): arg is any[] | readonly any[] {
        return Array.isArray(arg);
    }
}