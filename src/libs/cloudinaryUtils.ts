import { v2 as cloudinary } from "cloudinary";

import { randomUUID } from "crypto";

export class Cloudinary {
  static async uploadToCloudinary(buffer: Buffer, fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = randomUUID();

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { 
            public_id: `korxteam/${uniqueId}-${safeFileName}`, 
            resource_type: "auto" // Permite subir imágenes y videos
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(buffer);
    });
  }

  static async deleteFromCloudinary(publicId: string) {
    try {
      let response = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      if (response.result === "not found") {
        response = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      }
      return response;
    } catch (error) {
      throw error;
    }
  }  
}
