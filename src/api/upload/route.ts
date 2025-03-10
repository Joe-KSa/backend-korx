import express from "express";
import { Request, Response } from "express";
import { Cloudinary } from "../../libs/cloudinaryUtils.js";
import checkAuth from "../../middleware/checkAuth.js";
import multer from "multer";

const upload = multer();
export const uploadRouter = express.Router();

uploadRouter.post(
  "/upload",
  checkAuth,
  upload.single("file"), // Se acepta el campo "file"
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No se ha adjuntado ningún archivo" });
        return;
      }

      const buffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Determinar si es imagen o video
      const resourceType = mimeType.startsWith("image/")
        ? "image"
        : mimeType.startsWith("video/")
        ? "video"
        : null;

      if (!resourceType) {
        res.status(400).json({ error: "Formato de archivo no permitido" });
        return;
      }

      // Subir el archivo a Cloudinary
      const response = await Cloudinary.uploadToCloudinary(
        buffer,
        req.file.originalname
      );

      res.json({
        message: "Archivo subido exitosamente",
        publicId: (response as any).public_id,
        url: (response as any).secure_url,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Hubo un error al subir el archivo" });
    }
  }
);

uploadRouter.delete(
  "/upload",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      const { publicId } = req.body;

      if (!publicId || typeof publicId !== "string") {
        res.status(400).json({ error: "No se ha proporcionado un public_id" });
        return;
      }

      // Eliminar la imagen de Cloudinary
      const response = await Cloudinary.deleteFromCloudinary(publicId);

      res.json({ message: "Imagen eliminada exitosamente", result: response });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Hubo un error al eliminar la imagen" });
    }
  }
);
