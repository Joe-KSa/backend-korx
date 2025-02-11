import { v2 as cloudinary } from "cloudinary";

export class Cloudinary {
  static async uploadToCloudinary(buffer: Buffer, fileName: string) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { public_id: `korxteam/${Date.now()}-${fileName}` },
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
