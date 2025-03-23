import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import {
  challenges,
  tags,
  challengeLanguages,
  disciplines,
  challengeDisciplines,
  users,
  members,
  images,
  memberImages,
  roles,
  sessions,
  solutions,
} from "../../db/schema.js";

import { eq, and, count, desc } from "drizzle-orm";
import { Challenge, Challenges, Solution, Tag } from "../../core/types.js";
import checkAuth from "../../middleware/checkAuth.js";

export const challengeRouter = express.Router();

const languageMap: Record<string, string> = {
  javascript: "JavaScript",
  cpp: "C++",
  python: "Python",
};

challengeRouter.get("/challenge", async (_req: Request, res: Response) => {
  try {
    const rawData = await db
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
      .leftJoin(
        challengeLanguages,
        eq(challenges.id, challengeLanguages.challengeId)
      )
      .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
      .leftJoin(
        challengeDisciplines,
        eq(challenges.id, challengeDisciplines.challengeId)
      )
      .leftJoin(
        disciplines,
        eq(challengeDisciplines.disciplineId, disciplines.id)
      )
      .leftJoin(users, eq(challenges.creatorId, users.id))
      .leftJoin(members, eq(users.id, members.userId))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(
        images,
        and(
          eq(memberImages.imageId, images.id),
          eq(memberImages.type, "avatar")
        )
      )
      .orderBy(desc(challenges.createdAt));

    if (!rawData.length) {
      res.status(200).json([]);
      return;
    }

    const challengesMap = new Map<
      number,
      Omit<Challenges, "description" | "hint">
    >();

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

      const challenge = challengesMap.get(row.challengeId)!;

      if (
        row.disciplineId &&
        !challenge.disciplines.some(
          (discipline: Tag) => discipline.id === row.disciplineId
        )
      ) {
        challenge.disciplines.push({
          id: row.disciplineId,
          name: row.disciplineName,
        });
      }

      if (
        row.languageId &&
        !challenge.languages.some(
          (language: Tag) => language.id === row.languageId
        )
      ) {
        challenge.languages.push({
          id: row.languageId,
          name: row.languageName,
        });
      }
    }

    res.status(200).json(Array.from(challengesMap.values()));
  } catch (error) {
    console.error("Error al obtener el reto:", error);
    res.status(500).json({ error: "Error al obtener el reto" });
  }
});

challengeRouter.get(
  "/challenge/user/:userId",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.userId);

      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        res.status(400).json({ error: "userId inválido" });
        return;
      }

      const rawData = await db
        .select({
          challengeId: challenges.id,
          title: challenges.name,
          languageId: tags.id,
          languageName: tags.name,
        })
        .from(challenges)
        .leftJoin(users, eq(challenges.creatorId, users.id))
        .leftJoin(
          challengeLanguages,
          eq(challenges.id, challengeLanguages.challengeId)
        )
        .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
        .where(eq(users.id, userId));

      if (!rawData.length) {
        res.status(200).json([]);
        return;
      }

      const challengesMap = new Map<
        number,
        { id: number; title: string; languages: { id: number; name: string }[] }
      >();

      for (const row of rawData) {
        if (!challengesMap.has(row.challengeId)) {
          challengesMap.set(row.challengeId, {
            id: row.challengeId,
            title: row.title,
            languages: [],
          });
        }

        const challenge = challengesMap.get(row.challengeId)!;
        if (
          row.languageId &&
          !challenge.languages.some((lang) => lang.id === row.languageId)
        ) {
          challenge.languages.push({
            id: row.languageId,
            name: row.languageName || "",
          });
        }
      }

      res.status(200).json(Array.from(challengesMap.values()));
    } catch (error) {
      console.error("Error al obtener los retos del usuario:", error);
      res.status(500).json({ error: "Error al obtener los retos del usuario" });
    }
  }
);

challengeRouter.get(
  "/challenge/disciplines",
  async (_req: Request, res: Response) => {
    try {
      const disciplinesData: Tag[] = await db
        .select({
          id: disciplines.id,
          name: disciplines.name,
        })
        .from(disciplines);

      res.status(200).json(disciplinesData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get disciplines." });
    }
  }
);

challengeRouter.get("/challenge/:id", async (req: Request, res: Response) => {
  try {
    const challengeId = Number(req.params.id);

    const rawData = await db
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
      .leftJoin(
        challengeDisciplines,
        eq(challenges.id, challengeDisciplines.challengeId)
      )
      .leftJoin(
        disciplines,
        eq(challengeDisciplines.disciplineId, disciplines.id)
      )
      .leftJoin(users, eq(challenges.creatorId, users.id))
      .leftJoin(members, eq(users.id, members.userId))
      .leftJoin(memberImages, eq(members.id, memberImages.memberId))
      .leftJoin(
        images,
        and(
          eq(memberImages.imageId, images.id),
          eq(memberImages.type, "avatar")
        )
      )
      .leftJoin(
        challengeLanguages,
        eq(challenges.id, challengeLanguages.challengeId)
      )
      .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
      .where(eq(challenges.id, challengeId));

    if (!rawData.length) {
      res.status(404).json({ error: "Reto no encontrado" });
      return;
    }

    const challengeData: Omit<Challenge, "language" | "hint"> = {
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
      if (
        row.disciplineId &&
        !challengeData.disciplines.some((d) => d.id === row.disciplineId)
      ) {
        challengeData.disciplines.push({
          id: row.disciplineId,
          name: row.disciplineName,
        });
      }

      if (
        row.languageId &&
        !challengeData.languages.some((lang) => lang.id === row.languageId)
      ) {
        challengeData.languages.push({
          id: row.languageId,
          name: row.languageName,
        });
      }
    }

    res.status(200).json(challengeData);
  } catch (error) {
    console.error("Error al obtener el reto:", error);
    res.status(500).json({ error: "Error al obtener el reto" });
  }
});

challengeRouter.get(
  "/challenge/:id/:language",
  async (req: Request, res: Response) => {
    try {
      const { id, language } = req.params;
      const challengeId = Number(id);
      const normalizedLanguage =
        languageMap[language.toLowerCase()] || language;

      const rawData = await db
        .select({
          challengeId: challenges.id,
          hint: challengeLanguages.editorHints,
          languageId: tags.id,
          languageName: tags.name,
        })
        .from(challenges)
        .leftJoin(
          challengeLanguages,
          eq(challenges.id, challengeLanguages.challengeId)
        )
        .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
        .where(eq(challenges.id, challengeId));

      if (!rawData.length) {
        res.status(404).json({ error: "Reto no encontrado" });
        return;
      }

      // Buscamos la fila que corresponde al lenguaje solicitado
      const specificLanguageRow = rawData.find(
        (row) => row.languageName === normalizedLanguage
      );

      let languageId = specificLanguageRow?.languageId || 0;

      if (!specificLanguageRow) {
        // Si no se encuentra, intentamos buscar el ID en tags
        const fallbackLanguage = await db
          .select({ id: tags.id })
          .from(tags)
          .where(eq(tags.name, normalizedLanguage))
          .limit(1);

        if (fallbackLanguage.length) {
          languageId = fallbackLanguage[0].id;
        }
      }

      const challengeLanguageData = {
        hint: specificLanguageRow?.hint || "",
        language: {
          id: languageId,
          name: normalizedLanguage,
        },
      };

      res.status(200).json(challengeLanguageData);
    } catch (error) {
      console.error("Error al obtener la información del lenguaje:", error);
      res
        .status(500)
        .json({ error: "Error al obtener la información del lenguaje" });
    }
  }
);

challengeRouter.put("/challenge/:id", async (req: Request, res: Response) => {
  try {
    const { RefreshToken } = req.cookies;
    if (!RefreshToken) {
      res.status(401).json({ error: "Acceso no autorizado" });
      return;
    }

    // Obtener usuario autenticado
    const session = await db
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
    const challenge = await db
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
      res
        .status(403)
        .json({ error: "No tienes permisos para editar este reto" });
      return;
    }

    const challengeId = Number(req.params.id);
    const { title, description, difficulty, disciplines, languageId, hint } =
      req.body;

    const updateData: Record<string, any> = {};
    if (title) updateData.name = title;
    if (description) updateData.description = description;
    if (difficulty) updateData.difficulty = difficulty;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(challenges)
        .set(updateData)
        .where(eq(challenges.id, challengeId));
    }

    if (Array.isArray(disciplines)) {
      await db
        .delete(challengeDisciplines)
        .where(eq(challengeDisciplines.challengeId, challengeId));
      const newDisciplines = disciplines.map((disciplineId) => ({
        challengeId,
        disciplineId: parseInt(disciplineId, 10),
      }));
      if (newDisciplines.length > 0)
        await db.insert(challengeDisciplines).values(newDisciplines);
    }

    // Manejo del lenguaje (languageId) y el hint asociado
    if (languageId) {
      const existingRelation = await db
        .select()
        .from(challengeLanguages)
        .where(
          and(
            eq(challengeLanguages.challengeId, challengeId),
            eq(challengeLanguages.languageId, languageId)
          )
        )
        .limit(1)
        .all();

      if (existingRelation.length > 0) {
        await db
          .update(challengeLanguages)
          .set({ editorHints: hint })
          .where(eq(challengeLanguages.id, existingRelation[0].id));
      } else {
        const languageExists = await db
          .select()
          .from(tags)
          .where(eq(tags.id, languageId))
          .limit(1)
          .all();

        if (languageExists.length > 0) {
          await db.insert(challengeLanguages).values({
            challengeId,
            languageId,
            editorHints: hint,
          });
        } else {
          res.status(400).json({ error: "El lenguaje especificado no existe" });
          return;
        }
      }
    }

    // 🔹 Obtener el título actualizado
    const updatedChallenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1)
      .all();

    const updatedTitle = updatedChallenge[0].name;

    // 🔹 Obtener los lenguajes actualizados
    const updatedLanguages = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(challengeLanguages)
      .innerJoin(tags, eq(challengeLanguages.languageId, tags.id))
      .where(eq(challengeLanguages.challengeId, challengeId))
      .all();

    res.status(200).json({
      message: "Reto actualizado correctamente",
      id: challengeId,
      title: updatedTitle,
      languages: updatedLanguages,
    });
  } catch (error) {
    console.error("Error al actualizar el reto:", error);
    res.status(500).json({ error: "Error al actualizar el reto" });
  }
});


challengeRouter.post("/challenge", async (req: Request, res: Response) => {
  try {
    const { RefreshToken } = req.cookies;
    if (!RefreshToken) {
      res.status(401).json({ error: "Acceso no autorizado" });
      return;
    }

    const {
      creator,
      title,
      description,
      difficulty,
      disciplines,
      languageId,
      hint,
    } = req.body;

    if (!creator || !creator.id) {
      res.status(400).json({ error: "Creator no proporcionado" });
      return;
    }

    const userId = creator.id;

    // Insertar reto en la tabla challenges
    const insertedChallenges = await db
      .insert(challenges)
      .values({
        name: title,
        creatorId: userId,
        description: description || "",
        difficulty: difficulty || 1,
      })
      .returning();

    if (!insertedChallenges.length) {
      res.status(500).json({ error: "No se pudo crear el reto" });
      return;
    }

    const challengeId = insertedChallenges[0].id;

    // Insertar disciplinas si existen
    if (Array.isArray(disciplines) && disciplines.length > 0) {
      const newDisciplines = disciplines.map((disciplineId: number) => ({
        challengeId,
        disciplineId: Number(disciplineId),
      }));
      await db.insert(challengeDisciplines).values(newDisciplines);
    }

    let languages : Tag[] = [];
    // Insertar lenguaje asociado si se envía languageId
    if (languageId) {
      const languageExists = await db
        .select()
        .from(tags)
        .where(eq(tags.id, languageId))
        .limit(1)
        .all();

      if (!languageExists.length) {
        res.status(400).json({ error: "El lenguaje especificado no existe" });
        return;
      }

      await db.insert(challengeLanguages).values({
        challengeId,
        languageId,
        editorHints: hint || "",
      });

      languages = [{ id: languageId, name: languageExists[0].name }];
    }

    res.status(201).json({
      message: "Reto creado correctamente",
      id: challengeId,
      title,
      languages,
    });

  } catch (error) {
    console.error("Error al crear el reto:", error);
    res.status(500).json({ error: "Error al crear el reto" });
    return;
  }
});


challengeRouter.delete(
  "/challenge/:id",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const challengeId = Number(req.params.id);
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      // Obtener la sesión del usuario a partir del RefreshToken
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

      // Obtener el reto a eliminar y el id de su creador
      const challengeData = await db
        .select({ creatorId: challenges.creatorId })
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1)
        .all();

      if (challengeData.length === 0) {
        res.status(404).json({ error: "Reto no encontrado" });
        return;
      }

      const creatorId = challengeData[0].creatorId;

      // Si el usuario autenticado no es el creador, verificar si tiene rol de Moderador o Administrador
      if (authenticatedUserId !== creatorId) {
        // Obtener el rol del usuario
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

        // Obtener el nombre del rol
        const roleData = await db
          .select({ roleName: roles.name })
          .from(roles)
          .where(eq(roles.id, userRoleId))
          .limit(1)
          .all();

        const userRoleName = roleData.length > 0 ? roleData[0].roleName : "";

        const allowedRoles = new Set(["Moderador", "Administrador"]);

        if (!allowedRoles.has(userRoleName)) {
          res
            .status(403)
            .json({ error: "No tienes permisos para eliminar este reto" });
          return;
        }
      }

      // Se elimina el reto; las relaciones se borran automáticamente por cascada
      await db.delete(challenges).where(eq(challenges.id, challengeId));

      res.status(200).json({ message: "Reto eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar el reto:", error);
      res.status(500).json({ error: "Error al eliminar el reto" });
    }
  }
);

challengeRouter.delete(
  "/challenge/:id/:language",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const challengeId = Number(req.params.id);
      const languageParam = req.params.language;

      // Normalizamos el lenguaje utilizando el mapa definido
      const normalizedLanguage =
        languageMap[languageParam.toLowerCase()] || languageParam;

      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      // Obtener la sesión del usuario autenticado
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

      // Verificar que el reto exista y obtener el id del creador
      const challengeData = await db
        .select({ creatorId: challenges.creatorId })
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1)
        .all();

      if (challengeData.length === 0) {
        res.status(404).json({ error: "Reto no encontrado" });
        return;
      }

      const creatorId = challengeData[0].creatorId;

      // Si el usuario autenticado no es el creador, verificar permisos (Moderador o Administrador)
      if (authenticatedUserId !== creatorId) {
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

        // Obtener el nombre del rol
        const roleData = await db
          .select({ roleName: roles.name })
          .from(roles)
          .where(eq(roles.id, userRoleId))
          .limit(1)
          .all();

        const userRoleName = roleData.length > 0 ? roleData[0].roleName : "";
        const allowedRoles = new Set(["Moderador", "Administrador"]);

        if (!allowedRoles.has(userRoleName)) {
          res.status(403).json({
            error: "No tienes permisos para eliminar el lenguaje del reto",
          });
          return;
        }
      }

      // Buscar el id del lenguaje en la tabla de tags utilizando el lenguaje normalizado
      const tagData = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, normalizedLanguage))
        .limit(1)
        .all();

      if (tagData.length === 0) {
        res.status(404).json({ error: "Lenguaje no encontrado" });
        return;
      }
      const tagId = tagData[0].id;

      // Eliminar la relación del lenguaje con el reto
      await db
        .delete(challengeLanguages)
        .where(
          and(
            eq(challengeLanguages.challengeId, challengeId),
            eq(challengeLanguages.languageId, tagId)
          )
        );

      // Contar cuántos lenguajes quedan en el reto
      const remainingLanguages = await db
        .select({ count: count() })
        .from(challengeLanguages)
        .where(eq(challengeLanguages.challengeId, challengeId))
        .limit(1)
        .all();

      const languageCount = remainingLanguages[0]?.count ?? 0;

      if (languageCount === 0) {
        // Si no quedan lenguajes, eliminar el reto
        await db.delete(challenges).where(eq(challenges.id, challengeId));
        res.status(200).json({
          message:
            "Lenguaje eliminado y reto eliminado porque no tenía más lenguajes",
        });
        return;
      }

      res
        .status(200)
        .json({ message: "Lenguaje eliminado del reto correctamente" });
    } catch (error) {
      console.error("Error al eliminar el lenguaje del reto:", error);
      res.status(500).json({ error: "Error al eliminar el lenguaje del reto" });
    }
  }
);

challengeRouter.get(
  "/challenge/:id/solutions/:language",
  async (req: Request, res: Response) => {
    try {
      const { id, language } = req.params;
      const challengeId = Number(id);
      // Normalizamos el lenguaje usando el mismo mapa
      const normalizedLanguage =
        languageMap[language.toLowerCase()] || language;

      // Buscamos en la tabla tags el id correspondiente al lenguaje normalizado
      const tagData = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, normalizedLanguage))
        .limit(1)
        .all();

      if (!tagData.length) {
        res.status(404).json({ error: "Lenguaje no encontrado" });
        return;
      }
      const tagId = tagData[0].id;

      // Consulta para obtener la solución (o las soluciones) para el reto y lenguaje solicitado
      const rawData = await db
        .select({
          id: solutions.id,
          challengeId: solutions.challengeId,
          userId: solutions.userId,
          code: solutions.code,
          createdAt: solutions.createdAt,
          languageId: tags.id,
          languageName: tags.name,
          creatorName: users.name,
          creatorUsername: users.username,
          creatorImage: images.url,
        })
        .from(solutions)
        .leftJoin(tags, eq(solutions.languageId, tags.id))
        .leftJoin(users, eq(solutions.userId, users.id))
        .leftJoin(members, eq(users.id, members.userId))
        .leftJoin(memberImages, eq(members.id, memberImages.memberId))
        .leftJoin(
          images,
          and(
            eq(memberImages.imageId, images.id),
            eq(memberImages.type, "avatar")
          )
        )
        .where(
          and(
            eq(solutions.challengeId, challengeId),
            eq(solutions.languageId, tagId)
          )
        )
        .orderBy(desc(solutions.createdAt))
        .all();

      // Mapeamos las soluciones (en este ejemplo se asume que puede haber más de una)
      const solutionsMap = new Map<number, Solution>();
      for (const row of rawData) {
        if (!solutionsMap.has(row.id)) {
          solutionsMap.set(row.id, {
            id: row.id,
            challengeId: row.challengeId,
            creator: {
              id: row.userId,
              name: row.creatorName || "",
              username: row.creatorUsername || "",
              image: row.creatorImage || "",
            },
            code: row.code,
            language: {
              id: row.languageId,
              name: row.languageName,
            },
          });
        }
      }

      // Consulta para obtener los lenguajes disponibles para el reto
      const availableLanguages = await db
        .select({
          languageId: tags.id,
          languageName: tags.name,
        })
        .from(challengeLanguages)
        .leftJoin(tags, eq(challengeLanguages.languageId, tags.id))
        .where(eq(challengeLanguages.challengeId, challengeId))
        .all();

      // Se retorna un objeto con las soluciones y los lenguajes disponibles
      res.status(200).json({
        solutions: Array.from(solutionsMap.values()),
        availableLanguages: availableLanguages.map((lang) => ({
          id: lang.languageId,
          name: lang.languageName,
        })),
      });
    } catch (error) {
      console.error("Error al obtener las soluciones:", error);
      res
        .status(500)
        .json({ error: "Error al obtener las soluciones del reto" });
    }
  }
);

challengeRouter.post(
  "/challenge/:id/solution/:language",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { id, language } = req.params;
      const challengeId = Number(id);

      const normalizedLanguage =
        languageMap[language.toLowerCase()] || language;

      // Se obtiene el código enviado en el body
      const { code } = req.body;

      if (!code || typeof code !== "string" || code.trim() === "") {
        res.status(400).json({ error: "El código es requerido" });
        return;
      }

      // Verificar la sesión del usuario autenticado a partir del RefreshToken
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

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

      // Buscar el ID del lenguaje usando la tabla tags
      const tagData = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, normalizedLanguage))
        .limit(1)
        .all();

      if (tagData.length === 0) {
        res.status(404).json({ error: "Lenguaje no encontrado" });
        return;
      }
      const languageId = tagData[0].id;

      // Verificar si ya existe una solución para este reto, lenguaje y usuario
      const existingSolution = await db
        .select()
        .from(solutions)
        .where(
          and(
            eq(solutions.challengeId, challengeId),
            eq(solutions.languageId, languageId),
            eq(solutions.userId, authenticatedUserId as string)
          )
        )
        .limit(1)
        .all();

      if (existingSolution.length > 0) {
        // Actualizar la solución existente
        await db
          .update(solutions)
          .set({ code })
          .where(eq(solutions.id, existingSolution[0].id));
        res.status(200).json({ message: "Solución actualizada correctamente" });
      } else {
        // Crear una nueva solución

        if (!authenticatedUserId) {
          res
            .status(500)
            .json({ error: "No se pudo determinar el usuario autenticado" });
          return;
        }

        await db.insert(solutions).values({
          challengeId: challengeId,
          userId: authenticatedUserId as string,
          code,
          languageId,
        });
        res.status(201).json({ message: "Solución creada correctamente" });
      }
    } catch (error) {
      console.error("Error al enviar la solución:", error);
      res.status(500).json({ error: "Error al enviar la solución" });
    }
  }
);

challengeRouter.get(
  "/challenge/:id/solution/:language",
  async (req: Request, res: Response) => {
    try {
      // Validar autenticación a partir del RefreshToken en las cookies
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).json({ error: "Acceso no autorizado" });
        return;
      }

      const session = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.refreshToken, RefreshToken))
        .limit(1)
        .all();

      if (!session.length) {
        res.status(401).json({ error: "Sesión no válida" });
        return;
      }

      const authenticatedUserId = session[0].userId;

      // Extraer parámetros y normalizar lenguaje
      const { id, language } = req.params;
      const challengeId = Number(id);
      const normalizedLanguage =
        languageMap[language.toLowerCase()] || language;

      // Buscar el ID del lenguaje en la tabla tags
      const tagData = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, normalizedLanguage))
        .limit(1)
        .all();

      if (!tagData.length) {
        res.status(404).json({ error: "Lenguaje no encontrado" });
        return;
      }

      const tagId = tagData[0].id;

      // Obtener una única solución para el reto, lenguaje y usuario autenticado
      const solution = await db
        .select({
          id: solutions.id,
          challengeId: solutions.challengeId,
          userId: solutions.userId,
          code: solutions.code,
          createdAt: solutions.createdAt,
          languageId: tags.id,
          languageName: tags.name,
          creatorName: users.name,
          creatorUsername: users.username,
          creatorImage: images.url,
        })
        .from(solutions)
        .leftJoin(tags, eq(solutions.languageId, tags.id))
        .leftJoin(users, eq(solutions.userId, users.id))
        .leftJoin(members, eq(users.id, members.userId))
        .leftJoin(memberImages, eq(members.id, memberImages.memberId))
        .leftJoin(
          images,
          and(
            eq(memberImages.imageId, images.id),
            eq(memberImages.type, "avatar")
          )
        )
        .where(
          and(
            eq(solutions.challengeId, challengeId),
            eq(solutions.languageId, tagId),
            eq(solutions.userId, authenticatedUserId as string) // Filtrar por el usuario autenticado
          )
        )
        .limit(1)
        .all();

      // Si no se encontró solución, se retorna un objeto vacío con status 200
      if (!solution.length) {
        res.status(200).json({});
        return;
      }

      const response = {
        id: solution[0].id,
        challengeId: solution[0].challengeId,
        creator: {
          id: solution[0].userId,
          name: solution[0].creatorName || "",
          username: solution[0].creatorUsername || "",
          image: solution[0].creatorImage || "",
        },
        code: solution[0].code,
        language: {
          id: solution[0].languageId,
          name: solution[0].languageName,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error al obtener la solución:", error);
      res.status(500).json({ error: "Error al obtener la solución" });
    }
  }
);
