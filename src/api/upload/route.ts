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
  upload.single("image"), // Procesa un solo archivo con el nombre "image"
  async (req: Request, res: Response) => {
    try {
      const { RefreshToken } = req.cookies;

      if (!RefreshToken) {
        res.status(401).send("Unauthorized access");
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No se ha adjuntado ninguna imagen" });
        return;
      }

      const buffer = req.file.buffer;

      // Subir la imagen a Cloudinary
      const response = await Cloudinary.uploadToCloudinary(
        buffer,
        req.file.originalname
      );

      res.json({
        message: "Imagen subida exitosamente",
        publicId: (response as any).public_id,
        url: (response as any).secure_url,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Hubo un error al subir la imagen" });
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
