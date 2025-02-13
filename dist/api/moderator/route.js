// import express from "express";
// import type { Request, Response } from "express";
// import { db } from "../../db/index.js";
// import checkAuth from "../../middleware/checkAuth.js";
// import { moderators, roles, users } from "../../db/schema.js";
// import { eq } from "drizzle-orm";
export {};
// export const moderatorRouter = express.Router();
// moderatorRouter.get(
//   "/moderator",
//   checkAuth,
//   async (req: Request, res: Response) => {
//     try {
//       const { RefreshToken } = req.cookies;
//       if (!RefreshToken) {
//         res.status(401).send("Unauthorized access");
//         return;
//       }
//       const moderatorsList = await db
//         .select({
//           id: users.id,
//           username: users.username,
//           name: users.name,
//           image: users.image,
//           createdAt: moderators.createdAt,
//         })
//         .from(moderators)
//         .leftJoin(users, eq(moderators.userId, users.id)); // Relacionar moderadores con usuarios
//       res.status(200).json(moderatorsList);
//     } catch (err) {
//       console.error("Error al obtener moderadores:", err);
//       res.status(500).send("Error interno del servidor");
//     }
//   }
// );
// moderatorRouter.get("/moderator/:id", async (req: Request, res: Response) => {
//   try {
//     const { RefreshToken } = req.cookies;
//     if (!RefreshToken) {
//       res.status(401).send("Unauthorized access");
//       return;
//     }
//     const { id } = req.params;
//     const moderatorData = await db
//       .select({
//         id: users.id,
//         username: users.username,
//         name: users.name,
//         createdAt: moderators.createdAt,
//         role: {
//           id: roles.id,
//           name: roles.name,
//         },
//       })
//       .from(moderators)
//       .where(eq(users.id, id))
//       .leftJoin(users, eq(moderators.userId, users.id))
//       .leftJoin(roles, eq(moderators.roleId, roles.id));
//     if (moderatorData.length === 0) {
//       res.status(404).send("Moderador no encontrado");
//       return;
//     }
//     res.status(200).json(moderatorData[0]);
//   } catch (err) {
//     console.error("Error al obtener moderador:", err);
//     res.status(500).send("Error interno del servidor");
//   }
// });
