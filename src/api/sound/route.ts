import express from "express";
import { Request, Response } from "express";
import multer from "multer";
import checkAuth from "../../middleware/checkAuth.js";
import "dotenv/config";
import { supabase } from "../../config/supabase.config.js";

const upload = multer();
export const soundRouter = express.Router();

import slugify from "slugify";

soundRouter.post(
  "/upload-sound",
  checkAuth,
  upload.single("sound"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha adjuntado ningún sonido" });
        return;
      }

      const { originalname, mimetype, buffer } = req.file;
      const extension = originalname.split(".").pop();
      const baseName = slugify.default(originalname.replace(`.${extension}`, ""), {
        lower: true,
        strict: true,
      });
      const safeFileName = `${baseName}.${extension}`;
      const filePath = `${Date.now()}_${safeFileName}`;

      const { error } = await supabase.storage
        .from("sonidos")
        .upload(filePath, new Blob([buffer]), { contentType: mimetype });

      if (error) throw error;

      const { publicUrl } = supabase.storage.from("sonidos").getPublicUrl(filePath).data;

      res.json({
        message: "Sonido subido exitosamente",
        soundUrl: publicUrl,
        soundPath: filePath,
      });
    } catch (e) {
      res.status(500).json({ error: "Hubo un error al subir el sonido" });
    }
  }
);


soundRouter.delete(
  "/upload-sound",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;
      if (!RefreshToken) {
        res.status(401).json({ error: "Unauthorized access" });
        return;
      }

      const { soundPath } = req.body;
      if (!soundPath || typeof soundPath !== "string") {
        res
          .status(400)
          .json({ error: "No se ha proporcionado un soundPath válido" });
        return;
      }

      const { error } = await supabase.storage
        .from("sonidos")
        .remove([soundPath]);

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      res.json({ message: "Sonido eliminado exitosamente" });
    } catch (e) {
      console.error("Error en deleteAudio:", e);
      res.status(500).json({ error: "Hubo un error al eliminar el sonido" });
    }
  }
);
