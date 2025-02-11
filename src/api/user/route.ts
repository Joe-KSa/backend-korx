import express from "express";
import type { Request, Response } from "express";

import { db } from "../../db/index.js";
import { users, sessions, moderators, members } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";

export const userRouter = express.Router();

userRouter.get("/user", checkAuth, async (req: Request, res: Response) => {
  try {
    const { RefreshToken } = req.cookies;

    if (!RefreshToken) {
      res.status(401).send("Unauthorized access");
      return;
    }

    // Buscar la sesión en la base de datos
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshToken, RefreshToken))
      .limit(1);

    if (session.length === 0) {
      res.status(401).send("Session not found or invalid");
      return;
    }

    const userId = session[0].userId;
    const userFromDB = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string))
      .limit(1);

    if (userFromDB.length === 0) {
      res.status(401).send("User not found");
      return;
    }

    const user = userFromDB[0];

    if (user.banned === 1) {
      res.status(403).send("You are banned");
    } else {
      res.status(200).json(user);
    }
  } catch (err) {
    console.error("Error fetching session:", err);
    res.status(500).send("Error occurred while fetching session");
  }
});

userRouter.post("/user/:username/block", checkAuth, async (req, res) => {
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
    const session = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.refreshToken, RefreshToken))
      .limit(1);

    if (!session.length) {
      res.status(401).send("Sesión no válida");
      return;
    }

    const authUserId = session[0].userId;

    // Verificar si el usuario autenticado es moderador
    const isModerator = await db
      .select()
      .from(moderators)
      .where(eq(moderators.userId, authUserId as string)) // Ahora referencia users.id
      .limit(1);

    if (!isModerator.length) {
      res.status(403).send("No tienes permisos para bloquear usuarios");
      return;
    }

    // Verificar si el usuario a bloquear existe
    const userToBlock = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!userToBlock.length) {
      res.status(404).send("Usuario no encontrado");
      return;
    }

    const userIdToBlock = userToBlock[0].id;

    // Bloquear al usuario
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ writeAccess: 0 })
        .where(eq(users.id, userIdToBlock));
    
      await tx
        .update(members)
        .set({ hidden: 1 })
        .where(eq(members.username, username));
    });

    res.status(200).send("Usuario bloqueado correctamente");
  } catch (err) {
    console.error("Error al bloquear al usuario:", err);
    res.status(500).send("Error interno del servidor");
  }
});



userRouter.post("/user/:username/unblock", checkAuth, async (req, res) => {
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
    const session = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.refreshToken, RefreshToken))
      .limit(1);

    if (!session.length) {
      res.status(401).send("Sesión no válida");
      return;
    }

    const authUserId = session[0].userId;

    // Verificar si el usuario autenticado es moderador
    const isModerator = await db
      .select()
      .from(moderators)
      .where(eq(moderators.userId, authUserId as string))
      .limit(1);

    if (!isModerator.length) {
      res.status(403).send("No tienes permisos para desbloquear usuarios");
      return;
    }

    // Verificar si el usuario a desbloquear existe
    const userToUnblock = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!userToUnblock.length) {
      res.status(404).send("Usuario no encontrado");
      return;
    }

    const userIdToUnblock = userToUnblock[0].id;

    // Desbloquear al usuario
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ writeAccess: 1 })
        .where(eq(users.id, userIdToUnblock));
    
      await tx
        .update(members)
        .set({ hidden: 0 })
        .where(eq(members.username, username));
    });

    res.status(200).send("Usuario desbloqueado correctamente");
  } catch (err) {
    console.error("Error al desbloquear al usuario:", err);
    res.status(500).send("Error interno del servidor");
  }
});
