import express from "express";
import type { Request, Response } from "express";

import { db } from "../../db/index.js";
import {
  projects,
  tags,
  projectTags,
  members,
  projectMembers,
} from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type {
  projectEntry,
  tagProjectEntry,
  projectMemberEntry,
} from "../../core/types.js";
import checkAuth from "../../middleware/checkAuth.js";

export const projectRouter = express.Router();

projectRouter.get("/project", async (_req: Request, res: Response) => {
  try {
    const projectsData: projectEntry[] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        repository: projects.repository,
        url: projects.url,
        image: projects.image,
        publicId: projects.publicId,
        creator: {
          id: members.id,
          name: members.name,
          username: members.username,
          image: members.image,
        },
      })
      .from(projects)
      .leftJoin(members, eq(projects.memberId, members.id));

    const projectTagsData: tagProjectEntry[] = await db
      .select({
        projectId: projectTags.projectId,
        id: tags.id,
        name: tags.name,
      })
      .from(projectTags)
      .leftJoin(tags, eq(projectTags.tagId, tags.id));

    const projectWithTags = projectsData.map((project) => {
      const projectTags = projectTagsData
        .filter((tag) => tag.projectId === project.id)
        .map((tag) => ({ id: tag.id, name: tag.name }));
      return { ...project, tags: projectTags };
    });

    const membersData: projectMemberEntry[] = await db
      .select({
        id: members.id,
        name: members.name,
        projectId: projectMembers.projectId,
      })
      .from(members)
      .leftJoin(projectMembers, eq(projectMembers.memberId, members.id));

    const projectsWithMembers = projectWithTags.map((project) => {
      const projectMembers = membersData
        .filter((member) => member.projectId === project.id)
        .map((member) => ({ id: member.id, name: member.name }));

      return { ...project, members: projectMembers };
    });

    res.status(200).json(projectsWithMembers);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los proyectos" });
  }
});

projectRouter.get("/project/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { RefreshToken } = req.cookies;

    if (!RefreshToken) {
      res.status(401).send("Unauthorized access");
      return;
    }

    const projectData: projectEntry[] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        repository: projects.repository,
        url: projects.url,
        image: projects.image,
        publicId: projects.publicId,
        creator: {
          id: members.id,
          name: members.name,
          username: members.username,
          image: members.image,
        },
      })
      .from(projects)
      .where(eq(projects.id, Number(id)));

    if (projectData.length === 0) {
      res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const projectTagsData: tagProjectEntry[] = await db
      .select({
        projectId: projectTags.projectId,
        id: tags.id,
        name: tags.name,
      })
      .from(projectTags)
      .leftJoin(tags, eq(projectTags.tagId, tags.id))
      .where(eq(projectTags.projectId, Number(id)));

    // Obtener los miembros del proyecto
    const membersData: projectMemberEntry[] = await db
      .select({
        id: members.id,
        name: members.name,
        projectId: projectMembers.projectId,
      })
      .from(members)
      .leftJoin(projectMembers, eq(projectMembers.memberId, members.id))
      .where(eq(projectMembers.projectId, Number(id)));

    const projectWithTags = {
      ...projectData[0],
      tags: projectTagsData.map((tag) => ({ id: tag.id, name: tag.name })),
      members: membersData.map((member) => ({
        id: member.id,
        name: member.name,
      })),
    };

    res.status(200).json(projectWithTags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el proyecto" });
  }
});

projectRouter.post(
  "/project",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      
      const { title, description, image, publicId, url, repository, tags } =
        await req.body();

      const newProject = await db
        .insert(projects)
        .values({
          title,
          description,
          image,
          publicId,
          url,
          repository,
        })
        .returning({
          id: projects.id,
          title: projects.title,
          description: projects.description,
          image: projects.image,
          publicId: projects.publicId,
          url: projects.url,
          repository: projects.repository,
        });

      const projectId = newProject[0].id;

      if (tags && tags.length > 0) {
        const tagInserts = tags.map((tagId: number) => ({
          projectId,
          tagId,
        }));
        await db.insert(projectTags).values(tagInserts);
      }

      res.status(201).json(newProject);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "An error ocurred" });
    }
  }
);
