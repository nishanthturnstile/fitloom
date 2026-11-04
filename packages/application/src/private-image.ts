import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  type BlobKey,
  type BlobStore,
  referenceForFile,
} from "./blob-store.js";
import { BodyReadError, readBoundedBody } from "./body.js";
import { CommandError } from "./errors.js";

import {
  PRIVATE_IMAGE_MAX_BYTES,
  PRIVATE_IMAGE_MAX_PIXELS,
  PRIVATE_IMAGE_MAX_UPLOADS,
} from "./private-image-limits.js";

let uploads = 0;
export function claimImageUpload() {
  if (uploads >= PRIVATE_IMAGE_MAX_UPLOADS)
    throw new CommandError("temporary", "Uploads are busy; try again");
  uploads++;
  return () => {
    uploads--;
  };
}
export async function normalizePrivateImage(request: Request) {
  const declared = request.headers.get("content-type");
  if (declared !== "image/png" && declared !== "image/jpeg")
    throw new CommandError("validation", "Upload a JPEG or PNG image");
  try {
    const raw = await readBoundedBody(request, {
      maxBytes: PRIVATE_IMAGE_MAX_BYTES,
      timeoutMs: 15000,
    });
    const image = sharp(raw, {
      limitInputPixels: PRIVATE_IMAGE_MAX_PIXELS,
      failOn: "warning",
      animated: false,
    });
    const info = await image.metadata();
    if (
      (info.format !== "png" && info.format !== "jpeg") ||
      (info.pages ?? 1) > 1 ||
      `image/${info.format}` !== declared
    )
      throw Error();
    const rotated = image.rotate().timeout({ seconds: 5 }); // Sharp strips metadata unless explicitly preserved.
    const bytes = await (info.format === "png"
      ? rotated.png()
      : rotated.jpeg({ quality: 90 })
    ).toBuffer();
    if (!bytes.length || bytes.length > PRIVATE_IMAGE_MAX_BYTES) throw Error();
    return {
      bytes,
      mediaType: declared,
      digest: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    throw new CommandError(
      "validation",
      error instanceof BodyReadError
        ? error.message
        : "Invalid image; use JPEG/PNG up to 5 MiB and 12 million pixels",
    );
  }
}
export async function privateImageResponse(
  get: () => Promise<{
    id: BlobKey;
    storageVersion: 1 | 2;
    sha256: string;
    size: number;
    mediaType: string;
  }>,
  store: BlobStore,
  disposition: "inline" | "attachment",
): Promise<Response> {
  const file = await get(),
    body = await store.open(referenceForFile(file), file.size);
  try {
    await get();
  } catch (error) {
    await body.cancel().catch(() => {});
    throw error;
  }
  return new Response(body, {
    headers: {
      "Content-Type": file.mediaType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${disposition}; filename="${file.id}.${file.mediaType === "image/png" ? "png" : "jpg"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
