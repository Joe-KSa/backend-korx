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
import multer from "multer";
import checkAuth from "../../middleware/checkAuth.js";
import "dotenv/config";
import { supabase } from "../../config/supabase.config.js";
const upload = multer();
export const soundRouter = express.Router();
soundRouter.post("/upload-sound", checkAuth, upload.single("sound"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).json({ error: "Unauthorized access" });
            return;
        }
        if (!req.file) {
            res.status(400).json({ error: "No se ha adjuntado ningún sonido" });
            return;
        }
        const { originalname, mimetype, buffer } = req.file;
        const filePath = `${Date.now()}_${originalname}`;
        const { error } = yield supabase.storage
            .from("sonidos")
            .upload(filePath, buffer, { contentType: mimetype });
        if (error)
            throw error;
        const { publicUrl } = supabase.storage
            .from("sonidos")
            .getPublicUrl(filePath).data;
        res.json({
            message: "Sonido subido exitosamente",
            soundUrl: publicUrl,
            soundPath: filePath,
        });
    }
    catch (e) {
        res.status(500).json({ error: "Hubo un error al subir el sonido" });
    }
}));
soundRouter.delete("/upload-sound", checkAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { RefreshToken } = req.cookies;
        if (!RefreshToken) {
            res.status(401).json({ error: "Unauthorized access" });
            return;
        }
        const { soundPath } = req.body;
        if (!soundPath || typeof soundPath !== "string") {
            res.status(400).json({ error: "No se ha proporcionado un soundPath válido" });
            return;
        }
        const { error } = yield supabase.storage.from("sonidos").remove([soundPath]);
        if (error) {
            console.error("Error de Supabase:", error);
            throw error;
        }
        res.json({ message: "Sonido eliminado exitosamente" });
    }
    catch (e) {
        console.error("Error en deleteAudio:", e);
        res.status(500).json({ error: "Hubo un error al eliminar el sonido" });
    }
}));
