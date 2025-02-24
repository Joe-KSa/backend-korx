import { db } from "../../db/index.js";
import express from "express";
import { Request, Response } from "express";
import {
  tags,
  members,
  roles,
  users,
  memberTags,
  images,
  memberImages,
  memberSounds,
  sounds,
  projects
} from "../../db/schema.js";
import { eq, desc, asc, sql, SQL } from "drizzle-orm";
import type { Member, Tag } from "../../core/types.js";
import checkAuth from "../../middleware/checkAuth.js";

export const memberRouter = express.Router();

memberRouter.get("/member", async (req: Request, res: Response) => {
  try {
    const sort = req.query.sort === 'desc' ? 'desc' : 'asc';
    const sortBy = req.query.sortBy || 'id';
    
    // Definir campos válidos para ordenamiento
    const validSortFields: Record<string, SQL> = {
      projectsCount: sql`(SELECT COUNT(*) FROM ${projects} WHERE ${projects.userId} = ${members.userId})`,
      name: sql`${members.name}`,
      createdAt: sql`${members.createdAt}`,
      id: sql`${members.id}`,
      rolePriority: sql`${roles.priority}`
    };
    
    // Obtener campo y dirección de ordenamiento
    const orderDirection = sort === 'asc' ? asc : desc;
    const orderField = validSortFields[sortBy as string] || members.id;

    const rawData = await db
      .select({
        memberId: members.id,
        userId: members.userId,
        name: members.name,
        username: members.username,
        roleId: users.roleId,
        roleName: roles.name,
        description: members.description,
        hidden: members.hidden,
        github: members.github,
        phrase: members.phrase,
        primaryColor: members.primaryColor,
        secondaryColor: members.secondaryColor,
        tagId: tags.id,
        tagName: tags.name,
        createdAt: members.createdAt,
        imageUrl: images.url,
        imagePublicId: images.publicId,
        imageType: memberImages.type,
        soundId: sounds.id,
        rolePriority: roles.priority,
        soundUrl: sounds.url,
        soundPath: sounds.path,
        soundType: memberSounds.type,
        projectsCount: sql`(SELECT COUNT(*) FROM ${projects} WHERE ${projects.userId} = ${members.userId})`.as("projectsCount"),
      })
      .from(members)
      .leftJoin(users, eq(members.userId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(memberTags, eq(members.id, memberTags.memberId))
      .leftJoin(tags, eq(memberTags.tagId, tags.id))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(images, eq(memberImages.imageId, images.id))
      .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
      .leftJoin(sounds, eq(memberSounds.soundId, sounds.id))
      .orderBy(orderDirection(orderField));

    if (!rawData.length) {
      res.status(200).json([]);
      return;
    }

    const membersMap = new Map<number, Member>();

    for (const row of rawData) {
      if (!membersMap.has(row.memberId)) {
        membersMap.set(row.memberId, {
          id: row.memberId,
          name: row.name,
          username: row.username,
          userId: row.userId,
          createdAt: row.createdAt,
          role: {
            id: row.roleId,
            name: row.roleName,
          },
          description: row.description,
          hidden: row.hidden,
          github: row.github,
          phrase: row.phrase,
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
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
        });
      }

      const member = membersMap.get(row.memberId)!;

      if (row.tagId && !member.tags.some((tag: Tag) => tag.id === row.tagId)) {
        member.tags.push({ id: row.tagId, name: row.tagName });
      }
    

      if (member.images && row.imageType === "avatar") {
        member.images.avatar = {
          url: row.imageUrl || "",
          publicId: row.imagePublicId || "",
        };
      }

      if (member.images && row.imageType === "banner") {
        member.images.banner = {
          url: row.imageUrl || "",
          publicId: row.imagePublicId || "",
        };
      }
    }

    const sortedMembers = Array.from(membersMap.values());

    // Ordenamiento adicional en caso necesario
    if (sortBy === 'projectsCount') {
      sortedMembers.sort((a, b) => 
        sort === 'desc' 
          ? a.projectsCount - b.projectsCount 
          : b.projectsCount - a.projectsCount
      );
    }

    res.status(200).json(sortedMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los miembros" });
  }
});

memberRouter.put(
  "/member/:id",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      const { id } = req.params;
      const memberId = parseInt(id, 10);
      if (isNaN(memberId)) {
        res.status(400).send("Invalid ID");
        return;
      }

      const {
        name,
        description,
        tags,
        github,
        primaryColor,
        secondaryColor,
        sound,
        images: requestImages,
      } = req.body;

      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (github !== undefined) updateData.github = github;
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (secondaryColor !== undefined)
        updateData.secondaryColor = secondaryColor;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(members)
          .set(updateData)
          .where(eq(members.id, memberId));
      }

      if (Array.isArray(tags)) {
        await db.delete(memberTags).where(eq(memberTags.memberId, memberId));
        const newTags = tags.map((tagId) => ({
          memberId,
          tagId: parseInt(tagId, 10),
        }));
        if (newTags.length) await db.insert(memberTags).values(newTags);
      }

      async function getOrInsertImage(imageUrl: string): Promise<number> {
        const existingImage = await db
          .select()
          .from(images)
          .where(eq(images.url, imageUrl))
          .limit(1);

        if (existingImage.length > 0) {
          return existingImage[0].id;
        }

        const [newImage] = await db
          .insert(images)
          .values({ url: imageUrl })
          .returning({ id: images.id });

        return newImage.id;
      }

      const currentImages = await db
        .select({
          id: images.id,
          url: images.url,
          publicId: images.publicId,
          type: memberImages.type,
        })
        .from(memberImages)
        .leftJoin(images, eq(memberImages.imageId, images.id))
        .where(eq(memberImages.memberId, memberId));

      async function updateImage(
        type: "avatar" | "banner",
        newData?: { url?: string; publicId?: string }
      ) {
        const currentImage = currentImages.find((img) => img.type === type);

        const newUrl = newData?.url?.trim();
        const newPublicId = newData?.publicId;

        if (!newUrl && !newPublicId) return; // No hay datos para actualizar

        if (currentImage?.id) {
          const updateFields: Record<string, string> = {};

          if (newUrl && currentImage.url !== newUrl) updateFields.url = newUrl;
          if (newPublicId && currentImage.publicId !== newPublicId)
            updateFields.publicId = newPublicId;

          if (Object.keys(updateFields).length > 0) {
            await db
              .update(images)
              .set(updateFields)
              .where(eq(images.id, currentImage.id));
          }
        } else if (newUrl) {
          // Si no hay imagen previa, inserta una nueva
          const imageId = await getOrInsertImage(newUrl);
          await db.insert(memberImages).values({ memberId, imageId, type });
        }
      }

      if (requestImages) {
        await updateImage("avatar", requestImages.avatar);
        await updateImage("banner", requestImages.banner);
      }

      const currentSound = await db
        .select({ id: sounds.id, url: sounds.url, path: sounds.path })
        .from(memberSounds)
        .innerJoin(sounds, eq(memberSounds.soundId, sounds.id))
        .where(eq(memberSounds.memberId, memberId))
        .limit(1);

      const existingSound = currentSound.length > 0 ? currentSound[0] : null;

      if (sound?.url && sound?.path) {
        if (
          !existingSound ||
          existingSound.url !== sound.url ||
          existingSound.path !== sound.path
        ) {
          if (existingSound) {
            await db
              .update(sounds)
              .set({ url: sound.url, path: sound.path })
              .where(eq(sounds.id, existingSound.id));
          } else {
            const [newSound] = await db
              .insert(sounds)
              .values({ url: sound.url, path: sound.path })
              .returning({ id: sounds.id });

            await db.insert(memberSounds).values({
              memberId,
              soundId: newSound.id,
              type: sound.type || "general",
            });
          }
        }
      } else if (existingSound) {
        await db
          .update(sounds)
          .set({
            url: "",
            path: sound.path?.trim() !== "" ? sound.path : existingSound.path,
          })
          .where(eq(sounds.id, existingSound.id));
      }

      res.status(200).send("Member updated successfully");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

memberRouter.get("/member/:username", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const rawData = await db
      .select({
        memberId: members.id,
        name: members.name,
        username: members.username,
        userId: members.userId,
        roleId: roles.id,
        roleName: roles.name,
        description: members.description,
        hidden: members.hidden,
        github: members.github,
        phrase: members.phrase,
        primaryColor: members.primaryColor,
        secondaryColor: members.secondaryColor,
        tagId: tags.id,
        tagName: tags.name,
        imageUrl: images.url,
        imagePublicId: images.publicId,
        imageType: memberImages.type,
        soundId: sounds.id,
        soundUrl: sounds.url,
        soundPath: sounds.path,
        soundType: memberSounds.type,
        createdAt: members.createdAt,
      })
      .from(members)
      .leftJoin(roles, eq(members.roleId, roles.id))
      .leftJoin(memberTags, eq(members.id, memberTags.memberId))
      .leftJoin(tags, eq(memberTags.tagId, tags.id))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(images, eq(memberImages.imageId, images.id))
      .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
      .leftJoin(sounds, eq(memberSounds.soundId, sounds.id))
      .where(eq(members.username, username));

    if (!rawData.length) {
      res.status(404).json({ error: "Miembro no encontrado" });
      return;
    }

    const memberData: Omit<Member, "projectsCount"> = {
      id: rawData[0].memberId,
      name: rawData[0].name,
      username: rawData[0].username,
      userId: rawData[0].userId,
      createdAt: rawData[0].createdAt,
      role: {
        id: rawData[0].roleId,
        name: rawData[0].roleName,
      },
      description: rawData[0].description,
      hidden: rawData[0].hidden,
      github: rawData[0].github,
      phrase: rawData[0].phrase,
      primaryColor: rawData[0].primaryColor,
      secondaryColor: rawData[0].secondaryColor,
      tags: [],
      images: {
        avatar: { url: "", publicId: "" },
        banner: { url: "", publicId: "" },
      },
      sound: {
        url: rawData[0].soundUrl,
        path: rawData[0].soundPath,
        type: rawData[0].soundType,
      },
    };

    for (const row of rawData) {
      if (row.tagId && !memberData.tags.some((tag) => tag.id === row.tagId)) {
        memberData.tags.push({ id: row.tagId, name: row.tagName });
      }

      if (memberData.images) {
        if (row.imageType === "avatar") {
          memberData.images.avatar = {
            url: row.imageUrl,
            publicId: row.imagePublicId,
          };
        }

        if (row.imageType === "banner") {
          memberData.images.banner = {
            url: row.imageUrl,
            publicId: row.imagePublicId,
          };
        }
      }
    }

    res.status(200).json(memberData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el miembro" });
  }
});
