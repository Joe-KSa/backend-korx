import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  projects,
  tags,
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
} from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { ProjectEntry, Tag, Member } from "../../core/types.js";

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
        creatorImage: users.image,
        tagId: tags.id,
        tagName: tags.name,
        imageUrl: images.url,
        imagePublicId: images.publicId,
        imageType: projectImages.type,
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
        memberImageUrl: images.url,
        memberImagePublicId: images.publicId,
        soundId: sounds.id,
        soundUrl: sounds.url,
        soundPath: sounds.path,
        soundType: memberSounds.type,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .leftJoin(projectTags, eq(projects.id, projectTags.projectId))
      .leftJoin(tags, eq(projectTags.tagId, tags.id))
      .leftJoin(projectImages, eq(projects.id, projectImages.projectId))
      .leftJoin(images, eq(projectImages.imageId, images.id))
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(members, eq(projectMembers.memberId, members.id))
      .leftJoin(roles, eq(members.roleId, roles.id))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
      .leftJoin(sounds, eq(memberSounds.soundId, sounds.id));

    const projectsMap = new Map<number, ProjectEntry>();

    for (const row of rawData) {
      if (!row.projectId) continue;

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
            row.imageType === "general"
              ? { url: row.imageUrl, publicId: row.imagePublicId, type: row.imageType }
              : { url: null, publicId: null, type: null },
          members: [],
        });
      }

      const project = projectsMap.get(row.projectId)!;
      if (!project) continue;

      if (row.tagId && !project.tags.some((tag: Tag) => tag.id === row.tagId)) {
        project.tags.push({ id: row.tagId, name: row.tagName });
      }

      if (row.memberId && !project.members.some((m: Member) => m.id === row.memberId)) {
        project.members.push({
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
        });
      }

      const member = project.members.find((m: any) => m.id === row.memberId);
      if (!member) continue;

      if (row.tagId && !member.tags.some((tag: Tag) => tag.id === row.tagId)) {
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

    res.status(200).json(Array.from(projectsMap.values()));
  } catch (error) {
    console.error("Error en /project:", error);
    res.status(500).json({ error: "Error al obtener los proyectos" });
  }
});



projectRouter.get("/project/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { RefreshToken } = req.cookies;

    if (!RefreshToken) {
      res.status(401).json({ error: "Unauthorized access" });
      return;
    }

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
        creatorImage: users.image,
        tagId: tags.id,
        tagName: tags.name,
        imageUrl: images.url,
        imagePublicId: images.publicId,
        imageType: projectImages.type,
        memberId: members.id,
        memberName: members.name,
        memberUsername: members.username,
        memberRoleId: members.roleId,
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .leftJoin(projectTags, eq(projects.id, projectTags.projectId))
      .leftJoin(tags, eq(projectTags.tagId, tags.id))
      .leftJoin(projectImages, eq(projects.id, projectImages.projectId))
      .leftJoin(images, eq(projectImages.imageId, images.id))
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(members, eq(projectMembers.memberId, members.id))
      .where(eq(projects.id, Number(id)));

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
      images: [],
      members: [],
    };

    const tagSet = new Set<number>();
    const imageSet = new Set<string>();
    const memberSet = new Set<number>();

    for (const row of rawData) {
      if (row.tagId && !tagSet.has(row.tagId)) {
        tagSet.add(row.tagId);
        projectDetails.tags.push({ id: row.tagId, name: row.tagName });
      }

      if (row.imageUrl && !imageSet.has(row.imageUrl)) {
        imageSet.add(row.imageUrl);
        projectDetails.images.push({
          url: row.imageUrl,
          publicId: row.imagePublicId,
          type: row.imageType,
        });
      }

      if (row.memberId && !memberSet.has(row.memberId)) {
        memberSet.add(row.memberId);
        projectDetails.members.push({
          id: row.memberId,
          name: row.memberName,
          username: row.memberUsername,
          roleId: row.memberRoleId,
        });
      }
    }

    res.status(200).json(projectDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el proyecto" });
  }
});


