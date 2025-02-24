import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { roles, rolePermissions, permissions } from "../../db/schema.js";
import checkAuth from "../../middleware/checkAuth.js";

export const roleRouter = express.Router();

type RoleWithPermissions = {
  id: number;
  name: string;
  permissions: string[];
};

roleRouter.get("/role", checkAuth, async (req: Request, res: Response) => {
  try {
    const { RefreshToken } = req.cookies;
    if (!RefreshToken) {
      res.status(401).json({ error: "Unauthorized access" });
      return;
    }
    // 1. Obtener todos los roles
    const allRoles = await db.select().from(roles);

    // 2. Para cada rol, obtener sus permisos
    const rolesWithPermissions: RoleWithPermissions[] = await Promise.all(
      allRoles.map(async (role) => {
        const rolePerms = await db
          .select({
            permission: permissions.name,
          })
          .from(rolePermissions)
          .innerJoin(
            permissions,
            eq(rolePermissions.permissionId, permissions.id)
          )
          .where(eq(rolePermissions.roleId, role.id));

        return {
          id: role.id,
          name: role.name,
          permissions: rolePerms.map((p) => p.permission),
        };
      })
    );

    res.status(200).json(rolesWithPermissions);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});