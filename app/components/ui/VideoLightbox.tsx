"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function VideoLightbox(props: { src: string; onClose: () => void }) {
  const { src, onClose } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progressPct = useMemo(() => {
    if (!duration) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndSyncToFeed();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Android back gesture: push history entry on mount
  // so swiping back closes the video instead of navigating away.
  useEffect(() => {
    window.history.pushState({ __drawer: "video" }, "");

    const onPopState = () => {
      closeAndSyncToFeed();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Use replaceState (not back()) so no popstate fires and no race with other overlays
      if (window.history.state?.__drawer === "video") {
        window.history.replaceState(null, "");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Hide controls after a moment when playing
    if (!isPlaying) return;
    const t = setTimeout(() => setShowControls(false), 1500);
    return () => clearTimeout(t);
  }, [isPlaying]);

  function syncFromVideo() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime || 0);
    setDuration(v.duration || 0);
    setIsPlaying(!v.paused);
    setIsMuted(v.muted);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    setShowControls(true);
    if (v.paused) void v.play();
    else v.pause();
    syncFromVideo();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    setShowControls(true);
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }

  function seekTo(pct: number) {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = (pct / 100) * v.duration;
    syncFromVideo();
  }

  function closeAndSyncToFeed() {
    const v = videoRef.current;
    const detail = {
      src,
      currentTime: v?.currentTime ?? 0,
    };
    try {
      window.dispatchEvent(new CustomEvent("video-lightbox-close", { detail }));
    } catch {}
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAndSyncToFeed();
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            controls={false}
            onLoadedMetadata={syncFromVideo}
            onTimeUpdate={syncFromVideo}
            onPlay={syncFromVideo}
            onPause={syncFromVideo}
            onClick={(e) => {
              e.stopPropagation();
              // Facebook-like: tap video toggles play/pause and reveals controls/time
              setShowControls(true);
              togglePlay();
            }}
          />
        </div>

        {/* Top bar */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 p-4">
          <div className={`pointer-events-auto flex items-center justify-end transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={closeAndSyncToFeed}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center play/pause (Facebook-like) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all ${
              showControls ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="translate-x-[1px]" />}
          </button>
        </div>

        {/* Bottom controls */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-white/85">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div
              className="relative h-2 w-full cursor-pointer rounded-full bg-white/25"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                seekTo(pct);
              }}
            >
              <div className="absolute left-0 top-0 h-2 rounded-full bg-white" style={{ width: `${progressPct}%` }} />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `calc(${progressPct}% - 8px)` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
              </button>

              <button
                onClick={toggleMute}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

