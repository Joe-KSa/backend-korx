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
import { tags } from "../../db/schema.js";
export const tagsRouter = express.Router();
tagsRouter.get("/tags", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tagsData = yield db
            .select({
            id: tags.id,
            name: tags.name,
        })
            .from(tags);
        res.status(200).json(tagsData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get tags." });
    }
}));
