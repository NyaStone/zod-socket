import { Server } from "../src/Server.js";
import { z } from "zod";

const events = {
    serverToClient: {
        empty: [] as const,

        withoutAck: [z.string(), z.object({
            arg: z.number()
        })]as const,

        withAck: [[z.boolean(), z.object({
            arg: z.number()
        })]as const, z.string()]as const
    },
    clientToServer: {
        clientEmpty: [],

        clientWithoutAck: [z.string(), z.object({
            arg: z.number()
        })]as const,

        clientWithAck: [[z.string(), z.object({
            arg: z.number()
        })]as const, z.string()] as const
    }
}

const server = new Server(events);

server.on('connect', () => {

})

server.emit('withAck', 'qsdsd', (boo, obj) => {
    
})

server.emit('empty')