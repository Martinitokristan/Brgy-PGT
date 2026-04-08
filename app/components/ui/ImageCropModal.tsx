"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { cropImageToBlob } from "@/app/utils/imageCrop";

type CropShape = "round" | "rect";

export default function ImageCropModal(props: {
  isOpen: boolean;
  file: File | null;
  aspect: number;
  shape?: CropShape;
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}) {
  const { isOpen, file, aspect, shape = "rect", title = "Crop photo", onCancel, onConfirm } = props;

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!isOpen) return;
    // reset interaction each open
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsSaving(false);
  }, [isOpen, file]);

  useEffect(() => {
    if (!imageUrl) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // iOS Safari can throw NotFoundError when a pointer capture is released
  // after a gesture is interrupted/cancelled. Guard it only while modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const proto = HTMLElement.prototype as any;
    const original = proto.releasePointerCapture as ((pointerId: number) => void) | undefined;
    if (typeof original !== "function") return;

    proto.releasePointerCapture = function (pointerId: number) {
      try {
        return original.call(this, pointerId);
      } catch (e: any) {
        if (e?.name === "NotFoundError") return;
        throw e;
      }
    };

    return () => {
      proto.releasePointerCapture = original;
    };
  }, [isOpen]);

  if (!isOpen || !file || !imageUrl) return null;

  async function handleSave() {
    if (!croppedAreaPixels || isSaving || !imageUrl) return;
    const imageSrc = imageUrl;
    setIsSaving(true);
    try {
      const blob = await cropImageToBlob({
        imageSrc,
        cropAreaPixels: croppedAreaPixels,
        mimeType: "image/jpeg",
        quality: 0.9,
        maxWidth: aspect === 1 ? 900 : 1800,
        maxHeight: aspect === 1 ? 900 : 900,
      });

      const ext = "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const outName = `${baseName}-cropped.${ext}`;
      const croppedFile = new File([blob], outName, { type: blob.type || "image/jpeg" });
      onConfirm(croppedFile);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => {
          if (isSaving) return;
          onCancel();
        }}
      />

      <div className="absolute inset-0 mx-auto flex w-full max-w-3xl flex-col bg-white dark:bg-slate-900 shadow-2xl sm:inset-y-6 sm:rounded-[22px]">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Drag to reposition, pinch/scroll to zoom
            </p>
          </div>
          <button
            onClick={() => !isSaving && onCancel()}
            className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>

        <div className="relative w-full flex-1 bg-black">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={shape === "round" ? "round" : "rect"}
            showGrid={shape !== "round"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_croppedArea: Area, croppedAreaPixels: Area) => {
              setCroppedAreaPixels(croppedAreaPixels);
            }}
          />
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!croppedAreaPixels || isSaving}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

