import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract Cloudinary public_id from a secure/CDN image URL.
 * e.g. "https://res.cloudinary.com/cloud_name/image/upload/v1234567/shilpa/products/sample-id.jpg"
 * -> "shilpa/products/sample-id"
 */
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return null;
  }
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    let path = url.slice(uploadIndex + "/upload/".length);
    // Remove version prefix if present, e.g. v1786395292/
    path = path.replace(/^v\d+\//, "");
    // Remove file extension if present, e.g. .jpg, .png, .webp
    path = path.replace(/\.[a-zA-Z0-9]+$/, "");

    return path || null;
  } catch {
    return null;
  }
}

/**
 * Delete an image asset from Cloudinary by its URL or public_id.
 */
export async function deleteCloudinaryImage(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  
  // If credentials are missing, log warning
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("Cloudinary credentials missing from environment. Skipping CDN image deletion.");
    return false;
  }

  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) {
    console.log(`URL "${url}" is not a recognized Cloudinary asset. Skipping CDN deletion.`);
    return false;
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary image delete result for "${publicId}":`, res);
    return res.result === "ok" || res.result === "not found";
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset "${publicId}":`, err);
    return false;
  }
}
