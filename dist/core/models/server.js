var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
import { projectMember } from "../../api/projectMember/route.js";
export class Server {
    constructor() {
        Object.defineProperty(this, "port", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "app", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.app = express();
        this.port = parseInt(process.env.PORT || "4000"); // Uso de variable de entorno para puerto
        this.applyMiddlewares(); // Aplica los middlewares
        this.routes(); // Configura las rutas
    }
    applyMiddlewares() {
        const allowedOrigin = process.env.FRONTEND_REDIRECT_URI;
        this.app.use(cors({
            origin: allowedOrigin,
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            exposedHeaders: ["Set-Cookie"],
        }));
        // Manejar preflight (OPTIONS) globalmente
        this.app.options("*", (_req, res) => {
            res.header("Access-Control-Allow-Origin", allowedOrigin);
            res.header("Access-Control-Allow-Credentials", "true");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.sendStatus(200);
        });
        this.app.use(express.json({ limit: "3mb" })); // Aumenta el límite del body JSON
        this.app.use(express.urlencoded({ limit: "3mb", extended: true })); // Para datos de formularios grandes
        this.app.use(cookieParser()); // Habilita cookies
    }
    routes() {
        this.app.use("/api", projectRouter);
        this.app.use("/api", projectMember);
        this.app.use("/api", memberRouter);
        this.app.use("/api", userRouter);
        this.app.use("/api", tagsRouter);
        this.app.use("/api", uploadRouter);
        this.app.use("/api", soundRouter);
        this.app.use(authRouter);
    }
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            yield redisClient.connect();
            this.app.listen(this.port, () => {
                console.log(`Server is listening on port ${this.port}`);
            });
        });
    }
}
