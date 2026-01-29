import { Server } from "./core/models/server.js"

const server = new Server();

export default server.app;

if (process.env.NODE_ENV !== 'production') {
  server.listen();
}