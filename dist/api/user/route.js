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
import { users, sessions, roles, bans } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";
export const userRouter = express.Router();
userRouter.get("/user", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        // Buscar la sesión en la base de datos
        const session = yield db
            .select()
            .from(sessions)
            .where(eq(sessions.refreshToken, RefreshToken))
            .limit(1);
        if (session.length === 0) {
            res.status(401).send("Session not found or invalid");
            return;
        }
        const userId = session[0].userId;
        // Obtener usuario y rol asociado
        const user = yield db
            .select({
            id: users.id,
            name: users.name,
            username: users.username,
            email: users.email,
            image: users.image,
            banner: users.banner,
            bannerColor: users.bannerColor,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            role: {
                id: roles.id,
                name: roles.name,
            },
        })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.id, userId))
            .limit(1);
        if (user.length === 0) {
            res.status(404).send("User not found");
            return;
        }
        // Verificar si el usuario está baneado
        const isBanned = yield db
            .select()
            .from(bans)
            .where(eq(bans.userId, userId))
            .limit(1);
        if (isBanned.length > 0) {
            res.status(403).send("You are banned");
            return;
        }
        res.status(200).json(user[0]);
    }
    catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).send("Error occurred while fetching user");
    }
}));
userRouter.post("/user/:username/block", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        const { username } = req.params;
        if (!RefreshToken) {
            res.status(401).send("Acceso no autorizado");
            return;
        }
        if (!username) {
            res.status(400).send("Debe proporcionar un username");
            return;
        }
        // Obtener el usuario autenticado basado en el RefreshToken
        const session = yield db
            .select({ userId: sessions.userId })
            .from(sessions)
            .where(eq(sessions.refreshToken, RefreshToken))
            .limit(1);
        if (!session.length) {
            res.status(401).send("Sesión no válida");
            return;
        }
        const authUserId = session[0].userId;
        if (!authUserId) {
            res.status(401).send("Debes iniciar sesión para realizar esta acción");
            return;
        }
        // Verificar si el usuario autenticado es moderador
        const isModerator = yield db
            .select()
            .from(roles)
            .innerJoin(users, eq(users.roleId, roles.id))
            .where(and(eq(users.id, authUserId), eq(roles.name, "Moderador")))
            .limit(1);
        if (!isModerator.length) {
            res.status(403).send("No tienes permisos para bloquear usuarios");
            return;
        }
        // Verificar si el usuario a bloquear existe
        const userToBlock = yield db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);
        if (!userToBlock.length) {
            res.status(404).send("Usuario no encontrado");
            return;
        }
        const userIdToBlock = userToBlock[0].id;
        // Verificar si el rol "Bloqueado" existe
        const blockedRole = yield db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, "Bloqueado"))
            .limit(1);
        if (!blockedRole.length) {
            res.status(500).send("El rol 'Bloqueado' no existe en la base de datos");
            return;
        }
        const blockedRoleId = blockedRole[0].id;
        // Asignar el rol "Bloqueado" al usuario
        yield db
            .update(users)
            .set({ roleId: blockedRoleId })
            .where(eq(users.id, userIdToBlock));
        res.status(200).send("Usuario bloqueado correctamente");
    }
    catch (err) {
        console.error("Error al bloquear al usuario:", err);
        res.status(500).send("Error interno del servidor");
    }
}));
userRouter.post("/user/:username/unblock", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        const { username } = req.params;
        if (!RefreshToken) {
            res.status(401).send("Acceso no autorizado");
            return;
        }
        if (!username) {
            res.status(400).send("Debe proporcionar un username");
            return;
        }
        // Obtener el usuario autenticado basado en el RefreshToken
        const session = yield db
            .select({ userId: sessions.userId })
            .from(sessions)
            .where(eq(sessions.refreshToken, RefreshToken))
            .limit(1);
        if (!session.length) {
            res.status(401).send("Sesión no válida");
            return;
        }
        const authUserId = session[0].userId;
        if (!authUserId) {
            res.status(401).send("Debes iniciar sesión para realizar esta acción");
            return;
        }
        // Verificar si el usuario autenticado es moderador
        const isModerator = yield db
            .select()
            .from(roles)
            .innerJoin(users, eq(users.roleId, roles.id))
            .where(and(eq(users.id, authUserId), eq(roles.name, "Moderador")))
            .limit(1);
        if (!isModerator.length) {
            res.status(403).send("No tienes permisos para desbloquear usuarios");
            return;
        }
        // Verificar si el usuario a desbloquear existe
        const userToUnblock = yield db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);
        if (!userToUnblock.length) {
            res.status(404).send("Usuario no encontrado");
            return;
        }
        const userIdToUnblock = userToUnblock[0].id;
        // Verificar si el rol "Miembro" existe
        const memberRole = yield db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, "Miembro"))
            .limit(1);
        if (!memberRole.length) {
            res.status(500).send("El rol 'Miembro' no existe en la base de datos");
            return;
        }
        const memberRoleId = memberRole[0].id;
        // Asignar el rol "Miembro" al usuario
        yield db
            .update(users)
            .set({ roleId: memberRoleId })
            .where(eq(users.id, userIdToUnblock));
        res.status(200).send("Usuario desbloqueado correctamente");
    }
    catch (err) {
        console.error("Error al desbloquear al usuario:", err);
        res.status(500).send("Error interno del servidor");
    }
}));
