import express, { Request, Response } from "express";
import { config } from "dotenv";
import { v4 as uuidv4 } from "uuid";

config({ path: "private/.env" });
export const authRouter = express.Router();
import { db } from "../../db/index.js";
import {
  users,
  accounts,
  roles,
  members,
  sessions,
  bans,
  images,
  memberImages,
  sounds,
  memberSounds,
} from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { generateToken } from "../../libs/generateToken.js";
import checkAuth from "../../middleware/checkAuth.js";
import { redisClient } from "../../config/redis.config.js";

authRouter.get("/auth/discord/login", (_req: Request, res: Response) => {
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI!);
  const url = `https://discord.com/oauth2/authorize?client_id=${process.env
    .DISCORD_CLIENT_ID!}&response_type=code&redirect_uri=${redirectUri}&scope=identify+email`;
  res.redirect(url);
});

authRouter.get(
  "/auth/discord/callback",
  async (req: Request, res: Response) => {
    const ipKey = `rate_limit:${req.ip}`;

    try {
      // 1. Rate limiting con Redis
      const attempts = await redisClient.incr(ipKey);
      if (attempts === 1) {
        await redisClient.expire(ipKey, 300);
      }
      if (attempts > 5) {
        res.status(429).send("Demasiados intentos");
        return;
      }

      if (!req.query.code) {
        res.status(400).send("Código no proporcionado");
        return;
      }

      const { code } = req.query;
      const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      });

      // 2. Manejo de token con Redis
      const tokenResponse = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          body: params,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        res
          .status(tokenResponse.status)
          .json({ error: "Error al obtener token", details: errorText });
        return;
      }

      const tokenData = await tokenResponse.json();

      const accessToken = tokenData.access_token;

      // 3. Datos de usuario con Redis

      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("Error usuario:", errorText);
        res.status(500).send("Error al obtener datos");
        return;
      }

      const userData = await userResponse.json();

      const { id, global_name, username, email, avatar, banner, banner_color } =
        userData;

      // 4. Verificación de baneo

      const bannerUser = await db
        .select()
        .from(bans)
        .where(eq(bans.userId, id));

      if (bannerUser.length > 0) {
        res.status(403).json({ error: "Cuenta baneada" });
        return;
      }

      // 5. Actualización de usuario
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      // Rol por defecto
      const [defaultRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Miembro"))
        .limit(1);

      if (!defaultRole) {
        res.status(500).send("Error de configuración de roles");
        return;
      }

      if (existingUser.length > 0) {
        const [currentUser] = existingUser;
        const updates: Record<string, any> = {};

        if (currentUser.username !== username) updates.username = username;
        if (currentUser.image !== avatar) {
          updates.image = avatar
            ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
            : null;
        }

        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, id));
        }
      } else {
        await db.insert(users).values({
          id,
          name: global_name,
          username,
          email: email || null,
          image: avatar
            ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
            : null,
          banner: banner
            ? `https://cdn.discordapp.com/banners/${id}/${banner}.png`
            : null,
          bannerColor: banner_color || null,
          roleId: defaultRole.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      // 5. Registro/actualización en la tabla accounts
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.providerAccountId, id))
        .limit(1);

      if (!existingAccount.length) {
        await db.insert(accounts).values({
          userId: id,
          provider: "discord",
          providerAccountId: id,
        });
      }

      // 6. Gestión de sesiones (Máx. 3 por usuario)
      const maxSessions = 3;

      // Obtener todas las sesiones activas del usuario
      const userSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, id))
        .orderBy(asc(sessions.createdAt)); // Ordenar por fecha de creación (las más antiguas primero)

      // Verificar si hay más de 3 sesiones
      if (userSessions.length >= maxSessions) {
        // Eliminar la sesión más antigua
        const sessionToDelete = userSessions[0]; // La sesión más antigua es la primera en la lista
        await db.delete(sessions).where(eq(sessions.id, sessionToDelete.id));
      }

      // Insertar la nueva sesión
      const refreshToken = uuidv4();
      await db.insert(sessions).values({
        userId: id,
        refreshToken,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
      });

      // 7. Manejo de miembros

      const existingMember = await db
        .select()
        .from(members)
        .where(eq(members.username, username))
        .limit(1);

      if (!existingMember.length) {
        const [newMember] = await db
          .insert(members)
          .values({
            userId: id,
            name: global_name || "",
            username: username || "",
            roleId: defaultRole.id,
            description: "",
            hidden: false,
            github: "",
            phrase: "",
            primaryColor: "",
            secondaryColor: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning({ id: members.id });

        if (newMember) {
          if (avatar) {
            const imageUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
            const [newImage] = await db
              .insert(images)
              .values({ url: imageUrl, publicId: "" })
              .returning({ id: images.id });

            await db.insert(memberImages).values({
              memberId: newMember.id,
              imageId: newImage.id,
              type: "avatar",
            });
          }

          if (banner) {
            const bannerUrl = `https://cdn.discordapp.com/banners/${id}/${banner}.png`;
            const [newBanner] = await db
              .insert(images)
              .values({ url: bannerUrl, publicId: "" })
              .returning({ id: images.id });

            await db.insert(memberImages).values({
              memberId: newMember.id,
              imageId: newBanner.id,
              type: "banner",
            });
          }
        }

        // Crear un sonido vacío y obtener su ID
        const [newSound] = await db
          .insert(sounds)
          .values({ url: "", path: "" })
          .returning({ id: sounds.id });

        if (newSound) {
          await db.insert(memberSounds).values({
            memberId: newMember.id,
            soundId: newSound.id,
          });
        }
      }

      // 8. Generación de tokens
      const accessTokenJWT = generateToken(id, username, email);

      res.cookie("KorxToken", accessTokenJWT, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60 * 60 * 1000,
        path: "/",
      });

      res.cookie("RefreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.redirect(process.env.FRONTEND_REDIRECT_URI!);
    } catch (error) {
      console.error("Error en autenticación:", error);

      // Codificar el mensaje de error para evitar problemas en la URL
      const errorMessage = encodeURIComponent("Error en la autenticación");

      res.redirect(
        `${process.env.FRONTEND_REDIRECT_URI}?error=${errorMessage}`
      );
    }
  }
);

authRouter.post("/auth/refresh-token", async (req: Request, res: Response) => {
  const { RefreshToken } = req.cookies;

  if (!RefreshToken) {
    res.status(401).send("Refresh token requerido");
    return;
  }

  try {
    // Buscar la sesión en la base de datos usando el RefreshToken específico
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshToken, RefreshToken))
      .limit(1);

    if (session.length === 0) {
      res.clearCookie("RefreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });
      res.status(401).send("Refresh token inválido");
      return;
    }

    const { userId, expiresAt } = session[0];

    if (expiresAt < Date.now()) {
      await db.delete(sessions).where(eq(sessions.refreshToken, RefreshToken));
      res.status(401).send("Refresh token expirado");
      return;
    }

    // Buscar usuario en la base de datos
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId as string))
      .limit(1);

    if (user.length === 0) {
      res.status(404).send("Usuario no encontrado");
      return;
    }

    // Generar un nuevo refresh token solo para esta sesión
    const newRefreshToken = uuidv4();
    const newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await db
      .update(sessions)
      .set({ refreshToken: newRefreshToken, expiresAt: newExpiresAt })
      .where(eq(sessions.refreshToken, RefreshToken)); // Solo afecta la sesión actual

    // Generar nuevo access token
    const { id, username, email } = user[0];
    const accessTokenJWT = generateToken(id, username, email);

    // Configurar cookies
    res.cookie("KorxToken", accessTokenJWT, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000, // 1 hora
      path: "/",
    });

    res.cookie("RefreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      path: "/",
    });

    res.send({ accessToken: accessTokenJWT });
  } catch (error) {
    console.error("Error en refresh-token:", error);
    res.status(500).send("Error al renovar el token");
  }
});

authRouter.post(
  "/auth/logout",
  checkAuth,
  async (req: Request, res: Response) => {
    const { RefreshToken } = req.cookies;

    if (!RefreshToken) {
      res.status(400).send("No hay sesión activa");
      return;
    }

    try {
      // Eliminar la sesión de la base de datos
      await db.delete(sessions).where(eq(sessions.refreshToken, RefreshToken));

      // Limpiar cookies en el navegador
      res.clearCookie("KorxToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });

      res.clearCookie("RefreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });

      res.status(200).send("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).send("Error al cerrar sesión");
    }
  }
);
