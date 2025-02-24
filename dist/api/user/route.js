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
import { users, sessions, roles, bans, rolePermissions, permissions, members, } from "../../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";
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
userRouter.patch("/user/:username/toggle-block", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        const { username } = req.params;
        const { action } = req.body; // "bloquear" o "desbloquear"
        if (!RefreshToken) {
            res.status(401).send("Acceso no autorizado");
            return;
        }
        if (!username || !action) {
            res.status(400).send("Debe proporcionar un username y una acción válida");
            return;
        }
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
        const allowedRoles = ["Moderador", "Administrador"];
        const hasPermission = yield db
            .select()
            .from(roles)
            .innerJoin(users, eq(users.roleId, roles.id))
            .where(and(eq(users.id, authUserId), inArray(roles.name, allowedRoles)))
            .limit(1);
        if (!hasPermission.length) {
            res.status(403).send("No tienes permisos para modificar el estado de los usuarios");
            return;
        }
        const userToModify = yield db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);
        if (!userToModify.length) {
            res.status(404).send("Usuario no encontrado");
            return;
        }
        const userIdToModify = userToModify[0].id;
        const targetRoleName = action === "bloquear" ? "Bloqueado" : "Miembro";
        const hiddenStatus = action === "bloquear";
        const targetRole = yield db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, targetRoleName))
            .limit(1);
        if (!targetRole.length) {
            res.status(500).send(`El rol '${targetRoleName}' no existe en la base de datos`);
            return;
        }
        const targetRoleId = targetRole[0].id;
        yield db
            .update(members)
            .set({ hidden: hiddenStatus })
            .where(eq(members.userId, userIdToModify));
        yield db
            .update(users)
            .set({ roleId: targetRoleId })
            .where(eq(users.id, userIdToModify));
        res.status(200).send(`Usuario ${action === "bloquear" ? "bloqueado" : "desbloqueado"} correctamente`);
    }
    catch (err) {
        console.error("Error al modificar el estado del usuario:", err);
        res.status(500).send("Error interno del servidor");
    }
}));
userRouter.get("/user/:id/permissions", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Acceso no autorizado");
            return;
        }
        const userId = req.params.id;
        // 1. Buscamos el usuario para obtener su roleId
        const [userRecord] = yield db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!userRecord) {
            res.status(404).send("Usuario no encontrado");
            return;
        }
        // 2. Realizamos un join para traer los permisos del rol del usuario
        const permissionsData = yield db
            .select({
            permissionName: permissions.name,
        })
            .from(roles)
            .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(roles.id, userRecord.roleId));
        // Extraemos los nombres de los permisos en un array
        const permissionList = permissionsData.map((item) => item.permissionName);
        res.json({
            userId: userRecord.id,
            roleId: userRecord.roleId,
            permissions: permissionList,
        });
    }
    catch (err) {
        console.error("Error fetching user permissions:", err);
        res.status(500).send("Error occurred while fetching permissions");
    }
}));
