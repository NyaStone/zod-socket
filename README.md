# zod-socket
As I was working with Socket.IO in TypeScript, I wanted to add type validation using zod. This meant declaring the type of events twice.
Once for the Socket.IO Typescript type resoltion, once for the zod schema.

Thus came the idea to bundle them into a single API using only the zod schema for type resolution, and data validation.


## Currently known issues / TODOS:
- Missing client implementation
- Unsure if emit uses socket emit under the hood, in which case overriding emit on the server is redundant.
- Inter-Server events aren't being type validated. (Is it usefull ? Servers from the cluster could in theory be trusted)
