import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/auth";
import { badRequest } from "@/lib/api";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export async function POST(req: Request) {
  // The demo checked a cookie named `admin_session` that nothing ever set,
  // so this endpoint returned 401 on every upload and the feature was dead.
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "Image hosting isn't configured yet" },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return badRequest("Choose an image to upload");
  if (!ALLOWED.has(file.type)) {
    return badRequest("Use a JPG, PNG, WebP, AVIF or GIF image");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("That image is over 8 MB — use a smaller one");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "shilpa/products",
            resource_type: "image",
            // Cap the stored size; product cards never need more than this.
            transformation: [
              { width: 1000, height: 1000, crop: "limit", quality: "auto" },
            ],
          },
          (err, result) =>
            err || !result ? reject(err ?? new Error("Upload failed")) : resolve(result),
        )
        .end(buffer);
    });

    return NextResponse.json({ url: uploaded.secure_url });
  } catch {
    return NextResponse.json(
      { error: "Couldn't upload that image. Try again." },
      { status: 502 },
    );
  }
}
