import { v2 as cloudinary } from "cloudinary";

import { randomUUID } from "crypto";

export class Cloudinary {
  static async uploadToCloudinary(buffer: Buffer, fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = randomUUID();

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { public_id: `korxteam/${uniqueId}-${safeFileName}` },
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
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}
