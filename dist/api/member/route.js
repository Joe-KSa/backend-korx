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
import { tags, members, roles, memberTags, images, memberImages, memberSounds, sounds, } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";
export const memberRouter = express.Router();
memberRouter.get("/member", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawData = yield db
            .select({
            memberId: members.id,
            name: members.name,
            username: members.username,
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
            createdAt: members.createdAt,
            imageUrl: images.url,
            imagePublicId: images.publicId,
            imageType: memberImages.type,
            soundId: sounds.id,
            soundUrl: sounds.url,
            soundPath: sounds.path,
            soundType: memberSounds.type,
        })
            .from(members)
            .leftJoin(roles, eq(members.roleId, roles.id))
            .leftJoin(memberTags, eq(members.id, memberTags.memberId))
            .leftJoin(tags, eq(memberTags.tagId, tags.id))
            .leftJoin(memberImages, eq(members.id, memberImages.memberId))
            .leftJoin(images, eq(memberImages.imageId, images.id))
            .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
            .leftJoin(sounds, eq(memberSounds.soundId, sounds.id));
        if (!rawData.length) {
            res.status(200).json([]);
            return;
        }
        const membersMap = new Map();
        for (const row of rawData) {
            if (!membersMap.has(row.memberId)) {
                membersMap.set(row.memberId, {
                    id: row.memberId,
                    name: row.name,
                    username: row.username,
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
                });
            }
            const member = membersMap.get(row.memberId);
            if (row.tagId && !member.tags.some((tag) => tag.id === row.tagId)) {
                member.tags.push({ id: row.tagId, name: row.tagName });
            }
            if (member.images) {
                if (row.imageType === "avatar") {
                    member.images.avatar = {
                        url: row.imageUrl,
                        publicId: row.imagePublicId,
                    };
                }
                if (row.imageType === "banner") {
                    member.images.banner = {
                        url: row.imageUrl,
                        publicId: row.imagePublicId,
                    };
                }
            }
        }
        res.status(200).json(Array.from(membersMap.values()));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener los miembros" });
    }
}));
memberRouter.get("/member/:username", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const rawData = yield db
            .select({
            memberId: members.id,
            name: members.name,
            username: members.username,
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
        const memberData = {
            id: rawData[0].memberId,
            name: rawData[0].name,
            username: rawData[0].username,
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener el miembro" });
    }
}));
memberRouter.put("/member/:id", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const { name, description, tags, github, primaryColor, secondaryColor, sound, images: requestImages, } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (github !== undefined)
            updateData.github = github;
        if (primaryColor !== undefined)
            updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined)
            updateData.secondaryColor = secondaryColor;
        if (Object.keys(updateData).length > 0) {
            yield db
                .update(members)
                .set(updateData)
                .where(eq(members.id, memberId));
        }
        if (Array.isArray(tags)) {
            yield db.delete(memberTags).where(eq(memberTags.memberId, memberId));
            const newTags = tags.map((tagId) => ({
                memberId,
                tagId: parseInt(tagId, 10),
            }));
            if (newTags.length)
                yield db.insert(memberTags).values(newTags);
        }
        function getOrInsertImage(imageUrl) {
            return __awaiter(this, void 0, void 0, function* () {
                const existingImage = yield db
                    .select()
                    .from(images)
                    .where(eq(images.url, imageUrl))
                    .limit(1);
                if (existingImage.length > 0) {
                    return existingImage[0].id;
                }
                const [newImage] = yield db
                    .insert(images)
                    .values({ url: imageUrl })
                    .returning({ id: images.id });
                return newImage.id;
            });
        }
        const currentImages = yield db
            .select({
            id: images.id,
            url: images.url,
            publicId: images.publicId,
            type: memberImages.type,
        })
            .from(memberImages)
            .leftJoin(images, eq(memberImages.imageId, images.id))
            .where(eq(memberImages.memberId, memberId));
        function updateImage(type, newData) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                const currentImage = currentImages.find((img) => img.type === type);
                const newUrl = (_a = newData === null || newData === void 0 ? void 0 : newData.url) === null || _a === void 0 ? void 0 : _a.trim();
                const newPublicId = newData === null || newData === void 0 ? void 0 : newData.publicId;
                if (!newUrl && !newPublicId)
                    return; // No hay datos para actualizar
                if (currentImage === null || currentImage === void 0 ? void 0 : currentImage.id) {
                    const updateFields = {};
                    if (newUrl && currentImage.url !== newUrl)
                        updateFields.url = newUrl;
                    if (newPublicId && currentImage.publicId !== newPublicId)
                        updateFields.publicId = newPublicId;
                    if (Object.keys(updateFields).length > 0) {
                        yield db
                            .update(images)
                            .set(updateFields)
                            .where(eq(images.id, currentImage.id));
                    }
                }
                else if (newUrl) {
                    // Si no hay imagen previa, inserta una nueva
                    const imageId = yield getOrInsertImage(newUrl);
                    yield db.insert(memberImages).values({ memberId, imageId, type });
                }
            });
        }
        if (requestImages) {
            yield updateImage("avatar", requestImages.avatar);
            yield updateImage("banner", requestImages.banner);
        }
        const currentSound = yield db
            .select({ id: sounds.id, url: sounds.url, path: sounds.path })
            .from(memberSounds)
            .innerJoin(sounds, eq(memberSounds.soundId, sounds.id))
            .where(eq(memberSounds.memberId, memberId))
            .limit(1);
        const existingSound = currentSound.length > 0 ? currentSound[0] : null;
        if ((sound === null || sound === void 0 ? void 0 : sound.url) && (sound === null || sound === void 0 ? void 0 : sound.path)) {
            if (!existingSound ||
                existingSound.url !== sound.url ||
                existingSound.path !== sound.path) {
                if (existingSound) {
                    yield db
                        .update(sounds)
                        .set({ url: sound.url, path: sound.path })
                        .where(eq(sounds.id, existingSound.id));
                }
                else {
                    const [newSound] = yield db
                        .insert(sounds)
                        .values({ url: sound.url, path: sound.path })
                        .returning({ id: sounds.id });
                    yield db.insert(memberSounds).values({
                        memberId,
                        soundId: newSound.id,
                        type: sound.type || "general",
                    });
                }
            }
        }
        else if (existingSound) {
            yield db
                .update(sounds)
                .set({
                url: "",
                path: ((_a = sound.path) === null || _a === void 0 ? void 0 : _a.trim()) !== "" ? sound.path : existingSound.path,
            })
                .where(eq(sounds.id, existingSound.id));
        }
        res.status(200).send("Member updated successfully");
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}));
