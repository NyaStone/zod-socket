import { EventCallback, EventSchema } from "./EventSchema.js";

export type ServerEvents<S extends Schema<any, any>> = S extends Schema<infer ServerToClient, any>
    ? {
        [key in keyof ServerToClient]: ServerToClient[key] extends EventSchema<any,any,any>
            ? EventCallback<ServerToClient[key]>
            : never
    }
    : never;

export type ClientEvents<S extends Schema<any, any>> = S extends Schema<any, infer ClientToServer>
? {
    [key in keyof ClientToServer]: ClientToServer[key] extends EventSchema<any,any,any>
        ? EventCallback<ClientToServer[key]>
        : never
}
: never;

export class Schema<ServerToClient extends {}, ClientToServer extends {}> {
    serverToClientEvs: ServerToClient;
    clientToServerEvs: ClientToServer;

    new(): Schema<{}, {}> {
        return new Schema({}, {});
    }

    private constructor(serverToClient: ServerToClient, clientToServer: ClientToServer) {
        this.serverToClientEvs = serverToClient;
        this.clientToServerEvs = clientToServer;
    }

    addServerEvent<Ev extends EventSchema<any, any, any>>(ev: Ev): 
            Schema<
                ServerToClient & {[key in Ev extends EventSchema<infer Name, any, any> ? Name: never]: Ev},
                ClientToServer
            > {
        return new Schema({...this.serverToClientEvs, [ev.name]: ev }, this.clientToServerEvs);
    }

    addClientEvent<Ev extends EventSchema<any,any, any>>(ev: Ev):
            Schema<
                ServerToClient,
                ClientToServer & {[key in Ev extends EventSchema<infer Name, any, any> ? Name: never]: Ev}
            > {
        return new Schema(this.serverToClientEvs, {...this.clientToServerEvs, [ev.name]: ev});
    }
}