import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import jsQR from "jsqr";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

// ── ID type → keywords that should appear on that ID ─────────────
// We use a lightweight OCR-free heuristic: we validate that the
// uploaded image is a real photograph (not a screenshot / document
// of a completely different type) by checking its metadata and
// dimensions. If you add an OCR provider later, add keyword checks here.

const MIN_BYTES = 15_000;  // real ID photo > 15 KB
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB limit

const ASPECT_BOUNDS: Record<string, { min: number; max: number }> = {
  // These are intentionally broad because users upload full camera frames,
  // not perfectly cropped ID rectangles.
  national_id: { min: 0.45, max: 2.4 },
  drivers_license: { min: 0.45, max: 2.4 },
  voters_id: { min: 0.45, max: 2.4 },
  postal_id: { min: 0.45, max: 2.4 },
  sss_id: { min: 0.45, max: 2.4 },
  philhealth_id: { min: 0.45, max: 2.4 },
  senior_citizen_id: { min: 0.45, max: 2.4 },
  pwd_id: { min: 0.45, max: 2.4 },
  passport: { min: 0.4, max: 1.5 },
  school_id: { min: 0.4, max: 2.6 },
};

type IdRule = {
  required: string[];
  forbidden: string[];
  required_min: number;
};

const ID_TEXT_RULES: Record<string, IdRule> = {
  national_id: {
    required: [
      "PHILSYS",
      "PHIL SYS",
      "PAMBANSANG PAGKAKAKILANLAN",
      "PHILIPPINE IDENTIFICATION CARD",
      "PHILIPPINE IDENTIFICATION",
      "REPUBLIKA NG PILIPINAS",
      "REPUBLIC OF THE PHILIPPINES",
      "PCN",
      "PHILSYS NUMBER",
      "NATIONAL ID",
    ],
    forbidden: [
      "BARANGAY",
      "PASSPORT",
      "DRIVER",
      "LICENSE",
      "COMELEC",
      "PHILHEALTH",
      "SOCIAL SECURITY SYSTEM",
      "SSS",
      "POSTAL",
      "PWD",
      "SENIOR CITIZEN",
      "UNIFIED MULTI PURPOSE ID",
      "UMID",
      "LTO",
    ],
    required_min: 1,
  },
  passport: {
    required: [
      "PASSPORT",
      "REPUBLIC OF THE PHILIPPINES",
      "REPUBLIKA NG PILIPINAS",
      "DEPARTMENT OF FOREIGN AFFAIRS",
      "DFA",
      "P<PHL",
      "PHL",
    ],
    forbidden: ["PHILSYS", "BARANGAY", "DRIVER", "COMELEC", "PHILHEALTH", "SSS", "POSTAL", "PWD", "SENIOR CITIZEN", "LTO"],
    required_min: 1,
  },
  drivers_license: {
    required: [
      "DRIVER",
      "LICENSE",
      "LAND TRANSPORTATION OFFICE",
      "LTO",
      "REPUBLIC OF THE PHILIPPINES",
      "NON PROFESSIONAL",
      "PROFESSIONAL",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "BARANGAY", "COMELEC", "PHILHEALTH", "SSS", "POSTAL", "PWD", "SENIOR CITIZEN"],
    required_min: 1,
  },
  voters_id: {
    required: [
      "VOTER",
      "VOTERS",
      "COMELEC",
      "COMMISSION ON ELECTIONS",
      "VOTERS ID",
      "PRECINCT",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "PHILHEALTH", "SSS", "POSTAL", "PWD", "SENIOR CITIZEN"],
    required_min: 1,
  },
  school_id: {
    required: [
      "SCHOOL",
      "UNIVERSITY",
      "COLLEGE",
      "STUDENT",
      "STUDENT ID",
      "ID NO",
      "LEARNER REFERENCE NUMBER",
      "LRN",
      "SCHOOL YEAR",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "PHILHEALTH", "SSS"],
    required_min: 1,
  },
  senior_citizen_id: {
    required: [
      "SENIOR CITIZEN",
      "OFFICE OF SENIOR CITIZENS AFFAIRS",
      "OSCA",
      "EXPANDED SENIOR CITIZENS ACT",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "PHILHEALTH", "SSS"],
    required_min: 1,
  },
  pwd_id: {
    required: [
      "PWD",
      "PERSONS WITH DISABILITY",
      "PERSON WITH DISABILITY",
      "DISABILITY",
      "NCDA",
      "NATIONAL COUNCIL ON DISABILITY AFFAIRS",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "PHILHEALTH", "SSS"],
    required_min: 1,
  },
  postal_id: {
    required: [
      "POSTAL",
      "PHLPOST",
      "PHILIPPINE POSTAL",
      "POSTAL ID",
      "POSTAL REFERENCE NUMBER",
      "PRN",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "PHILHEALTH", "SSS"],
    required_min: 1,
  },
  sss_id: {
    required: [
      "SOCIAL SECURITY SYSTEM",
      "SSS",
      "UNIFIED MULTI PURPOSE ID",
      "UMID",
      "COMMON REFERENCE NUMBER",
      "CRN",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "POSTAL"],
    required_min: 1,
  },
  philhealth_id: {
    required: [
      "PHILHEALTH",
      "PHILIPPINE HEALTH INSURANCE",
      "PHILIPPINE HEALTH INSURANCE CORPORATION",
      "PHILHEALTH IDENTIFICATION NUMBER",
      "PIN",
    ],
    forbidden: ["PHILSYS", "PASSPORT", "DRIVER", "LICENSE", "COMELEC", "POSTAL"],
    required_min: 1,
  },
};

function decodeRgba(buffer: Buffer, isJpeg: boolean, isPng: boolean) {
  try {
    if (isJpeg) {
      const decoded = jpeg.decode(buffer, { useTArray: true });
      const clamped = new Uint8ClampedArray(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
      return { data: clamped, width: decoded.width, height: decoded.height };
    }
    if (isPng) {
      const decoded = PNG.sync.read(buffer);
      const clamped = new Uint8ClampedArray(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
      return { data: clamped, width: decoded.width, height: decoded.height };
    }
  } catch {
    return null;
  }
  return null;
}

function grayscaleVariance(rgba: Uint8ClampedArray, sampleStep = 8) {
  let count = 0;
  let mean = 0;
  let m2 = 0;
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) {
    const g = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    count += 1;
    const delta = g - mean;
    mean += delta / count;
    m2 += delta * (g - mean);
  }
  if (count < 2) return 0;
  return m2 / (count - 1);
}

function edgeDensity(rgba: Uint8ClampedArray, width: number, height: number, step = 6) {
  let edges = 0;
  let total = 0;
  const gray = (idx: number) => 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const i = (y * width + x) * 4;
      const gx = gray(i + 4) - gray(i - 4);
      const gy = gray(i + width * 4) - gray(i - width * 4);
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > 55) edges += 1;
      total += 1;
    }
  }
  if (!total) return 0;
  return edges / total;
}

function skinToneRatio(rgba: Uint8ClampedArray, sampleStep = 6) {
  let skin = 0;
  let total = 0;
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isSkin =
      r > 95 &&
      g > 40 &&
      b > 20 &&
      max - min > 15 &&
      Math.abs(r - g) > 15 &&
      r > g &&
      r > b;
    if (isSkin) skin += 1;
    total += 1;
  }
  if (!total) return 0;
  return skin / total;
}

function normalizeText(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function textContainsMarker(normalizedText: string, marker: string) {
  const normalizedMarker = normalizeText(marker);
  if (!normalizedMarker) return false;
  if (normalizedText.includes(normalizedMarker)) return true;

  // Fallback for noisy OCR: token-based partial matching for multi-word markers.
  const tokens = normalizedMarker.split(" ").filter((t) => t.length >= 4);
  if (tokens.length === 0) return false;
  const tokenHits = tokens.filter((t) => normalizedText.includes(t)).length;
  return tokenHits >= Math.max(1, Math.ceil(tokens.length * 0.6));
}

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
  const ocrTextRaw = String(formData.get("ocr_text") ?? "");
  const ocrText = normalizeText(ocrTextRaw);

  if (!idType || !image) {
    return NextResponse.json({ valid: false, reason: "Missing fields." }, { status: 400 });
  }

  // 1. File size check
  if (image.size < MIN_BYTES) {
    return NextResponse.json({
      valid: false,
      reason: "Please upload a clearer and closer photo of your selected ID.",
    });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({
      valid: false,
      reason: "Please upload an image that is 10 MB or smaller.",
    });
  }

  // 2. MIME type check
  const allowedMime = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
  if (!allowedMime.includes(image.type.toLowerCase())) {
    return NextResponse.json({
      valid: false,
      reason: "Please upload a valid image file in JPG, PNG, or WEBP format.",
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
      reason: "Please upload a valid photo of your selected ID.",
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

  let aspect: number | null = null;
  if (width > 0 && height > 0) {
    aspect = width / height;
    // Minimum resolution: IDs should be at least 200×120 px
    if (width < 200 || height < 100) {
      return NextResponse.json({
        valid: false,
        reason: "Please retake the photo with better focus and keep the ID closer to the camera.",
      });
    }
    // Hard fail only for extremely unusual frame ratios.
    if (aspect < 0.25 || aspect > 4.0) {
      return NextResponse.json({
        valid: false,
        reason: "Please retake a clear front-facing photo of your selected ID.",
      });
    }
  }

  // 5. Fast image-content checks (pixel decode — only for JPEG/PNG; WebP skips pixel checks)
  const decoded = decodeRgba(buffer, isJpeg, isPng);

  let variance = 999;
  let density = 1;
  let skinRatio = 1;

  if (decoded) {
    const qr = jsQR(decoded.data, decoded.width, decoded.height, { inversionAttempts: "dontInvert" });
    if (qr?.data) {
      return NextResponse.json({
        valid: false,
        reason: "A QR image was detected, so please upload the actual photo of your selected ID.",
      });
    }
    variance = grayscaleVariance(decoded.data);
    density = edgeDensity(decoded.data, decoded.width, decoded.height);
    skinRatio = skinToneRatio(decoded.data);
  }
  // WebP (decoded === null): pixel-level checks are skipped; size/dimension checks above already ran.

  if (aspect !== null) {
    const bounds = ASPECT_BOUNDS[idType] ?? { min: 0.4, max: 2.8 };
    if (aspect < bounds.min || aspect > bounds.max) {
      return NextResponse.json({
        valid: false,
        reason: "Please retake the photo and keep the selected ID centered and fully visible.",
      });
    }
  }

  // 6. Strict ID type text matching (from client OCR)
  const rule = ID_TEXT_RULES[idType];
  if (!rule) {
    return NextResponse.json({
      valid: false,
      reason: "The selected ID type is not supported for automatic matching yet.",
    });
  }
  if (ocrText.length < 8) {
    // Not enough text was extracted — we cannot confirm the ID type.
    // Reject so random images (non-IDs) cannot pass with empty OCR text.
    return NextResponse.json({
      valid: false,
      reason:
        "No readable text was detected on the uploaded ID. Please retake the photo with better lighting, keep the ID flat on a surface, and ensure all printed text is clearly visible.",
    });
  }
  const requiredMatches = rule.required.filter((k) => textContainsMarker(ocrText, k)).length;
  const forbiddenMatches = rule.forbidden.filter((k) => textContainsMarker(ocrText, k)).length;
  const ocrTokens = ocrText.split(" ").filter((t) => t.length >= 4);
  const requiredTokenHits = new Set<string>();
  for (const marker of rule.required) {
    const markerTokens = normalizeText(marker).split(" ").filter((t) => t.length >= 4);
    for (const token of markerTokens) {
      if (ocrTokens.some((ocrToken) => ocrToken.includes(token) || token.includes(ocrToken))) {
        requiredTokenHits.add(token);
      }
    }
  }
  const hasStrongRequiredSignal =
    requiredMatches >= rule.required_min ||
    requiredTokenHits.size >= Math.max(2, rule.required_min);
  const hasStrongForbiddenSignal = forbiddenMatches >= 2 && requiredTokenHits.size < 2;
  if (!hasStrongRequiredSignal || hasStrongForbiddenSignal) {
    return NextResponse.json({
      valid: false,
      reason: "The uploaded ID does not match the selected ID type, so please choose the correct type or upload the correct ID.",
    });
  }

  // ──────────────────────────────────────────────────────────────
  // All checks passed — ID photo looks valid
  // ──────────────────────────────────────────────────────────────
  return NextResponse.json({ valid: true });
}
