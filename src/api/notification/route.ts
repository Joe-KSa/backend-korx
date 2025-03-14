import { db } from "../../db/index.js";
import express from "express";
import { Request, Response } from "express";
import checkAuth from "../../middleware/checkAuth.js";
import {
  members,
  notifications,
  projectMembers,
  sessions,
  users,
  projectImages,
  images,
  projects,
} from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const notificationRouter = express.Router();

  notificationRouter.get(
    "/notification",
    checkAuth,
    async (req: Request, res: Response) => {
      try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
          res.status(401).send("Unauthorized access");
          return;
        }

        // Validar la sesión y obtener el userId
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

        const enrichedNotifications = await db
          .select({
            id: notifications.id,
            userId: notifications.userId,
            type: notifications.type,
            entityId: notifications.entityId,
            message: notifications.message,
            status: notifications.status,
            createdAt: notifications.createdAt,
            // Datos del proyecto (solo para project_invite)
            project: {
              title: projects.title,
              image: images.url,
            },
            sender: {
              name: users.name,
              image: users.image,
            },
          })
          .from(notifications)
          .leftJoin(
            projects,
            and(
              eq(projects.id, notifications.entityId),
              eq(notifications.type, "project_invite")
            )
          )
          .leftJoin(projectImages, eq(projectImages.projectId, projects.id))
          .leftJoin(images, eq(images.id, projectImages.imageId))
          .leftJoin(users, eq(users.id, notifications.senderId))
          .where(eq(notifications.userId, userId as string))
          .groupBy(notifications.id);

        res.json(enrichedNotifications);
      } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
      }
    }
  );

notificationRouter.patch(
  "/notification/:notificationId/respond",
  async (req, res) => {
    const { notificationId } = req.params;
    const { response } = req.body; // "accepted" o "rejected"

    try {
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      const notificationResult = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, Number(notificationId)));

      const notification = notificationResult[0];

      if (!notification || notification.type !== "project_invite") {
        res.status(404).json({ error: "Notificación no encontrada." });
        return;
      }

      await db
        .update(notifications)
        .set({ status: response })
        .where(eq(notifications.id, Number(notificationId)));

      const existingMember = await db
        .select()
        .from(members)
        .where(eq(members.userId, notification.userId));

      const member = existingMember[0];

      if (!member) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
      }

      if (response === "accepted") {
        await db.insert(projectMembers).values({
          projectId: notification.entityId,
          memberId: member.id,
          roleId: 5,
        });

        // Eliminar la notificación después de aceptarla
        await db
          .delete(notifications)
          .where(eq(notifications.id, Number(notificationId)));

        res.json({ success: true, message: "Te uniste al proyecto." });
      } else {
        // Eliminar la notificación después de rechazarla
        await db
          .delete(notifications)
          .where(eq(notifications.id, Number(notificationId)));

        res.json({ success: true, message: "Invitación rechazada." });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al procesar la respuesta." });
    }
  }
);
