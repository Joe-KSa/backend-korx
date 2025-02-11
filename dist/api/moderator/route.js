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
import { db } from "../../db/index.js";
import checkAuth from "../../middleware/checkAuth.js";
import { moderators, roles, users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
export const moderatorRouter = express.Router();
moderatorRouter.get("/moderator", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        const moderatorsList = yield db
            .select({
            id: users.id,
            username: users.username,
            name: users.name,
            image: users.image,
            createdAt: moderators.createdAt,
        })
            .from(moderators)
            .leftJoin(users, eq(moderators.userId, users.id)); // Relacionar moderadores con usuarios
        res.status(200).json(moderatorsList);
    }
    catch (err) {
        console.error("Error al obtener moderadores:", err);
        res.status(500).send("Error interno del servidor");
    }
}));
moderatorRouter.get("/moderator/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        const { id } = req.params;
        const moderatorData = yield db
            .select({
            id: users.id,
            username: users.username,
            name: users.name,
            createdAt: moderators.createdAt,
            role: {
                id: roles.id,
                name: roles.name,
            },
        })
            .from(moderators)
            .where(eq(users.id, id))
            .leftJoin(users, eq(moderators.userId, users.id))
            .leftJoin(roles, eq(moderators.roleId, roles.id));
        if (moderatorData.length === 0) {
            res.status(404).send("Moderador no encontrado");
            return;
        }
        res.status(200).json(moderatorData[0]);
    }
    catch (err) {
        console.error("Error al obtener moderador:", err);
        res.status(500).send("Error interno del servidor");
    }
}));
