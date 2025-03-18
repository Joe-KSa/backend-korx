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
import { challenges, tags, challengeLanguages, disciplines, challengeDisciplines, users, members, images, memberImages, sessions, } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import checkAuth from "../../middleware/checkAuth.js";
export const challengeRouter = express.Router();
const languageMap = {
    javascript: "JavaScript",
    cpp: "C++",
    python: "Python",
};
challengeRouter.get("/challenge", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawData = yield db
            .select({
            challengeId: challenges.id,
            title: challenges.name,
            difficulty: challenges.difficulty,
            disciplineId: disciplines.id,
            disciplineName: disciplines.name,
            creatorId: users.id,
            creatorName: users.name,
            creatorUsername: users.username,
            creatorImage: images.url,
            languageId: tags.id,
            languageName: tags.name,
            createdAt: challenges.createdAt,
        })
            .from(challenges)
            .leftJoin(challengeLanguages, eq(challenges.id, challengeLanguages.challengeId))
            .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
            .leftJoin(challengeDisciplines, eq(challenges.id, challengeDisciplines.challengeId))
            .leftJoin(disciplines, eq(challengeDisciplines.challengeId, disciplines.id))
            .leftJoin(users, eq(challenges.creatorId, users.id))
            .leftJoin(members, eq(users.id, members.userId))
            .leftJoin(memberImages, eq(members.id, memberImages.memberId))
            .leftJoin(images, and(eq(memberImages.imageId, images.id), eq(memberImages.type, "avatar")));
        if (!rawData.length) {
            res.status(200).json([]);
            return;
        }
        const challengesMap = new Map();
        for (const row of rawData) {
            if (!challengesMap.has(row.challengeId)) {
                challengesMap.set(row.challengeId, {
                    id: row.challengeId,
                    title: row.title,
                    creator: {
                        id: row.creatorId,
                        name: row.creatorName,
                        username: row.creatorUsername,
                        image: row.creatorImage,
                    },
                    difficulty: row.difficulty,
                    createdAt: row.createdAt,
                    disciplines: [],
                    languages: [],
                });
            }
            const challenge = challengesMap.get(row.challengeId);
            if (row.disciplineId &&
                !challenge.disciplines.some((discipline) => discipline.id === row.disciplineId)) {
                challenge.disciplines.push({
                    id: row.disciplineId,
                    name: row.disciplineName,
                });
            }
            if (row.languageId &&
                !challenge.languages.some((language) => language.id === row.languageId)) {
                challenge.languages.push({
                    id: row.languageId,
                    name: row.languageName,
                });
            }
        }
        res.status(200).json(Array.from(challengesMap.values()));
    }
    catch (error) {
        console.error("Error al obtener el reto:", error);
        res.status(500).json({ error: "Error al obtener el reto" });
    }
}));
challengeRouter.get("/challenge/user/:userId", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = String(req.params.userId);
        if (!userId || typeof userId !== "string" || userId.trim() === "") {
            res.status(400).json({ error: "userId inválido" });
            return;
        }
        const rawData = yield db
            .select({
            challengeId: challenges.id,
            title: challenges.name,
            languageId: tags.id,
            languageName: tags.name,
        })
            .from(challenges)
            .leftJoin(users, eq(challenges.creatorId, users.id))
            .leftJoin(challengeLanguages, eq(challenges.id, challengeLanguages.challengeId))
            .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
            .where(eq(users.id, userId));
        if (!rawData.length) {
            res.status(200).json([]);
            return;
        }
        const challengesMap = new Map();
        for (const row of rawData) {
            if (!challengesMap.has(row.challengeId)) {
                challengesMap.set(row.challengeId, {
                    id: row.challengeId,
                    title: row.title,
                    languages: [],
                });
            }
            const challenge = challengesMap.get(row.challengeId);
            if (row.languageId &&
                !challenge.languages.some((lang) => lang.id === row.languageId)) {
                challenge.languages.push({
                    id: row.languageId,
                    name: row.languageName || "",
                });
            }
        }
        res.status(200).json(Array.from(challengesMap.values()));
    }
    catch (error) {
        console.error("Error al obtener los retos del usuario:", error);
        res.status(500).json({ error: "Error al obtener los retos del usuario" });
    }
}));
challengeRouter.get("/challenge/disciplines", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplinesData = yield db
            .select({
            id: disciplines.id,
            name: disciplines.name,
        })
            .from(disciplines);
        res.status(200).json(disciplinesData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get disciplines." });
    }
}));
challengeRouter.get("/challenge/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const challengeId = Number(req.params.id);
        const rawData = yield db
            .select({
            challengeId: challenges.id,
            title: challenges.name,
            difficulty: challenges.difficulty,
            description: challenges.description,
            disciplineId: disciplines.id,
            disciplineName: disciplines.name,
            creatorId: users.id,
            creatorName: users.name,
            creatorUsername: users.username,
            creatorImage: images.url,
            createdAt: challenges.createdAt,
            languageId: tags.id,
            languageName: tags.name,
        })
            .from(challenges)
            .leftJoin(challengeDisciplines, eq(challenges.id, challengeDisciplines.challengeId))
            .leftJoin(disciplines, eq(challengeDisciplines.disciplineId, disciplines.id))
            .leftJoin(users, eq(challenges.creatorId, users.id))
            .leftJoin(members, eq(users.id, members.userId))
            .leftJoin(memberImages, eq(members.id, memberImages.memberId))
            .leftJoin(images, and(eq(memberImages.imageId, images.id), eq(memberImages.type, "avatar")))
            .leftJoin(challengeLanguages, eq(challenges.id, challengeLanguages.challengeId))
            .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
            .where(eq(challenges.id, challengeId));
        if (!rawData.length) {
            res.status(404).json({ error: "Reto no encontrado" });
            return;
        }
        const challengeData = {
            id: rawData[0].challengeId,
            title: rawData[0].title,
            description: rawData[0].description,
            difficulty: rawData[0].difficulty,
            createdAt: rawData[0].createdAt,
            creator: {
                id: rawData[0].creatorId,
                name: rawData[0].creatorName,
                username: rawData[0].creatorUsername,
                image: rawData[0].creatorImage,
            },
            disciplines: [],
            languages: [],
        };
        for (const row of rawData) {
            if (row.disciplineId &&
                !challengeData.disciplines.some((d) => d.id === row.disciplineId)) {
                challengeData.disciplines.push({
                    id: row.disciplineId,
                    name: row.disciplineName,
                });
            }
            if (row.languageId &&
                !challengeData.languages.some((lang) => lang.id === row.languageId)) {
                challengeData.languages.push({
                    id: row.languageId,
                    name: row.languageName,
                });
            }
        }
        res.status(200).json(challengeData);
    }
    catch (error) {
        console.error("Error al obtener el reto:", error);
        res.status(500).json({ error: "Error al obtener el reto" });
    }
}));
challengeRouter.get("/challenge/:id/:language", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, language } = req.params;
        const challengeId = Number(id);
        const normalizedLanguage = languageMap[language.toLowerCase()] || language;
        const rawData = yield db
            .select({
            challengeId: challenges.id,
            hint: challengeLanguages.editorHints,
            languageId: tags.id,
            languageName: tags.name,
        })
            .from(challenges)
            .leftJoin(challengeLanguages, eq(challenges.id, challengeLanguages.challengeId))
            .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
            .where(eq(challenges.id, challengeId));
        if (!rawData.length) {
            res.status(404).json({ error: "Reto no encontrado" });
            return;
        }
        // Buscamos la fila que corresponde al lenguaje solicitado
        const specificLanguageRow = rawData.find((row) => row.languageName === normalizedLanguage);
        let languageId = (specificLanguageRow === null || specificLanguageRow === void 0 ? void 0 : specificLanguageRow.languageId) || 0;
        if (!specificLanguageRow) {
            // Si no se encuentra, intentamos buscar el ID en tags
            const fallbackLanguage = yield db
                .select({ id: tags.id })
                .from(tags)
                .where(eq(tags.name, normalizedLanguage))
                .limit(1);
            if (fallbackLanguage.length) {
                languageId = fallbackLanguage[0].id;
            }
        }
        const challengeLanguageData = {
            hint: (specificLanguageRow === null || specificLanguageRow === void 0 ? void 0 : specificLanguageRow.hint) || "",
            language: {
                id: languageId,
                name: normalizedLanguage,
            },
        };
        res.status(200).json(challengeLanguageData);
    }
    catch (error) {
        console.error("Error al obtener la información del lenguaje:", error);
        res
            .status(500)
            .json({ error: "Error al obtener la información del lenguaje" });
    }
}));
challengeRouter.put("/challenge/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).json({ error: "Acceso no autorizado" });
            return;
        }
        // Obtener usuario autenticado
        const session = yield db
            .select()
            .from(sessions)
            .where(eq(sessions.refreshToken, RefreshToken))
            .limit(1)
            .all();
        if (session.length === 0) {
            res.status(401).json({ error: "Sesión no válida" });
            return;
        }
        const userId = session[0].userId;
        // Obtener el reto y su creador
        const challenge = yield db
            .select()
            .from(challenges)
            .where(eq(challenges.id, Number(req.params.id)))
            .limit(1)
            .all();
        if (challenge.length === 0) {
            res.status(404).json({ error: "Reto no encontrado" });
            return;
        }
        // Verificar si el usuario autenticado es el creador
        if (challenge[0].creatorId !== userId) {
            res.status(403).json({ error: "No tienes permisos para editar este reto" });
            return;
        }
        const challengeId = Number(req.params.id);
        const { title, description, difficulty, disciplines, languageId, hint } = req.body;
        const updateData = {};
        if (title)
            updateData.title = title;
        if (description)
            updateData.description = description;
        if (difficulty)
            updateData.difficulty = difficulty;
        if (Object.keys(updateData).length > 0) {
            yield db.update(challenges).set(updateData).where(eq(challenges.id, challengeId));
        }
        if (Array.isArray(disciplines)) {
            yield db.delete(challengeDisciplines).where(eq(challengeDisciplines.challengeId, challengeId));
            const newDisciplines = disciplines.map((disciplineId) => ({
                challengeId,
                disciplineId: parseInt(disciplineId, 10),
            }));
            if (newDisciplines.length > 0)
                yield db.insert(challengeDisciplines).values(newDisciplines);
        }
        // Lógica para manejar el lenguaje (languageId) y el hint asociado
        if (languageId) {
            // 1. Comprobar si ya existe una relación para ese reto y lenguaje
            const existingRelation = yield db
                .select()
                .from(challengeLanguages)
                .where(and(eq(challengeLanguages.challengeId, challengeId), eq(challengeLanguages.languageId, languageId)))
                .limit(1)
                .all();
            if (existingRelation.length > 0) {
                // Si la relación existe, se actualiza el hint
                yield db
                    .update(challengeLanguages)
                    .set({ editorHints: hint })
                    .where(eq(challengeLanguages.id, existingRelation[0].id));
            }
            else {
                // Si no existe, se verifica que el lenguaje exista en la tabla de tags
                const languageExists = yield db
                    .select()
                    .from(tags)
                    .where(eq(tags.id, languageId))
                    .limit(1)
                    .all();
                if (languageExists.length > 0) {
                    // Se crea una nueva relación
                    yield db.insert(challengeLanguages).values({
                        challengeId,
                        languageId,
                        editorHints: hint,
                    });
                }
                else {
                    // Si el lenguaje no existe en tags, se responde con un error
                    res.status(400).json({ error: "El lenguaje especificado no existe" });
                    return;
                }
            }
        }
        res.json({ message: "Reto actualizado correctamente" });
    }
    catch (error) {
        console.error("Error al actualizar el reto:", error);
        res.status(500).json({ error: "Error al actualizar el reto" });
    }
}));
// challengeRouter.post("/challenge", checkAuth, async (req: Request, res: Response) => {
//   try {
//     const { title, description, difficulty, disciplines, language, hint } = req.body;
//     const newChallenge = await db("challenges").insert({
//       title,
//       description,
//       difficulty,
//       createdAt: new Date(),
//     });
//     const challengeId = newChallenge[0];
//   }
// })
