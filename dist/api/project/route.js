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
import { projects, tags, projectTags, members, projectMembers, users, projectImages, images, } from "../../db/schema.js";
import { eq } from "drizzle-orm";
export const projectRouter = express.Router();
projectRouter.get("/project", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawData = yield db
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
        })
            .from(projects)
            .leftJoin(users, eq(projects.userId, users.id))
            .leftJoin(projectTags, eq(projects.id, projectTags.projectId))
            .leftJoin(tags, eq(projectTags.tagId, tags.id))
            .leftJoin(projectImages, eq(projects.id, projectImages.projectId))
            .leftJoin(images, eq(projectImages.imageId, images.id))
            .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
            .leftJoin(members, eq(projectMembers.memberId, members.id));
        // Estructura de proyectos con agrupación en memoria
        const projectsMap = new Map();
        for (const row of rawData) {
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
                    images: row.imageType === "general"
                        ? { url: row.imageUrl, publicId: row.imagePublicId, type: row.imageType }
                        : { url: null, publicId: null, type: null },
                    members: [],
                });
            }
            const project = projectsMap.get(row.projectId);
            // Agregar etiquetas sin duplicados
            if (row.tagId && !project.tags.some((tag) => tag.id === row.tagId)) {
                project.tags.push({ id: row.tagId, name: row.tagName });
            }
            // Agregar miembros sin duplicados
            if (row.memberId && !project.members.some((m) => m.id === row.memberId)) {
                project.members.push({ id: row.memberId, name: row.memberName });
            }
        }
        res.status(200).json(Array.from(projectsMap.values()));
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener los proyectos" });
    }
}));
projectRouter.get("/project/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).json({ error: "Unauthorized access" });
            return;
        }
        const rawData = yield db
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
        const projectDetails = {
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
        const tagSet = new Set();
        const imageSet = new Set();
        const memberSet = new Set();
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el proyecto" });
    }
}));
