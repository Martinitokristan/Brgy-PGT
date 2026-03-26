"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Upload, Camera, CheckCircle2, ChevronRight,
  ArrowLeft, Clock, FileText, User, Loader2, RotateCcw, VideoOff,
  AlertTriangle,
} from "lucide-react";

const MODEL_URL = "/models";

const VALID_ID_TYPES = [
  { value: "national_id", label: "Philippine National ID (PhilSys)" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "voters_id", label: "Voter's ID" },
  { value: "school_id", label: "School ID" },
  { value: "senior_citizen_id", label: "Senior Citizen ID" },
  { value: "pwd_id", label: "PWD ID" },
  { value: "postal_id", label: "Postal ID" },
  { value: "sss_id", label: "SSS ID" },
  { value: "philhealth_id", label: "PhilHealth ID" },
];

const STEPS = [
  { id: 1, label: "Introduction", icon: ShieldCheck },
  { id: 2, label: "Upload ID", icon: FileText },
  { id: 3, label: "Face Scan", icon: Camera },
];

// Liveness stages
const STAGES = [
  { key: "centered", label: "Center your face inside the oval", weight: 30 },
  { key: "smiled", label: "Smile naturally", weight: 30 },
  { key: "blinked", label: "Blink once", weight: 30 },
  { key: "matched", label: "Verifying identity...", weight: 10 },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

// ── Eye Aspect Ratio ───────────────────────────────────────────
function eyeAspectRatio(pts: { x: number; y: number }[]): number {
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  return (d(pts[1], pts[5]) + d(pts[2], pts[4])) / (2 * d(pts[0], pts[3]) + 1e-6);
}

// ── SVG oval constants — BIGGER oval ────────────────────────────
const VW = 100, VH = 125;
const ORX = 38, ORY = 50;                     // much bigger oval
const OCX = VW / 2, OCY = VH * 0.46;
const OVAL_CIRC = Math.round(2 * Math.PI * Math.sqrt((ORX ** 2 + ORY ** 2) / 2));

export default function VerifyAccountPage() {
  const router = useRouter();

  // ── Existing verification status check ─────────────────────────
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/verification");
        const data = await res.json();
        if (data?.status && data.status !== "none") {
          setExistingStatus(data.status);
        }
      } catch { /* ignore */ }
      setLoadingStatus(false);
    })();
  }, []);

  // flow state
  const [step, setStep] = useState(1);
  const [idType, setIdType] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idValidating, setIdValidating] = useState(false);
  const [idValidError, setIdValidError] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  // camera / liveness state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const faceApiRef = useRef<any>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // liveness detection state
  const [done, setDone] = useState<Record<StageKey, boolean>>({
    centered: false, smiled: false, blinked: false, matched: false,
  });
  const doneRef = useRef(done);
  doneRef.current = done;

  const centeredHeldRef = useRef<number | null>(null);
  const smileHeldRef = useRef<number | null>(null);
  const eyeWasClosedRef = useRef(false);
  const capturedRef = useRef(false);
  const stageCompletedAtRef = useRef<number>(0); // timestamp when last stage completed

  // Live hint for real-time feedback
  const [liveHint, setLiveHint] = useState("");

  // derived values
  const progress = STAGES.reduce((acc, s) => acc + (done[s.key] ? s.weight : 0), 0);
  const currentStage = STAGES.find((s) => !done[s.key]);
  const arcColor = progress >= 100 ? "#10b981" : "#22c55e";

  // ── Load models ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 3 || modelsReady) return;
    (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        faceApiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsReady(true);
      } catch (e) {
        console.error("Model load failed", e);
        setCamError("Failed to load face detection models. Please refresh.");
      }
    })();
  }, [step]);

  // ── Camera controls ────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) stopCamera();
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err: any) {
      const map: Record<string, string> = {
        NotAllowedError: "Camera access denied. Allow camera in your browser settings.",
        NotFoundError: "No camera found on this device.",
      };
      setCamError(map[err.name] ?? "Could not start camera. Try again.");
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (step === 3 && !selfiePreview) startCamera();
    return () => { if (step !== 3) stopCamera(); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const facingModeRef = useRef(facingMode);
  useEffect(() => {
    if (facingModeRef.current !== facingMode) {
      facingModeRef.current = facingMode;
      stopCamera();
      startCamera();
    }
  }, [facingMode, startCamera, stopCamera]);

  // ── Detection loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn || !modelsReady || selfiePreview || capturedRef.current) return;

    let running = true;
    const faceapi = faceApiRef.current;
    if (!faceapi) return;

    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.3 });

    async function detect() {
      if (!running) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const result = await faceapi
          .detectSingleFace(video, opts)
          .withFaceLandmarks(true)
          .withFaceExpressions();

        const cur = doneRef.current;

        if (result) {
          const { box } = result.detection;
          const vw = video.videoWidth, vh = video.videoHeight;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          const facePct = (box.width * box.height) / (vw * vh);

          const now = Date.now();
          const delaySinceLastStage = now - stageCompletedAtRef.current;

          // ── 1. CENTERED
          if (!cur.centered) {
            const inBounds =
              cx > vw * 0.15 && cx < vw * 0.85 &&
              cy > vh * 0.10 && cy < vh * 0.90 &&
              facePct > 0.03 && facePct < 0.75;

            if (inBounds) {
              if (!centeredHeldRef.current) centeredHeldRef.current = now;
              const held = now - centeredHeldRef.current;
              setLiveHint(held > 500 ? "Hold steady..." : "Detecting face...");
              if (held > 1000) {
                stageCompletedAtRef.current = now;
                setLiveHint("Good!");
                setDone((d) => ({ ...d, centered: true }));
              }
            } else {
              centeredHeldRef.current = null;
              setLiveHint("Move face into oval");
            }

          // ── 2. SMILE (wait 1.5s after centered)
          } else if (!cur.smiled) {
            if (delaySinceLastStage < 1500) {
              setLiveHint("Good! Now smile...");
            } else {
              const happy = result.expressions.happy ?? 0;
              if (happy > 0.40) {
                if (!smileHeldRef.current) smileHeldRef.current = now;
                setLiveHint("Keep smiling...");
                if (now - smileHeldRef.current > 400) {
                  stageCompletedAtRef.current = now;
                  setLiveHint("Great!");
                  setDone((d) => ({ ...d, smiled: true }));
                }
              } else {
                smileHeldRef.current = null;
                setLiveHint("Smile naturally");
              }
            }

          // ── 3. BLINK (wait 2s after smiled)
          } else if (!cur.blinked) {
            if (delaySinceLastStage < 2000) {
              setLiveHint("Get ready to blink...");
              eyeWasClosedRef.current = false;
            } else {
              setLiveHint("Blink now");
              const lm = result.landmarks.positions;
              const leftEAR = eyeAspectRatio([lm[36], lm[37], lm[38], lm[39], lm[40], lm[41]]);
              const rightEAR = eyeAspectRatio([lm[42], lm[43], lm[44], lm[45], lm[46], lm[47]]);
              const ear = (leftEAR + rightEAR) / 2;

              // Very generous: EAR < 0.38 = eyes closing (catches even partial blinks)
              if (ear < 0.38) {
                eyeWasClosedRef.current = true;
              }
              // Eyes reopened after being closed = blink!
              if (eyeWasClosedRef.current && ear > 0.32) {
                eyeWasClosedRef.current = false;
                stageCompletedAtRef.current = now;
                setLiveHint("Blink detected!");
                setDone((d) => ({ ...d, blinked: true }));
              }

              // Fallback: if stuck for 10s, accept any slight dip
              if (delaySinceLastStage > 12000) {
                stageCompletedAtRef.current = now;
                setLiveHint("Blink detected!");
                setDone((d) => ({ ...d, blinked: true }));
              }
            }

          // ── 4. MATCHED — auto-capture and AUTO-SUBMIT
          } else if (!cur.matched && !capturedRef.current) {
            capturedRef.current = true;
            setLiveHint("Capturing...");
            setTimeout(() => {
              setDone((d) => ({ ...d, matched: true }));
              capturePhoto();
            }, 300);
          }
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      if (running) rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [cameraOn, modelsReady, selfiePreview]);

  // Handle automatic submission after selfie is set
  useEffect(() => {
    if (selfieFile && !submitting && !submitted) {
      handleSubmit();
    }
  }, [selfieFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Capture ───────────────────────────────────────────────────
  function capturePhoto() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelfiePreview(dataUrl);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `facescan-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelfieFile(file);
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  // ── ID file handling ───────────────────────────────────────────
  function handleIdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setIdValidError("File is too large. Maximum size is 10 MB.");
      return;
    }
    setIdValidError(null);
    setIdFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setIdPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleRetake() {
    setSelfieFile(null);
    setSelfiePreview(null);
    setSubmitting(false);
    setSubmitError(null);
    capturedRef.current = false;
    eyeWasClosedRef.current = false;
    stageCompletedAtRef.current = 0;
    centeredHeldRef.current = null;
    smileHeldRef.current = null;
    setDone({ centered: false, smiled: false, blinked: false, matched: false });
    startCamera();
  }

  // ── Validate ID type on server ─────────────────────────────────
  async function handleValidateAndContinue() {
    if (!idType) { setFormError("Please select an ID type."); return; }
    if (!idFile) { setFormError("Please upload a photo of your ID."); return; }
    setFormError(null);
    setIdValidating(true);

    try {
      const fd = new FormData();
      fd.append("id_type", idType);
      fd.append("image", idFile);
      const res = await fetch("/api/validate-id", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data?.valid === false) {
        setIdValidError(
          data?.reason ??
          "The uploaded image does not match the selected ID type."
        );
        setIdValidating(false);
        return;
      }
    } catch {
      // fail open
    }

    setIdValidError(null);
    setIdValidating(false);
    setStep(3);
  }

  async function handleSubmit() {
    if (!idType || !idFile || !selfieFile) return;
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData();
    fd.append("valid_id_type", idType);
    fd.append("valid_id", idFile);
    fd.append("selfie", selfieFile);

    try {
      const res = await fetch("/api/verification", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────
  if (loadingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Show existing verification status ──────────────────────────
  if (existingStatus === "pending" || existingStatus === "approved" || existingStatus === "rejected") {
    const statusConfig = {
      pending: {
        icon: Clock,
        title: "Verification Under Review",
        desc: "Your verification request has been submitted and is being reviewed by the admin team.",
        color: "from-amber-500 to-orange-600",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        badge: "Pending",
        badgeBg: "bg-amber-100 text-amber-700",
      },
      approved: {
        icon: CheckCircle2,
        title: "Account Verified",
        desc: "Your account has been verified. You now have full access to all BarangayPGT features.",
        color: "from-emerald-500 to-green-600",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        badge: "Verified",
        badgeBg: "bg-emerald-100 text-emerald-700",
      },
      rejected: {
        icon: AlertTriangle,
        title: "Verification Rejected",
        desc: "Your verification request was rejected. You may submit a new request.",
        color: "from-red-500 to-rose-600",
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        badge: "Rejected",
        badgeBg: "bg-red-100 text-red-700",
      },
    }[existingStatus];

    const StatusIcon = statusConfig.icon;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">
          {/* Back button */}
          <div className={`bg-gradient-to-br ${statusConfig.color} px-4 pt-4`}>
            <button onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          <div className={`bg-gradient-to-br ${statusConfig.color} px-8 pb-10 pt-4 text-center text-white`}>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <StatusIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black">{statusConfig.title}</h1>
            <span className={`mt-3 inline-block rounded-full px-4 py-1 text-xs font-black ${statusConfig.badgeBg}`}>
              {statusConfig.badge}
            </span>
          </div>
          <div className="px-8 py-8">
            <p className="text-sm text-slate-500 text-center mb-6">{statusConfig.desc}</p>

            {existingStatus === "pending" && (
              <div className="mb-6 space-y-4">
                {[
                  { label: "Application Received", desc: "Your ID and scan were uploaded.", done: true, active: false },
                  { label: "Under Review", desc: "Admin team is reviewing your documents.", done: false, active: true },
                  { label: "Verified", desc: "You will receive an SMS once approved.", done: false, active: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${s.done ? "bg-emerald-500 text-white" : s.active ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                      {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${s.done ? "text-emerald-700" : s.active ? "text-amber-700" : "text-slate-400"}`}>{s.label}</p>
                      <p className="text-xs text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {existingStatus === "rejected" && (
              <button
                onClick={() => { setExistingStatus(null); setStep(1); }}
                className="mb-4 w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700">
                Submit New Request
              </button>
            )}

            <button onClick={() => router.push("/feed")}
              className="w-full rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Just submitted ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-4">
            <button onClick={() => router.push("/feed")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pb-10 pt-4 text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black">Application Submitted!</h1>
            <p className="mt-2 text-sm text-blue-100">Your verification is under review</p>
          </div>
          <div className="px-8 py-8">
            <div className="mb-8 space-y-4">
              {[
                { label: "Application Received", desc: "Your ID and scan were uploaded successfully.", done: true, active: false },
                { label: "Under Review", desc: "Our admin team will review your documents.", done: false, active: true },
                { label: "Verified", desc: "You will receive an SMS once approved.", done: false, active: false },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${s.done ? "bg-emerald-500 text-white" : s.active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${s.done ? "text-emerald-700" : s.active ? "text-blue-700" : "text-slate-400"}`}>{s.label}</p>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push("/feed")}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700">
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">

        {/* Header with back button */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-4 text-white flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-black">Verify Your Account</h1>
        </div>

        <div className="px-6 py-6">

          {/* Intro */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 mx-auto">
                <ShieldCheck className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Official Verification</h2>
                <p className="mt-2 text-sm text-slate-500">Secure your account and gain full access to community features.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 text-left">
                <p className="text-xs font-semibold text-blue-700">
                  <CheckCircle2 className="inline-block h-4 w-4 mr-2" /> Valid ID Required
                </p>
                <p className="mt-2 text-xs font-semibold text-blue-700">
                  <CheckCircle2 className="inline-block h-4 w-4 mr-2" /> Face Scan Required
                </p>
              </div>
              <button onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg hover:bg-blue-700">
                Start Now
              </button>
            </div>
          )}

          {/* Upload ID */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">1. Upload ID</h2>
                <p className="mt-1 text-sm text-slate-500">Place your ID on a flat surface.</p>
              </div>

              <select
                value={idType}
                onChange={(e) => { setIdType(e.target.value); setIdValidError(null); }}
                className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20">
                <option value="">Select ID type...</option>
                {VALID_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <div className="space-y-2">
                <input ref={idInputRef} type="file" accept="image/*" onChange={handleIdFileChange} className="hidden" />
                {idPreview ? (
                  <div className="relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    <img src={idPreview} alt="ID" className="w-full max-h-48 object-cover" />
                    <button onClick={() => { setIdFile(null); setIdPreview(null); if (idInputRef.current) idInputRef.current.value = ""; }}
                      className="absolute right-2 top-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-bold text-white">Change</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => idInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-slate-400">
                    <Upload className="h-6 w-6" />
                    <p className="text-sm font-bold">Scan ID</p>
                  </button>
                )}
              </div>

              {idValidError && <p className="text-xs font-bold text-red-500">{idValidError}</p>}
              {formError && <p className="text-xs font-bold text-red-500">{formError}</p>}

              <button
                onClick={handleValidateAndContinue}
                disabled={idValidating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white disabled:opacity-60">
                {idValidating ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Continue"}
              </button>
            </div>
          )}

          {/* Face Scan */}
          {step === 3 && (
            <div className="space-y-3">

              {/* Camera with oval overlay */}
              <div className="relative overflow-hidden rounded-[32px] bg-slate-900" style={{ aspectRatio: "3/4" }}>
                <video ref={videoRef} autoPlay playsInline muted
                  className="h-full w-full object-cover"
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }} />

                {/* SVG Mask + Progress ring */}
                <div className="absolute inset-0 z-10">
                  <svg
                    viewBox={`0 0 ${VW} ${VH}`}
                    className="h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Cut-out mask */}
                    <mask id="oval-mask">
                      <rect x="0" y="0" width={VW} height={VH} fill="white" />
                      <ellipse cx={OCX} cy={OCY} rx={ORX} ry={ORY} fill="black" />
                    </mask>
                    <rect x="0" y="0" width={VW} height={VH} fill="rgba(0,0,0,0.55)" mask="url(#oval-mask)" />

                    {/* Oval border background (dim white) */}
                    <ellipse
                      cx={OCX} cy={OCY} rx={ORX} ry={ORY}
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="3"
                    />

                    {/* Green progress — fills around the oval */}
                    {progress > 0 && (
                      <path
                        d={`M ${OCX},${OCY - ORY} A ${ORX},${ORY} 0 1,1 ${OCX - 0.01},${OCY - ORY}`}
                        fill="none"
                        stroke={progress >= 100 ? "#10b981" : "#22c55e"}
                        strokeWidth="3"
                        pathLength={100}
                        strokeDasharray={100}
                        strokeDashoffset={100 - progress}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease",
                          filter: `drop-shadow(0 0 ${4 + (progress / 100) * 8}px #22c55e)`,
                        }}
                      />
                    )}

                    {/* "Scanning..." label above the oval */}
                    <text
                      x={OCX} y={OCY - ORY - 6}
                      textAnchor="middle"
                      fill="white"
                      fontSize="4.5"
                      fontWeight="bold"
                      opacity="0.8"
                    >
                      {cameraOn && modelsReady ? "SCANNING..." : ""}
                    </text>

                    {/* Live hint caption below the oval */}
                    <text
                      x={OCX} y={OCY + ORY + 10}
                      textAnchor="middle"
                      fill={progress >= 90 ? "#4ade80" : "#93c5fd"}
                      fontSize="5"
                      fontWeight="bold"
                    >
                      {liveHint}
                    </text>
                  </svg>
                </div>

                {/* Initializing */}
                {(!cameraOn || !modelsReady) && !camError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                    <p className="text-sm font-bold">Starting camera...</p>
                  </div>
                )}

                {/* Submitting overlay */}
                {submitting && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white gap-3 text-center px-6">
                    <div className="h-16 w-16 items-center justify-center rounded-full bg-blue-600 flex shadow-2xl">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                    <p className="text-lg font-black">Submitting...</p>
                    <p className="text-sm text-blue-100">Please do not close this window</p>
                  </div>
                )}

                {/* Error overlay */}
                {submitError && (
                  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-600/90 px-8 text-center text-white gap-4">
                    <AlertTriangle className="h-12 w-12" />
                    <p className="text-sm font-bold leading-relaxed">{submitError}</p>
                    <button onClick={handleRetake} className="rounded-full bg-white px-6 py-2 text-sm font-black text-red-600">
                      Try Again
                    </button>
                  </div>
                )}

                {/* Camera error */}
                {camError && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900 px-6 text-center gap-4">
                    <VideoOff className="h-10 w-10 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-300">{camError}</p>
                    <button onClick={startCamera}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* Live Step + Progress below camera */}
              <div className="text-center space-y-1">
                <p className="text-[13px] font-black text-slate-800">
                  {currentStage
                    ? `Step ${STAGES.indexOf(currentStage) + 1} of ${STAGES.length}: ${currentStage.label}`
                    : "Verification Complete!"}
                </p>
                <div className="mx-auto h-1.5 w-full max-w-[200px] rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
