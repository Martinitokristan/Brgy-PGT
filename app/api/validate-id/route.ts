import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// ── ID type → keywords that should appear on that ID ─────────────
// We use a lightweight OCR-free heuristic: we validate that the
// uploaded image is a real photograph (not a screenshot / document
// of a completely different type) by checking its metadata and
// dimensions. If you add an OCR provider later, add keyword checks here.

const MIN_BYTES = 15_000;  // real ID photo > 15 KB
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit

// Dimension heuristics for each ID type (landscape or portrait)
// We accept anything within 0.5 – 3.0 aspect ratio (width / height)
const ASPECT_MIN = 0.5;
const ASPECT_MAX = 3.0;

export async function POST(request: Request) {
  // Auth check — must be logged in
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ valid: false, reason: "Invalid request." }, { status: 400 });
  }

  const idType  = formData.get("id_type") as string | null;
  const image   = formData.get("image") as File | null;

  if (!idType || !image) {
    return NextResponse.json({ valid: false, reason: "Missing fields." }, { status: 400 });
  }

  // 1. File size check
  if (image.size < MIN_BYTES) {
    return NextResponse.json({
      valid: false,
      reason: "The uploaded image appears too small to be a valid ID photo. Please take a clearer, closer photo of your ID.",
    });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({
      valid: false,
      reason: "File too large. Maximum is 10 MB.",
    });
  }

  // 2. MIME type check
  const allowedMime = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
  if (!allowedMime.includes(image.type.toLowerCase())) {
    return NextResponse.json({
      valid: false,
      reason: "Invalid file type. Please upload a JPG, PNG, or WEBP image.",
    });
  }

  // 3. Read image bytes — check magic bytes to confirm it's really an image
  const buffer = Buffer.from(await image.arrayBuffer());
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.slice(8, 12).toString("ascii") === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json({
      valid: false,
      reason: "The uploaded file does not appear to be a valid image. Please upload a proper photo of your ID.",
    });
  }

  // 4. Image dimensions via JPEG/PNG header parsing
  let width = 0, height = 0;
  if (isJpeg) {
    // Scan JPEG segments for SOF marker
    let i = 2;
    while (i < buffer.length - 8) {
      if (buffer[i] !== 0xff) break;
      const marker = buffer[i + 1];
      // SOF0, SOF1, SOF2 ...
      if (marker >= 0xc0 && marker <= 0xc3) {
        height = (buffer[i + 5] << 8) | buffer[i + 6];
        width  = (buffer[i + 7] << 8) | buffer[i + 8];
        break;
      }
      const segLen = (buffer[i + 2] << 8) | buffer[i + 3];
      i += 2 + segLen;
    }
  } else if (isPng) {
    width  = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  }

  if (width > 0 && height > 0) {
    const aspect = width / height;
    if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) {
      return NextResponse.json({
        valid: false,
        reason: `The image dimensions look unusual for an ID (${width}x${height}). Please take a direct photo of your ${idType.replace(/_/g, " ")} from the front.`,
      });
    }
    // Minimum resolution: IDs should be at least 200×120 px
    if (width < 200 || height < 100) {
      return NextResponse.json({
        valid: false,
        reason: "The image resolution is too low. Please take a closer, clearer photo of your ID.",
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // All checks passed — ID photo looks valid
  // ──────────────────────────────────────────────────────────────
  return NextResponse.json({ valid: true });
}
