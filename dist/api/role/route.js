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
import { eq } from "drizzle-orm";
import { roles, rolePermissions, permissions } from "../../db/schema.js";
import checkAuth from "../../middleware/checkAuth.js";
export const roleRouter = express.Router();
roleRouter.get("/role", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).json({ error: "Unauthorized access" });
            return;
        }
        // 1. Obtener todos los roles
        const allRoles = yield db.select().from(roles);
        // 2. Para cada rol, obtener sus permisos
        const rolesWithPermissions = yield Promise.all(allRoles.map((role) => __awaiter(void 0, void 0, void 0, function* () {
            const rolePerms = yield db
                .select({
                permission: permissions.name,
            })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(rolePermissions.roleId, role.id));
            return {
                id: role.id,
                name: role.name,
                permissions: rolePerms.map((p) => p.permission),
            };
        })));
        res.status(200).json(rolesWithPermissions);
    }
    catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
