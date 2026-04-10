"use client";

import { useEffect, useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
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

  // Refs for mutable values shared with non-passive native listeners
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  function applyScale(s: number) {
    scaleRef.current = s;
    setScale(s);
  }

  function applyPos(p: { x: number; y: number }) {
    posRef.current = p;
    setPosition(p);
  }

  function reset() {
    applyScale(1);
    applyPos({ x: 0, y: 0 });
  }

  // Escape key + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Android back gesture: push history entry on mount
  useEffect(() => {
    window.history.pushState({ __drawer: "image" }, "");
    const onPopState = () => onClose();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.__drawer === "image") {
        window.history.replaceState(null, "");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-passive native touch listeners (required for e.preventDefault() to work
  // during pinch-to-zoom — React synthetic onTouchMove is passive in React 17+)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function dist(t: TouchList) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchStartDist.current = dist(e.touches);
        pinchStartScale.current = scaleRef.current;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          // Double-tap: zoom 2× or reset
          if (scaleRef.current > 1) reset();
          else applyScale(2);
        }
        lastTap.current = now;

        if (scaleRef.current > 1) {
          const t = e.touches[0];
          dragOrigin.current = { x: t.clientX - posRef.current.x, y: t.clientY - posRef.current.y };
          draggingRef.current = true;
          setIsDragging(true);
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        e.preventDefault();
        const newScale = Math.max(1, Math.min(5, pinchStartScale.current * (dist(e.touches) / pinchStartDist.current)));
        applyScale(newScale);
      } else if (e.touches.length === 1 && draggingRef.current && scaleRef.current > 1 && dragOrigin.current) {
        e.preventDefault();
        const t = e.touches[0];
        applyPos({ x: t.clientX - dragOrigin.current.x, y: t.clientY - dragOrigin.current.y });
      }
    }

    function onTouchEnd() {
      pinchStartDist.current = null;
      draggingRef.current = false;
      dragOrigin.current = null;
      setIsDragging(false);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+scroll zoom (desktop)
  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    applyScale(Math.max(1, Math.min(5, scaleRef.current - e.deltaY * 0.004)));
  }

  // Mouse drag (desktop)
  function handlePointerDown(e: React.PointerEvent) {
    if (scaleRef.current <= 1 || e.pointerType === "touch") return;
    draggingRef.current = true;
    setIsDragging(true);
    dragOrigin.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || e.pointerType === "touch" || !dragOrigin.current) return;
    applyPos({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType !== "touch") { draggingRef.current = false; setIsDragging(false); }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 select-none"
        onClick={(e) => { if (e.target === e.currentTarget && scaleRef.current <= 1) onClose(); }}
      >
        {/* Top-right controls: reset (when zoomed) + close */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
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

        {/* Image container — ref needed for non-passive touch listeners */}
        <div
          ref={containerRef}
          className="flex h-full w-full items-center justify-center overflow-hidden"
          style={{ touchAction: "none" }}
          onWheel={handleWheel}
        >
          <motion.img
            src={src}
            alt={alt || "Image"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              transition: isDragging ? "none" : "transform 0.15s ease",
              maxWidth: "95vw",
              maxHeight: "92vh",
              objectFit: "contain",
              userSelect: "none",
              touchAction: "none",
            }}
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
