import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  projects,
  tags,
  comments,
  projectTags,
  members,
  projectMembers,
  users,
  projectImages,
  images,
  roles,
  memberImages,
  memberSounds,
  sounds,
  notifications,
  memberTags,
  projectLikes,
  sessions
} from "../../db/schema.js";
import { eq, inArray, and, SQL, sql, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type {
  ProjectEntry,
  Tag,
  Member,
  CommentResponse,
  TopLevelCommentResponse,
  ReplyCommentResponse,
} from "../../core/types.js";
import checkAuth from "../../middleware/checkAuth.js";
import { redisClient } from "../../config/redis.config.js";

const memberImagesAlias = alias(images, "member_images_alias");
const memberTagsAlias = alias(tags, "member_tags_alias");
const likeUsers = alias(users, "likeUsers");

export const projectRouter = express.Router();
projectRouter.get("/project", async (_req: Request, res: Response) => {
  try {
    const rawData = await db
      .select({
        projectId: projects.id,
        title: projects.title,
        description: projects.description,
        repository: projects.repository,
        url: projects.url,
        creatorId: users.id,
        creatorName: users.name,
        creatorUsername: users.username,
        // Usamos el alias para obtener la imagen relacionada con el creador
        creatorImage: sql`
        (SELECT ${images.url}
        FROM ${members}
        LEFT JOIN ${memberImages} ON ${members.id} = ${memberImages.memberId}
        LEFT JOIN ${images} ON ${memberImages.imageId} = ${images.id}
        WHERE ${members.userId} = ${users.id} AND ${memberImages.type} = 'avatar'
        LIMIT 1
        )`.as("creatorImage"),
        tagId: tags.id,
        tagName: tags.name,
        projectImageUrl: images.url,
        projectImagePublicId: images.publicId,
        projectImageType: projectImages.type,
        likesCount: sql<number>`(SELECT COUNT(*) FROM project_likes WHERE project_likes.project_id = ${projects.id})`,
        // Campos para la lista de usuarios que dieron like
        likeUserId: likeUsers.id,
        likeUsername: likeUsers.username,
        hidden: projects.hidden,
        createdAt: projectImages.createdAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .leftJoin(projectTags, eq(projects.id, projectTags.projectId))
      .leftJoin(tags, eq(projectTags.tagId, tags.id))
      .leftJoin(projectImages, eq(projects.id, projectImages.projectId))
      .leftJoin(images, eq(projectImages.imageId, images.id))
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(members, eq(projectMembers.memberId, members.id))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(
        memberImagesAlias,
        eq(memberImages.imageId, memberImagesAlias.id)
      )
      // Joins para traer los likes y sus usuarios (usamos alias para no interferir con el creator)
      .leftJoin(projectLikes, eq(projects.id, projectLikes.projectId))
      .leftJoin(likeUsers, eq(projectLikes.userId, likeUsers.id))
      .orderBy(desc(projects.createdAt));

    // Usamos un Map para agrupar la información por proyecto
    const projectsMap = new Map<number, ProjectEntry>();

    for (const row of rawData) {
      if (!row.projectId) continue;

      // Si es la primera vez que vemos este proyecto, lo inicializamos
      if (!projectsMap.has(row.projectId)) {
        projectsMap.set(row.projectId, {
          id: row.projectId,
          title: row.title,
          description: row.description,
          repository: row.repository,
          url: row.url,
          creator: {
            id: row.creatorId,
            name: row.creatorName,
            username: row.creatorUsername,
            image: row.creatorImage,
          },
          tags: [],
          images:
            row.projectImageType === "general" && row.projectImageUrl
              ? {
                  url: row.projectImageUrl,
                  publicId: row.projectImagePublicId,
                  type: row.projectImageType,
                }
              : { url: null, publicId: null, type: null },
          likesCount: row.likesCount ?? 0,
          // Inicializamos la lista de usuarios que dieron like
          likes: [],
          hidden: row.hidden,
        });
      }

      const project = projectsMap.get(row.projectId)!;

      // Agregamos el tag si es que no está ya en la lista
      if (row.tagId && !project.tags.some((tag: Tag) => tag.id === row.tagId)) {
        project.tags.push({ id: row.tagId, name: row.tagName });
      }

      // Si existe información de usuario que dio like, la agregamos sin duplicados
      if (
        row.likeUserId &&
        !project.likes.some(
          (like: { id: string; username: string }) => like.id === row.likeUserId
        )
      ) {
        project.likes.push({
          id: row.likeUserId,
          username: row.likeUsername,
        });
      }
    }

    res.status(200).json(Array.from(projectsMap.values()));
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ error: "Error al obtener los proyectos" });
  }
});

projectRouter.get(
  "/project/:projectId",
  async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);

      const rawData = await db
        .select({
          projectId: projects.id,
          title: projects.title,
          description: projects.description,
          repository: projects.repository,
          url: projects.url,
          creatorId: users.id,
          creatorName: users.name,
          creatorUsername: users.username,
          creatorImage: sql`
          (SELECT ${images.url}
          FROM ${members}
          LEFT JOIN ${memberImages} ON ${members.id} = ${memberImages.memberId}
          LEFT JOIN ${images} ON ${memberImages.imageId} = ${images.id}
          WHERE ${members.userId} = ${users.id} AND ${memberImages.type} = 'avatar'
          LIMIT 1
          )`.as("creatorImage"),
          projectTagId: tags.id,
          projectTagName: tags.name,
          projectImageUrl: images.url,
          projectImagePublicId: images.publicId,
          projectImageType: projectImages.type,
          memberId: members.id,
          memberName: members.name,
          memberUsername: members.username,
          memberUserId: members.userId,
          memberDescription: members.description,
          memberHidden: members.hidden,
          memberGithub: members.github,
          memberPhrase: members.phrase,
          memberPrimaryColor: members.primaryColor,
          memberSecondaryColor: members.secondaryColor,
          memberCreatedAt: members.createdAt,
          roleId: roles.id,
          roleName: roles.name,
          memberImageType: memberImages.type,
          memberImageUrl: memberImagesAlias.url,
          memberImagePublicId: memberImagesAlias.publicId,
          memberTagId: memberTagsAlias.id,
          memberTagName: memberTagsAlias.name,
          soundId: sounds.id,
          soundUrl: sounds.url,
          soundPath: sounds.path,
          soundType: memberSounds.type,
          hidden: projects.hidden,
          projectsCount:
            sql`(SELECT COUNT(*) FROM ${projects} WHERE ${projects.userId} = ${members.userId})`.as(
              "projectsCount"
            ),
          commentsCount:
            sql`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.authorId} = ${members.userId})`.as(
              "commentsCount"
            ),
          collaborationsCount: sql`
                    (
                      SELECT COUNT(*) 
                      FROM ${projectMembers}
                      JOIN ${roles} ON ${projectMembers.roleId} = ${roles.id}
                      WHERE ${projectMembers.memberId} = ${members.id}
                        AND ${roles.name} = 'Colaborador'
                    )
                  `.as("collaborationsCount"),
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .leftJoin(projectTags, eq(projects.id, projectTags.projectId))
        .leftJoin(tags, eq(projectTags.tagId, tags.id))
        .leftJoin(projectImages, eq(projects.id, projectImages.projectId))
        .leftJoin(images, eq(projectImages.imageId, images.id))
        .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
        .leftJoin(members, eq(projectMembers.memberId, members.id))
        .leftJoin(memberTags, eq(members.id, memberTags.memberId))
        .leftJoin(memberTagsAlias, eq(memberTags.tagId, memberTagsAlias.id))
        .leftJoin(roles, eq(projectMembers.roleId, roles.id))
        .leftJoin(memberImages, eq(members.id, memberImages.memberId))
        .leftJoin(
          memberImagesAlias,
          eq(memberImages.imageId, memberImagesAlias.id)
        )
        .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
        .leftJoin(sounds, eq(memberSounds.soundId, sounds.id))
        .where(eq(projects.id, projectId))
        .orderBy(roles.priority);

      if (!rawData.length) {
        res.status(404).json({ error: "Proyecto no encontrado" });
        return;
      }

      const project = rawData[0];
      const projectDetails: ProjectEntry = {
        id: project.projectId,
        title: project.title,
        description: project.description,
        repository: project.repository,
        url: project.url,
        creator: {
          id: project.creatorId,
          name: project.creatorName,
          username: project.creatorUsername,
          image: project.creatorImage,
        },
        tags: [],
        images:
          project.projectImageType === "general"
            ? {
                url: project.projectImageUrl,
                publicId: project.projectImagePublicId,
                type: project.projectImageType,
              }
            : { url: null, publicId: null, type: null },
        members: [],
        hidden: project.hidden,
      };

      const tagSet = new Set<number>();
      const memberSet = new Set<number>();

      for (const row of rawData) {
        // Agregar tags al proyecto
        if (row.projectTagId && !tagSet.has(row.projectTagId)) {
          tagSet.add(row.projectTagId);
          projectDetails.tags.push({
            id: row.projectTagId,
            name: row.projectTagName,
          });
        }

        // Agregar miembros con todos los datos
        if (row.memberId && !memberSet.has(row.memberId)) {
          memberSet.add(row.memberId);
          projectDetails.members.push({
            id: row.memberId,
            name: row.memberName,
            username: row.memberUsername,
            userId: row.memberUserId,
            createdAt: row.memberCreatedAt,
            role: row.roleId ? { id: row.roleId, name: row.roleName } : null,
            description: row.memberDescription,
            hidden: row.memberHidden,
            github: row.memberGithub,
            phrase: row.memberPhrase,
            primaryColor: row.memberPrimaryColor,
            secondaryColor: row.memberSecondaryColor,
            tags: [],
            images: {
              avatar: { url: "", publicId: "" },
              banner: { url: "", publicId: "" },
            },
            sound: {
              url: row.soundUrl || "",
              path: row.soundPath || "",
              type: row.soundType || "",
            },
            projectsCount: Number(row.projectsCount) || 0,
            commentsCount: Number(row.commentsCount) || 0,
            collaborationsCount: Number(row.collaborationsCount) || 0,
          });
        }

        // Buscar el miembro ya agregado y actualizar datos adicionales
        const member = projectDetails.members.find(
          (m: any) => m.id === row.memberId
        );
        if (!member) continue;

        // Agregar tags al miembro
        if (
          row.memberTagId &&
          !member.tags.some((tag: Tag) => tag.id === row.memberTagId)
        ) {
          member.tags.push({ id: row.memberTagId, name: row.memberTagName });
        }

        // Asignar imagenes según el tipo
        if (row.memberImageType === "avatar" && row.memberImageUrl) {
          member.images.avatar = {
            url: row.memberImageUrl,
            publicId: row.memberImagePublicId,
          };
        }
        if (row.memberImageType === "banner" && row.memberImageUrl) {
          member.images.banner = {
            url: row.memberImageUrl,
            publicId: row.memberImagePublicId,
          };
        }
      }

      res.status(200).json(projectDetails);
    } catch (error) {
      console.error("Error al obtener el proyecto:", error);
      res.status(500).json({ error: "Error al obtener el proyecto" });
    }
  }
);

projectRouter.post("/project", async (req: Request, res: Response) => {
  try {
    const { RefreshToken } = req.cookies;

    if (!RefreshToken) {
      res.status(401).json({ error: "Unauthorized access" });
      return;
    }

    const {
      creator,
      title,
      description,
      images: requestImages,
      members: requestMembers,
      repository,
      tags,
      url,
    } = req.body;

    const userId = creator.id;
    const redisKey = `project_limit:${userId}`;

    // Atomicidad con Lua
    const limitScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], 86400)
      end
      return current
    `;

    const projectCount = await redisClient.eval(limitScript, {
      keys: [redisKey],
    });

    const count = Number(projectCount ?? 0);

    if (count > 2) {
      res.status(429).json({
        error: "Límite excedido: Máximo 2 proyectos por día",
        resetIn: await redisClient.ttl(redisKey),
      });
      return;
    }

    const newProject = await db
      .insert(projects)
      .values({
        title,
        description,
        repository,
        url,
        userId: creator.id,
        hidden: true,
      })
      .returning({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        repository: projects.repository,
        url: projects.url,
        userId: projects.userId,
      });

    const projectId = newProject[0].id;

    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: number) => ({
        projectId,
        tagId,
      }));
      await db.insert(projectTags).values(tagInserts);
    }

    if (requestImages) {
      const imagesToInsert = Array.isArray(requestImages)
        ? requestImages
        : [requestImages];

      const insertedImages = await db
        .insert(images)
        .values(
          imagesToInsert.map((img) => ({
            url: img.url,
            publicId: img.publicId,
          }))
        )
        .returning({ id: images.id });

      const imageAssociations = insertedImages.map((image) => ({
        projectId,
        imageId: image.id,
      }));

      await db.insert(projectImages).values(imageAssociations);
    }

    // Miembros
    if (requestMembers && requestMembers.length > 0) {
      // 1. Buscar el registro de member correspondiente al creador usando su userId.
      const creatorMemberRecord = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.userId, creator.id))
        .limit(1);

      if (!creatorMemberRecord || creatorMemberRecord.length === 0) {
        throw new Error(
          "No se encontró el registro de miembro para el creador"
        );
      }

      const creatorMemberId = creatorMemberRecord[0].id;

      // 2. Verificar si el ID del member del creador está en la lista enviada
      const creatorIncluded = requestMembers.includes(creatorMemberId);

      if (creatorIncluded) {
        // Insertar directamente en projectMembers para el creador.
        await db.insert(projectMembers).values({
          projectId,
          memberId: creatorMemberId,
          roleId: 4,
        });

        // Remover el creador del array para evitar enviarle una notificación.
      }

      const newMembers = requestMembers.filter(
        (memberId: number) => memberId !== creatorMemberId
      );

      // 3. Enviar invitaciones (notificaciones) a los miembros restantes.
      if (newMembers.length > 0) {
        // Buscar en la tabla 'members' los registros que tengan un id en newMembers
        const memberRecords = await db
          .select({ id: members.id, userId: members.userId })
          .from(members)
          .where(inArray(members.id, newMembers));

        // Mapear los registros para obtener las notificaciones con el userId correcto
        const memberInvites = memberRecords.map((member) => ({
          userId: member.userId, // Obtenemos el userId asociado al member
          senderId: creator.id, // El creador (userId) es quien envía la invitación.
          type: "project_invite",
          entityId: projectId,
          message: `Te han invitado a unirte al proyecto "${title}".`,
          status: "pending",
        }));

        await db.insert(notifications).values(memberInvites);
      }
    }

    res
      .status(200)
      .json({ message: "Proyecto creado y invitaciones enviadas." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el proyecto" });
  }
});

projectRouter.get(
  "/project/:projectId/members",
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "ID de proyecto inválido" });
      return;
    }

    const sort = req.query.sort === "desc" ? "desc" : "asc";
    const sortBy = req.query.sortBy || "rolePriority";

    const validSortFields: Record<string, SQL> = {
      rolePriority: sql`${roles.priority}`,
    };

    // Obtener campo y dirección de ordenamiento
    const orderDirection = sort === "asc" ? asc : desc;
    const orderField = validSortFields[sortBy as string];

    try {
      const membersData = await db
        .select({
          memberId: members.id,
          memberName: members.name,
          memberUsername: members.username,
          memberUserId: members.userId,
          memberDescription: members.description,
          memberHidden: members.hidden,
          memberGithub: members.github,
          memberPhrase: members.phrase,
          memberPrimaryColor: members.primaryColor,
          memberSecondaryColor: members.secondaryColor,
          memberCreatedAt: members.createdAt,
          tagId: tags.id,
          tagName: tags.name,
          roleId: roles.id,
          roleName: roles.name,
          memberImageType: memberImages.type,
          memberImageUrl: images.url,
          memberImagePublicId: images.publicId,
          soundId: sounds.id,
          soundUrl: sounds.url,
          soundPath: sounds.path,
          soundType: memberSounds.type,
          projectsCount:
            sql`(SELECT COUNT(*) FROM ${projects} WHERE ${projects.userId} = ${members.userId})`.as(
              "projectsCount"
            ),
          commentsCount:
            sql`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.authorId} = ${members.userId})`.as(
              "commentsCount"
            ),
          collaborationsCount: sql`
                    (
                      SELECT COUNT(*) 
                      FROM ${projectMembers}
                      JOIN ${roles} ON ${projectMembers.roleId} = ${roles.id}
                      WHERE ${projectMembers.memberId} = ${members.id}
                        AND ${roles.name} = 'Colaborador'
                    )
                  `.as("collaborationsCount"),
        })
        .from(projectMembers)
        .leftJoin(members, eq(projectMembers.memberId, members.id))
        .leftJoin(roles, eq(projectMembers.roleId, roles.id))
        .leftJoin(memberImages, eq(members.id, memberImages.memberId))
        .leftJoin(images, eq(memberImages.imageId, images.id))
        .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
        .leftJoin(sounds, eq(memberSounds.soundId, sounds.id))
        .leftJoin(memberTags, eq(members.id, memberTags.memberId))
        .leftJoin(tags, eq(memberTags.tagId, tags.id))
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(orderDirection(orderField));

      const membersMap = new Map<number, Member>();

      for (const row of membersData) {
        if (!row.memberId) continue;

        if (!membersMap.has(row.memberId)) {
          membersMap.set(row.memberId, {
            id: row.memberId,
            name: row.memberName || "",
            username: row.memberUsername || "",
            userId: row.memberUserId || "",
            createdAt: row.memberCreatedAt || "",
            role: row.roleId ? { id: row.roleId, name: row.roleName } : null,
            description: row.memberDescription,
            hidden: row.memberHidden || false,
            github: row.memberGithub,
            phrase: row.memberPhrase,
            primaryColor: row.memberPrimaryColor,
            secondaryColor: row.memberSecondaryColor,
            tags: [],
            images: {
              avatar: { url: "", publicId: "" },
              banner: { url: "", publicId: "" },
            },
            sound: {
              url: row.soundUrl || "",
              path: row.soundPath || "",
              type: row.soundType || "",
            },
            projectsCount: Number(row.projectsCount) || 0,
            commentsCount: Number(row.commentsCount) || 0,
            collaborationsCount: Number(row.collaborationsCount) || 0,
          });
        }

        const member = membersMap.get(row.memberId);
        if (member && member.images) {
          if (
            row.tagId &&
            !member.tags.some((tag: Tag) => tag.id === row.tagId)
          ) {
            member.tags.push({ id: row.tagId, name: row.tagName });
          }

          if (row.memberImageType === "avatar") {
            member.images.avatar = {
              url: row.memberImageUrl,
              publicId: row.memberImagePublicId,
            };
          }

          if (row.memberImageType === "banner") {
            member.images.banner = {
              url: row.memberImageUrl,
              publicId: row.memberImagePublicId,
            };
          }
        }
      }

      res.status(200).json(Array.from(membersMap.values()));
    } catch (error) {
      console.error("Error en /project/:id/members:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los miembros del proyecto" });
    }
  }
);

projectRouter.put(
  "/project/:projectId",
  async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { RefreshToken } = req.cookies;
      const {
        title,
        description,
        repository,
        url,
        images: requestImages,
        members: requestMembers,
        tags,
      } = req.body;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      // Obtener usuario autenticado desde la sesión
      const session = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.refreshToken, RefreshToken))
        .limit(1)
        .all();

      if (session.length === 0) {
        res.status(401).json({ error: "Sesión no válida" });
        return;
      }

      const authenticatedUserId = session[0].userId;

      // Obtener datos del usuario autenticado (rol y proyectos)
      const userData = await db
        .select({ roleId: users.roleId })
        .from(users)
        .where(eq(users.id, authenticatedUserId as string))
        .limit(1)
        .all();

      if (userData.length === 0) {
        res.status(403).json({ error: "Usuario no encontrado" });
        return;
      }

      const userRoleId = userData[0].roleId;

      // Obtener datos del proyecto
      const projectData = await db
        .select({ ownerId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
        .all();

      if (projectData.length === 0) {
        res.status(404).json({ error: "Proyecto no encontrado" });
        return;
      }

      const projectOwnerId = projectData[0].ownerId;

      // Verificar si el usuario es dueño o tiene permisos
      const allowedRoles = new Set(["Moderador", "Administrador"]);
      const roleData = await db
        .select({ roleName: roles.name })
        .from(roles)
        .where(eq(roles.id, userRoleId))
        .limit(1)
        .all();

      const userRoleName = roleData.length > 0 ? roleData[0].roleName : "";

      if (authenticatedUserId !== projectOwnerId && !allowedRoles.has(userRoleName)) {
        res.status(403).json({ error: "No tienes permisos para editar este proyecto" });
        return;
      }

      // Construir objeto de actualización evitando sobreescribir todos los valores
      const updatedFields: Partial<typeof projects.$inferSelect> = {
        hidden: true, // Ocultar proyecto para revisión
      };
      if (title) updatedFields.title = title;
      if (description) updatedFields.description = description;
      if (repository) updatedFields.repository = repository;
      if (url) updatedFields.url = url;

      if (Object.keys(updatedFields).length > 0) {
        await db
          .update(projects)
          .set(updatedFields)
          .where(eq(projects.id, projectId));
      }

      // Actualizar tags
      if (Array.isArray(tags)) {
        // Eliminar relaciones actuales de tags con el proyecto
        await db
          .delete(projectTags)
          .where(eq(projectTags.projectId, projectId));

        // Insertar nuevas relaciones
        if (tags.length > 0) {
          const tagAssociations = tags.map((tagId) => ({
            projectId: projectId,
            tagId: Number(tagId),
          }));

          await db.insert(projectTags).values(tagAssociations);
        }
      }

      // Actualizar imágenes sin modificar la relación
      const existingImage = await db
        .select({ imageId: projectImages.imageId })
        .from(projectImages)
        .where(eq(projectImages.projectId, projectId))
        .limit(1);

      if (requestImages?.url && requestImages?.publicId) {
        const imageId = existingImage[0]?.imageId;

        if (imageId !== null && imageId !== undefined) {
          // Si ya hay una imagen, actualizarla
          await db
            .update(images)
            .set({ url: requestImages.url, publicId: requestImages.publicId })
            .where(eq(images.id, imageId));
        }
      }

      // Actualizar miembros
      if (Array.isArray(requestMembers)) {
        const currentMemberIds = new Set(
          (
            await db
              .select({ memberId: projectMembers.memberId })
              .from(projectMembers)
              .where(eq(projectMembers.projectId, projectId))
          )
            .map((m) => m.memberId)
            .filter((id): id is number => id !== null)
        );
        const newMemberIds = new Set(
          requestMembers.map(Number).filter((id): id is number => !isNaN(id))
        );

        // Miembros a eliminar
        const membersToRemove = [...currentMemberIds].filter(
          (id) => !newMemberIds.has(id)
        );
        if (membersToRemove.length > 0) {
          await db
            .delete(projectMembers)
            .where(inArray(projectMembers.memberId, membersToRemove));
        }

        // Miembros a agregar
        const membersToAdd = [...newMemberIds].filter(
          (id) => !currentMemberIds.has(id)
        );
        if (membersToAdd.length > 0) {
          const memberRecords = await db
            .select({ id: members.id, userId: members.userId })
            .from(members)
            .where(inArray(members.id, membersToAdd));

          // Obtener usuarios con invitaciones pendientes para este proyecto
          const existingInvitations = new Set(
            (
              await db
                .select({ userId: notifications.userId })
                .from(notifications)
                .where(
                  and(
                    eq(notifications.entityId, projectId),
                    eq(notifications.type, "project_invite"),
                    eq(notifications.status, "pending"),
                    inArray(
                      notifications.userId,
                      memberRecords.map((m) => m.userId)
                    )
                  )
                )
            ).map((n) => n.userId)
          );

          // Filtrar solo los que NO tienen invitación pendiente
          const notificationsToInsert = memberRecords
            .filter((member) => !existingInvitations.has(member.userId))
            .map((member) => ({
              userId: member.userId,
              senderId: projectOwnerId,
              type: "project_invite",
              entityId: projectId,
              message: `Te han invitado a unirte al proyecto \"${title}\".`,
              status: "pending",
            }));

          // Insertar solo si hay nuevas invitaciones
          if (notificationsToInsert.length > 0) {
            await db.insert(notifications).values(notificationsToInsert);
          }
        }
      }

      res.status(200).json({ message: "Proyecto actualizado correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al actualizar el proyecto" });
    }
  }
);


projectRouter.delete(
  "/project/:projectId",
  async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      // Obtener usuario autenticado desde la sesión
      const session = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.refreshToken, RefreshToken))
        .limit(1)
        .all();

      if (session.length === 0) {
        res.status(401).json({ error: "Sesión no válida" });
        return;
      }

      const authenticatedUserId = session[0].userId;

      // Obtener datos del usuario autenticado (rol y proyectos)
      const userData = await db
        .select({ roleId: users.roleId })
        .from(users)
        .where(eq(users.id, authenticatedUserId as string))
        .limit(1)
        .all();

      if (userData.length === 0) {
        res.status(403).json({ error: "Usuario no encontrado" });
        return;
      }

      const userRoleId = userData[0].roleId;

      // Obtener datos del proyecto
      const projectData = await db
        .select({ ownerId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
        .all();

      if (projectData.length === 0) {
        res.status(404).json({ error: "Proyecto no encontrado" });
        return;
      }

      const projectOwnerId = projectData[0].ownerId;

      // Verificar si el usuario es dueño o tiene permisos
      const allowedRoles = new Set(["Moderador", "Administrador"]);
      const roleData = await db
        .select({ roleName: roles.name })
        .from(roles)
        .where(eq(roles.id, userRoleId))
        .limit(1)
        .all();

      const userRoleName = roleData.length > 0 ? roleData[0].roleName : "";

      if (authenticatedUserId !== projectOwnerId && !allowedRoles.has(userRoleName)) {
        res.status(403).json({ error: "No tienes permisos para eliminar este proyecto" });
        return;
      }

      // 1. Eliminar imágenes asociadas al proyecto
      const imagesToDelete = await db
        .select({ id: projectImages.imageId })
        .from(projectImages)
        .where(eq(projectImages.projectId, projectId));

      if (imagesToDelete.length > 0) {
        const imageIds = imagesToDelete.map((img) => img.id);
        const validImageIds = imageIds.filter(
          (id): id is number => id !== null
        );

        if (validImageIds.length > 0) {
          await db.delete(images).where(inArray(images.id, validImageIds));
        }
      }

      // 2. Eliminar notificaciones asociadas al proyecto
      await db
        .delete(notifications)
        .where(eq(notifications.entityId, projectId));

      // 3. Eliminar el proyecto (el cascade se encarga de relaciones restantes)
      await db.delete(projects).where(eq(projects.id, projectId));

      res.status(200).json({ message: "Proyecto eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      res.status(500).json({ error: "Error al eliminar el proyecto" });
    }
  }
);

// Visibility
projectRouter.patch(
  "/project/:projectId/visibility",
  async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { RefreshToken } = req.cookies;
      const { hidden } = req.body;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      if (typeof hidden !== "boolean") {
        res
          .status(400)
          .json({ error: "Parámetro 'hidden' inválido o faltante" });
        return;
      }

      // Verificar existencia del proyecto
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!existingProject.length) {
        res.status(404).json({ error: "Proyecto no encontrado" });
        return;
      }

      // Actualizar solo el campo hidden
      const updatedProject = await db
        .update(projects)
        .set({ hidden })
        .where(eq(projects.id, projectId))
        .returning({
          id: projects.id,
          title: projects.title,
          hidden: projects.hidden,
          userId: projects.userId,
        });

      res.status(200).json({
        message: "Visibilidad del proyecto actualizada",
        project: updatedProject[0],
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Error al actualizar la visibilidad del proyecto" });
    }
  }
);

projectRouter.get(
  "/project/:projectId/comments",
  async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);

    if (isNaN(projectId)) {
      res.status(400).json({ error: "Project id inválido" });
      return;
    }

    try {
      // Traemos todos los comentarios para el proyecto.
      const rawComments = await db
        .select({
          id: comments.id,
          projectId: comments.projectId,
          username: users.username,
          content: comments.content,
          parentId: comments.parentId,
          avatar: images.url,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .leftJoin(members, eq(members.userId, users.id))
        .leftJoin(
          memberImages,
          and(
            eq(memberImages.memberId, members.id),
            eq(memberImages.type, "avatar")
          )
        )
        .leftJoin(images, eq(images.id, memberImages.imageId))
        .where(eq(comments.projectId, projectId))
        .orderBy(comments.createdAt);

      // Usamos un map para relacionar cada comentario.
      const commentMap: { [key: number]: CommentResponse } = {};
      const topLevelComments: TopLevelCommentResponse[] = [];

      // Creamos la estructura base para cada comentario.
      for (const row of rawComments) {
        if (!row.parentId) {
          // Comentario de primer nivel
          const comment: TopLevelCommentResponse = {
            id: row.id,
            author: { username: row.username || "", avatar: row.avatar || "" },
            content: row.content,
            parentId: null,
            replies: [], // Solo en primer nivel
          };
          commentMap[row.id] = comment;
          topLevelComments.push(comment);
        } else {
          // Reply: no incluye el campo "replies"
          const comment: ReplyCommentResponse = {
            id: row.id,
            author: { username: row.username || "", avatar: row.avatar || "" },
            content: row.content,
            parentId: row.parentId,
          };
          commentMap[row.id] = comment;
        }
      }

      // Asignamos cada reply a su comentario de nivel superior y agregamos "replyTo" solo si no es respuesta directa al comentario principal.
      for (const row of rawComments) {
        if (row.parentId) {
          // Obtenemos el comentario inmediato al que se responde.
          const immediateParent = commentMap[row.parentId];
          // Buscamos el comentario de primer nivel recorriendo la cadena.
          let topLevelParent = immediateParent;
          while (topLevelParent.parentId !== null) {
            topLevelParent = commentMap[topLevelParent.parentId];
          }
          // Obtenemos el reply actual.
          const reply = commentMap[row.id] as ReplyCommentResponse;
          // Si el comentario inmediato NO es de primer nivel, entonces es una respuesta a otro reply.
          if (immediateParent.parentId !== null) {
            reply.replyTo = immediateParent.author.username;
          }
          // Agregamos el reply a la lista de respuestas del comentario de primer nivel.
          topLevelParent.replies.push(reply);
        }
      }

      res.status(200).json(topLevelComments);
    } catch (error) {
      console.error("Error al obtener comentarios del proyecto:", error);
      res.status(500).json({ error: "Error al obtener los comentarios" });
    }
  }
);

projectRouter.post(
  "/project/:projectId/comments",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      const projectId = parseInt(req.params.projectId);
      const { content, parentCommentId, userId } = req.body;

      if (isNaN(projectId) || !content.trim()) {
        res.status(400).json({ error: "Datos inválidos" });
        return;
      }

      const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
      const redisKey = `comments:${userId}:${today}`;
      const maxCommentsPerDay = 30;

      // Obtener la cantidad actual de comentarios
      const currentCount = (await redisClient.get(redisKey)) || "0";
      const commentCount = parseInt(currentCount, 10);

      if (commentCount >= maxCommentsPerDay) {
        res
          .status(429)
          .json({ error: "Límite de comentarios alcanzado por hoy" });
        return;
      }

      // Incrementar el contador en Redis y establecer expiración de 24h si es el primer comentario del día
      await redisClient.incr(redisKey);
      if (commentCount === 0) {
        await redisClient.expire(redisKey, 86400); // Expira en 24 horas
      }

      await db
        .insert(comments)
        .values({
          projectId,
          content,
          authorId: userId,
          parentId: parentCommentId,
        })
        .returning();

      res.status(200).json({ message: "Comentario enviado con éxito" });
    } catch (error) {
      console.error("Error al agregar comentario:", error);
      res.status(500).json({ error: "Error al agregar el comentario" });
    }
  }
);

projectRouter.get(
  "/comments",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      const rawComments = await db
        .select({
          id: comments.id,
          projectId: comments.projectId,
          username: users.username,
          projectTitle: projects.title,
          content: comments.content,
          parentId: comments.parentId,
          avatar: images.url,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .leftJoin(members, eq(members.userId, users.id))
        .leftJoin(
          memberImages,
          and(
            eq(memberImages.memberId, members.id),
            eq(memberImages.type, "avatar")
          )
        )
        .leftJoin(images, eq(images.id, memberImages.imageId))
        .leftJoin(projects, eq(comments.projectId, projects.id))
        .orderBy(desc(comments.createdAt));

      res.status(200).json(rawComments);
    } catch {
      console.error("Error al obtener comentarios");
      res.status(500).json({ error: "Error al obtener los comentarios" });
    }
  }
);

projectRouter.delete(
  "/comments",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      const { commentId } = req.body;

      if (!commentId || isNaN(commentId)) {
        res.status(400).json({ error: "ID de comentario inválido" });
        return;
      }

      // Verificar si el comentario existe
      const commentExists = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (commentExists.length === 0) {
        res.status(404).json({ error: "Comentario no encontrado" });
        return;
      }

      // Eliminar primero las respuestas al comentario (en caso de que las haya)
      await db.delete(comments).where(eq(comments.parentId, commentId));

      // Luego, eliminar el comentario principal
      await db.delete(comments).where(eq(comments.id, commentId));

      res.status(200).json({ message: "Comentario eliminado con éxito" });
    } catch (error) {
      console.error("Error al eliminar comentario:", error);
      res.status(500).json({ error: "Error al eliminar el comentario" });
    }
  }
);

// Project Like

projectRouter.post(
  "/project/:projectId/like",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).json({ success: false, error: "Acceso no autorizado" });
        return;
      }

      const projectId = parseInt(req.params.projectId);
      const { userId } = req.body;

      // Validamos que projectId sea un número y que userId esté presente
      if (isNaN(projectId) || !userId) {
        res.status(400).json({ success: false, error: "Datos inválidos" });
        return;
      }

      // Ejecutamos en una transacción para asegurar la atomicidad
      await db.transaction(async (tx) => {
        // Intentamos eliminar el like
        const deleteResult = await tx
          .delete(projectLikes)
          .where(
            and(
              eq(projectLikes.projectId, projectId),
              eq(projectLikes.userId, userId)
            )
          );

        // Si no se eliminó nada, insertamos el like
        if (deleteResult.rowsAffected === 0) {
          await tx
            .insert(projectLikes)
            .values({ projectId, userId })
            .onConflictDoNothing();
        }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error al togglear like:", error);
      res.status(500).json({ success: false, error: "Error en el servidor" });
    }
  }
);
