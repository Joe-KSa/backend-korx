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
import { projects, tags, projectTags, members, projectMembers, } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";
export const projectRouter = express.Router();
projectRouter.get("/project", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectsData = yield db
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
        const projectTagsData = yield db
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
            return Object.assign(Object.assign({}, project), { tags: projectTags });
        });
        const membersData = yield db
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
            return Object.assign(Object.assign({}, project), { members: projectMembers });
        });
        res.status(200).json(projectsWithMembers);
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
            res.status(401).send("Unauthorized access");
            return;
        }
        const projectData = yield db
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
        const projectTagsData = yield db
            .select({
            projectId: projectTags.projectId,
            id: tags.id,
            name: tags.name,
        })
            .from(projectTags)
            .leftJoin(tags, eq(projectTags.tagId, tags.id))
            .where(eq(projectTags.projectId, Number(id)));
        // Obtener los miembros del proyecto
        const membersData = yield db
            .select({
            id: members.id,
            name: members.name,
            projectId: projectMembers.projectId,
        })
            .from(members)
            .leftJoin(projectMembers, eq(projectMembers.memberId, members.id))
            .where(eq(projectMembers.projectId, Number(id)));
        const projectWithTags = Object.assign(Object.assign({}, projectData[0]), { tags: projectTagsData.map((tag) => ({ id: tag.id, name: tag.name })), members: membersData.map((member) => ({
                id: member.id,
                name: member.name,
            })) });
        res.status(200).json(projectWithTags);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el proyecto" });
    }
}));
projectRouter.post("/project", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        const { title, description, image, publicId, url, repository, tags } = yield req.body();
        const newProject = yield db
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
            const tagInserts = tags.map((tagId) => ({
                projectId,
                tagId,
            }));
            yield db.insert(projectTags).values(tagInserts);
        }
        res.status(201).json(newProject);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: "An error ocurred" });
    }
}));
