"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const pinchStart = useRef<number | null>(null);
  const pinchScaleStart = useRef(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Ctrl + scroll zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // only zoom with Ctrl/Cmd held
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(5, s - e.deltaY * 0.004)));
  }, []);

  // Double-click / double-tap to zoom 2× or reset
  function handleDoubleClick() {
    if (scale > 1) {
      reset();
    } else {
      setScale(2);
    }
  }

  // Single tap detection on touch (to close when scale=1)
  function handleTouchTap(e: React.TouchEvent) {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap
      handleDoubleClick();
    }
    lastTap.current = now;
  }

  // Pinch to zoom (touch)
  function getTouchDist(e: React.TouchEvent) {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      // Pinch start
      pinchStart.current = getTouchDist(e);
      pinchScaleStart.current = scale;
    } else if (e.touches.length === 1) {
      handleTouchTap(e);
      if (scale > 1) {
        const touch = e.touches[0];
        dragStart.current = { x: touch.clientX - lastPos.current.x, y: touch.clientY - lastPos.current.y };
        setIsDragging(true);
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2 && pinchStart.current !== null) {
      // Pinch zoom
      const dist = getTouchDist(e);
      const newScale = Math.max(0.5, Math.min(5, pinchScaleStart.current * (dist / pinchStart.current)));
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      const touch = e.touches[0];
      const nx = touch.clientX - dragStart.current.x;
      const ny = touch.clientY - dragStart.current.y;
      lastPos.current = { x: nx, y: ny };
      setPosition({ x: nx, y: ny });
    }
  }

  function handleTouchEnd() {
    pinchStart.current = null;
    setIsDragging(false);
  }

  // Mouse drag (desktop)
  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= 1 || e.pointerType === "touch") return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - lastPos.current.x, y: e.clientY - lastPos.current.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || e.pointerType === "touch") return;
    const nx = e.clientX - dragStart.current.x;
    const ny = e.clientY - dragStart.current.y;
    lastPos.current = { x: nx, y: ny };
    setPosition({ x: nx, y: ny });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType !== "touch") setIsDragging(false);
  }

  function reset() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastPos.current = { x: 0, y: 0 };
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 select-none"
        onClick={(e) => { if (e.target === e.currentTarget && scale <= 1) onClose(); }}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button onClick={() => setScale((s) => Math.min(5, +(s + 0.5).toFixed(1)))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm transition-colors">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm transition-colors">
            <ZoomOut size={18} />
          </button>
          {scale !== 1 && (
            <button onClick={reset}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm transition-colors">
              <RotateCcw size={16} />
            </button>
          )}
          <button onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scale indicator */}
        {scale !== 1 && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {Math.round(scale * 100)}%
          </div>
        )}

        {/* Image container */}
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.img
            src={src}
            alt={alt || "Image"}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              transition: isDragging ? "none" : "transform 0.18s ease",
              maxWidth: "95vw",
              maxHeight: "92vh",
              objectFit: "contain",
              userSelect: "none",
              touchAction: "none",
            }}
            draggable={false}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>

        {/* Hints */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          {scale === 1 ? (
            <p className="text-[11px] text-white/35">Double-tap to zoom · Pinch to zoom · Ctrl+Scroll (desktop)</p>
          ) : (
            <p className="text-[11px] text-white/35">Double-tap to reset</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
