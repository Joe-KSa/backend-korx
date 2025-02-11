import { createClient } from "redis";
import { config } from "dotenv";

config({ path: "private/.env" });

export const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500), // Intentos de reconexión
  },
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

