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
import { Cloudinary } from "../../libs/cloudinaryUtils.js";
import checkAuth from "../../middleware/checkAuth.js";
import multer from "multer";
const upload = multer();
export const uploadRouter = express.Router();
uploadRouter.post("/upload", checkAuth, upload.single("image"), // Procesa un solo archivo con el nombre "image"
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const response = yield Cloudinary.uploadToCloudinary(buffer, req.file.originalname);
        res.json({
            message: "Imagen subida exitosamente",
            publicId: response.public_id,
            url: response.secure_url,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Hubo un error al subir la imagen" });
    }
}));
uploadRouter.delete("/upload", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const response = yield Cloudinary.deleteFromCloudinary(publicId);
        res.json({ message: "Imagen eliminada exitosamente", result: response });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Hubo un error al eliminar la imagen" });
    }
}));
