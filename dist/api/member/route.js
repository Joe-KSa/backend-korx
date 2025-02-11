var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { db } from "../../db/index.js";
import express from "express";
import { tags, members, roles, memberTags } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";
export const memberRouter = express.Router();
memberRouter.get("/member", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const membersData = yield db
            .select({
            id: members.id,
            name: members.name,
            username: members.username,
            role: {
                id: roles.id,
                name: roles.name,
            },
            description: members.description,
            image: members.image,
            publicId: members.publicId,
            hidden: members.hidden,
            banner: members.banner,
            publicBannerId: members.publicBannerId,
            github: members.github,
            phrase: members.phrase,
            primaryColor: members.primaryColor,
            secondaryColor: members.secondaryColor,
            soundUrl: members.soundUrl,
            soundPath: members.soundPath,
            createdAt: members.createdAt,
        })
            .from(members)
            .leftJoin(roles, eq(members.roleId, roles.id));
        const tagsData = yield db
            .select({
            memberId: memberTags.memberId,
            id: tags.id,
            name: tags.name,
        })
            .from(memberTags)
            .leftJoin(tags, eq(memberTags.tagId, tags.id));
        const membersWithTags = membersData.map((member) => {
            const memberTags = tagsData
                .filter((tag) => tag.memberId === member.id)
                .map((tag) => ({ id: tag.id, name: tag.name }));
            return Object.assign(Object.assign({}, member), { tags: memberTags });
        });
        res.status(200).json(membersWithTags);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener los miembros" });
    }
}));
memberRouter.get("/member/:username", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        const { username } = req.params;
        // Obtener los datos del miembro con el username especificado
        const memberData = yield db
            .select({
            id: members.id,
            name: members.name,
            username: members.username,
            role: {
                id: roles.id,
                name: roles.name,
            },
            description: members.description,
            image: members.image,
            publicId: members.publicId,
            banner: members.banner,
            publicBannerId: members.publicBannerId,
            hidden: members.hidden,
            github: members.github,
            phrase: members.phrase,
            soundUrl: members.soundUrl,
            soundPath: members.soundPath,
            primaryColor: members.primaryColor,
            secondaryColor: members.secondaryColor,
            createdAt: members.createdAt,
        })
            .from(members)
            .leftJoin(roles, eq(members.roleId, roles.id))
            .where(eq(members.username, username))
            .then((result) => result[0]); // Tomar solo el primer resultado
        if (!memberData) {
            res.status(404).json({ error: "Miembro no encontrado" });
            return;
        }
        // Obtener las etiquetas del miembro
        const tagsData = yield db
            .select({
            memberId: memberTags.memberId,
            id: tags.id,
            name: tags.name,
        })
            .from(memberTags)
            .leftJoin(tags, eq(memberTags.tagId, tags.id))
            .where(eq(memberTags.memberId, memberData.id));
        // Agregar las etiquetas al miembro
        const memberWithTags = Object.assign(Object.assign({}, memberData), { tags: tagsData.map((tag) => ({ id: tag.id, name: tag.name })) });
        res.status(200).json(memberWithTags);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener el miembro" });
    }
}));
memberRouter.put("/member/:id", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).send("Unauthorized access");
            return;
        }
        const { id } = req.params;
        if (!id) {
            throw new Error("ID is required");
        }
        const memberId = parseInt(id, 10);
        if (isNaN(memberId)) {
            throw new Error("Invalid ID");
        }
        const { name, role, description, image, publicId, tags, banner, publicBannerId, phrase, github, primaryColor, secondaryColor, soundUrl, soundPath, } = yield req.body;
        const updateData = {};
        if (name !== undefined && name !== "")
            updateData.name = name;
        if (role !== undefined && role !== "")
            updateData.roleId = role;
        if (description !== undefined)
            updateData.description = description;
        if (publicId !== undefined && publicId !== "")
            updateData.publicId = publicId;
        if (image !== undefined && image !== "")
            updateData.image = image;
        if (banner !== undefined && banner !== "")
            updateData.banner = banner;
        if (publicBannerId !== undefined && publicBannerId !== "")
            updateData.publicBannerId = publicBannerId;
        if (phrase !== undefined)
            updateData.phrase = phrase;
        if (github !== undefined)
            updateData.github = github;
        if (primaryColor !== undefined)
            updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined)
            updateData.secondaryColor = secondaryColor;
        if (soundUrl !== undefined)
            updateData.soundUrl = soundUrl;
        if (soundPath !== undefined)
            updateData.soundPath = soundPath;
        if (Object.keys(updateData).length === 0) {
            throw new Error("No fields to update");
        }
        yield db
            .update(members)
            .set(updateData)
            .where(eq(members.id, memberId))
            .returning({ name: members.name, description: members.description });
        if (tags !== undefined) {
            // Eliminar los tags existentes
            yield db.delete(memberTags).where(eq(memberTags.memberId, memberId));
            if (tags.length > 0) {
                // Insertar los nuevos tags si hay alguno
                const tagInserts = tags.map((tagId) => ({ memberId, tagId }));
                yield db.insert(memberTags).values(tagInserts);
            }
        }
        res.status(200).json({ message: `Miembro actualizado` });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar el miembro" });
    }
}));
