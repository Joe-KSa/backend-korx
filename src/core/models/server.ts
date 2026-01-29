import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { projectRouter } from "../../api/project/route.js";
import { memberRouter } from "../../api/member/route.js";
import { authRouter } from "../../api/auth/route.js";
import { userRouter } from "../../api/user/route.js";
import { tagsRouter } from "../../api/tags/route.js";
import { uploadRouter } from "../../api/upload/route.js";
import { soundRouter } from "../../api/sound/route.js";
import { redisClient } from "../../config/redis.config.js";
import { roleRouter } from "../../api/role/route.js";
import { notificationRouter } from "../../api/notification/route.js";
import { challengeRouter } from "../../api/challenge/route.js";

export class Server {
  private port: number;
  public app: express.Express;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "4000"); // Uso de variable de entorno para puerto

    this.applyMiddlewares(); // Aplica los middlewares
    this.routes(); // Configura las rutas
  }

  applyMiddlewares() {
    const allowedOrigin = process.env.FRONTEND_REDIRECT_URI;

    // Middleware para asegurar que Redis esté conectado en cada petición (o usar un singleton)
    this.app.use(async (_req, res, next) => {
      try {
        if (!redisClient.isOpen) {
        await redisClient.connect().catch(console.error);
      }
      next();
      } catch (error) {
        res.status(500).send("Internal Server Error: Redis Connection");
      }
      
    });

    this.app.use(
      cors({
        origin: allowedOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Set-Cookie"],
      })
    );

    this.app.use(express.json({ limit: "7.5mb" })); // Aumenta el límite del body JSON
    this.app.use(express.urlencoded({ limit: "7.5mb", extended: true })); // Para datos de formularios grandes
    this.app.use(cookieParser()); // Habilita cookies
  }

  routes() {
    this.app.use("/api", projectRouter);
    this.app.use("/api", roleRouter);
    this.app.use("/api", notificationRouter);
    this.app.use("/api", memberRouter);
    this.app.use("/api", userRouter);
    this.app.use("/api", tagsRouter);
    this.app.use("/api", uploadRouter);
    this.app.use("/api", soundRouter);
    this.app.use("/api", challengeRouter)
    this.app.use(authRouter);
  }

  async listen() {
    await redisClient.connect();
    this.app.listen(this.port, () => {
      console.log(`Server is listening on port ${this.port}`);
    });
  }
}
