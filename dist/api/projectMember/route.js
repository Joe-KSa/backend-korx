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
import { images, roles, memberImages, memberSounds, sounds, members, projectMembers, tags, memberTags, } from "../../db/schema.js";
import { eq } from "drizzle-orm";
export const projectMember = express.Router();
projectMember.get("/project/:id/members", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const projectId = Number(req.params.id);
    if (isNaN(projectId)) {
        res.status(400).json({ error: "ID de proyecto inválido" });
        return;
    }
    try {
        const membersData = yield db
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
        })
            .from(projectMembers)
            .leftJoin(members, eq(projectMembers.memberId, members.id))
            .leftJoin(roles, eq(members.roleId, roles.id))
            .leftJoin(memberImages, eq(members.id, memberImages.memberId))
            .leftJoin(images, eq(memberImages.imageId, images.id))
            .leftJoin(memberSounds, eq(members.id, memberSounds.memberId))
            .leftJoin(sounds, eq(memberSounds.soundId, sounds.id))
            .leftJoin(memberTags, eq(projectMembers.id, memberTags.memberId))
            .leftJoin(tags, eq(memberTags.tagId, tags.id))
            .where(eq(projectMembers.projectId, projectId));
        const membersMap = new Map();
        for (const row of membersData) {
            if (!row.memberId)
                continue;
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
                });
            }
            const member = membersMap.get(row.memberId);
            if (member && member.images) {
                if (row.tagId &&
                    !member.tags.some((tag) => tag.id === row.tagId)) {
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
    }
    catch (error) {
        console.error("Error en /project/:id/members:", error);
        res
            .status(500)
            .json({ error: "Error al obtener los miembros del proyecto" });
    }
}));
