type Area = { x: number; y: number; width: number; height: number };

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fitWithin(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(1, maxW / w, maxH / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale), scale };
}

export async function cropImageToBlob(options: {
  imageSrc: string;
  cropAreaPixels: Area;
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
  quality?: number; // 0..1 (ignored for png)
  maxWidth?: number;
  maxHeight?: number;
}): Promise<Blob> {
  const {
    imageSrc,
    cropAreaPixels,
    mimeType = "image/jpeg",
    quality = 0.9,
    maxWidth = 1600,
    maxHeight = 1600,
  } = options;

  const image = await createImage(imageSrc);

  const safeX = clamp(cropAreaPixels.x, 0, image.naturalWidth);
  const safeY = clamp(cropAreaPixels.y, 0, image.naturalHeight);
  const safeW = clamp(cropAreaPixels.width, 1, image.naturalWidth - safeX);
  const safeH = clamp(cropAreaPixels.height, 1, image.naturalHeight - safeY);

  const { w: outW, h: outH } = fitWithin(safeW, safeH, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(image, safeX, safeY, safeW, safeH, 0, 0, outW, outH);

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      mimeType,
      mimeType === "image/png" ? undefined : clamp(quality, 0.5, 0.98)
    );
  });

  if (!blob) throw new Error("Failed to create cropped image");
  return blob;
}

