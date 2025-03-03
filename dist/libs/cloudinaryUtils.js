var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
export class Cloudinary {
    static uploadToCloudinary(buffer, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
            const uniqueId = randomUUID();
            return new Promise((resolve, reject) => {
                cloudinary.uploader
                    .upload_stream({
                    public_id: `korxteam/${uniqueId}-${safeFileName}`,
                    resource_type: "auto" // Permite subir imágenes y videos
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                })
                    .end(buffer);
            });
        });
    }
    static deleteFromCloudinary(publicId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let response = yield cloudinary.uploader.destroy(publicId, { resource_type: "image" });
                if (response.result === "not found") {
                    response = yield cloudinary.uploader.destroy(publicId, { resource_type: "video" });
                }
                return response;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
