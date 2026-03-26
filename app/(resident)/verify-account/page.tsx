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
  { value: "national_id",       label: "Philippine National ID (PhilSys)" },
  { value: "passport",          label: "Passport" },
  { value: "drivers_license",   label: "Driver's License" },
  { value: "voters_id",         label: "Voter's ID" },
  { value: "school_id",         label: "School ID" },
  { value: "senior_citizen_id", label: "Senior Citizen ID" },
  { value: "pwd_id",            label: "PWD ID" },
  { value: "postal_id",         label: "Postal ID" },
  { value: "sss_id",            label: "SSS ID" },
  { value: "philhealth_id",     label: "PhilHealth ID" },
];

const STEPS = [
  { id: 1, label: "Introduction", icon: ShieldCheck },
  { id: 2, label: "Upload ID",    icon: FileText },
  { id: 3, label: "Face Scan",    icon: Camera },
];

// Liveness stages (no emojis — professional barangay system)
const STAGES = [
  { key: "centered", label: "Center your face inside the oval", weight: 30 },
  { key: "smiled",   label: "Smile naturally",                  weight: 30 },
  { key: "blinked",  label: "Blink once",                       weight: 30 },
  { key: "matched",  label: "Verifying identity...",            weight: 10 },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

// ── Eye Aspect Ratio ───────────────────────────────────────────
function eyeAspectRatio(pts: { x: number; y: number }[]): number {
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  return (d(pts[1], pts[5]) + d(pts[2], pts[4])) / (2 * d(pts[0], pts[3]) + 1e-6);
}

// ── SVG oval constants — viewBox is 1:1 with the 3/4 aspect card ──
// We use a normalised 100×133 viewBox so the oval always sits
// precisely in the centre regardless of screen size.
const VW = 100, VH = 133;
const ORX = 30, ORY = 42;  // rx / ry of the oval (% of viewbox)
const OCX = VW / 2, OCY = VH * 0.46; // centre — slightly above mid
const OVAL_CIRC = Math.round(2 * Math.PI * Math.sqrt((ORX ** 2 + ORY ** 2) / 2));

export default function VerifyAccountPage() {
  const router = useRouter();

  // flow
  const [step, setStep]           = useState(1);
  const [idType, setIdType]       = useState("");
  const [idFile, setIdFile]       = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idValidating, setIdValidating] = useState(false);
  const [idValidError, setIdValidError] = useState<string | null>(null);
  const [selfieFile, setSelfieFile]     = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formError, setFormError]     = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  // camera / liveness
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const faceApiRef = useRef<any>(null); // cached import
  const [cameraOn, setCameraOn]       = useState(false);
  const [camError, setCamError]       = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode]   = useState<"user" | "environment">("user");

  // liveness
  const [done, setDone] = useState<Record<StageKey, boolean>>({
    centered: false, smiled: false, blinked: false, matched: false,
  });
  const doneRef   = useRef(done);
  doneRef.current = done;

  const centeredHeldRef = useRef<number | null>(null);
  const smileHeldRef    = useRef<number | null>(null);
  const eyeWasClosedRef = useRef(false);
  const capturedRef     = useRef(false);

  // derived
  const progress = STAGES.reduce((acc, s) => acc + (done[s.key] ? s.weight : 0), 0);
  const currentStage = STAGES.find((s) => !done[s.key]);
  const instruction  = currentStage?.label ?? "Scan complete!";

  // Arc colour: orange → green (never blue so the ring stays clean)
  const arcColor = progress >= 100 ? "#10b981" : progress >= 60 ? "#22c55e" : "#3b82f6";

  // ── SVG arc offset ─────────────────────────────────────────────
  // Dash fill: starts at top (−90 deg), fills clockwise
  const arcDash   = OVAL_CIRC;
  const arcOffset = OVAL_CIRC - (progress / 100) * OVAL_CIRC;

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
        NotFoundError:   "No camera found on this device.",
      };
      setCamError(map[err.name] ?? "Could not start camera. Try again.");
    }
  }, [facingMode]);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    if (step === 3 && !selfiePreview) startCamera();
    return () => { if (step !== 3) stopCamera(); };
  }, [step]);

  useEffect(() => {
    if (cameraOn) { stopCamera(); startCamera(); }
  }, [facingMode]);

  // ── Detection loop (faceapi cached, no repeated dynamic imports) ──
  useEffect(() => {
    if (!cameraOn || !modelsReady || selfiePreview || capturedRef.current) return;

    let running = true;
    const faceapi = faceApiRef.current;
    if (!faceapi) return;

    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });

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

          // ── 1. CENTERED ── wider bounds, 1500ms hold
          if (!cur.centered) {
            const inBounds =
              cx > vw * 0.20 && cx < vw * 0.80 &&
              cy > vh * 0.15 && cy < vh * 0.85 &&
              facePct > 0.04 && facePct < 0.65;

            if (inBounds) {
              if (!centeredHeldRef.current) centeredHeldRef.current = Date.now();
              if (Date.now() - centeredHeldRef.current > 1500) {
                setDone((d) => ({ ...d, centered: true }));
              }
            } else {
              centeredHeldRef.current = null;
            }

          // ── 2. SMILE ── 0.5 threshold, 600ms hold
          } else if (!cur.smiled) {
            const happy = result.expressions.happy ?? 0;
            if (happy > 0.50) {
              if (!smileHeldRef.current) smileHeldRef.current = Date.now();
              if (Date.now() - smileHeldRef.current > 600) {
                setDone((d) => ({ ...d, smiled: true }));
              }
            } else {
              smileHeldRef.current = null;
            }

          // ── 3. BLINK ── EAR with relaxed thresholds & debounce
          } else if (!cur.blinked) {
            const lm = result.landmarks.positions;
            const leftEAR  = eyeAspectRatio([lm[36], lm[37], lm[38], lm[39], lm[40], lm[41]]);
            const rightEAR = eyeAspectRatio([lm[42], lm[43], lm[44], lm[45], lm[46], lm[47]]);
            const ear = (leftEAR + rightEAR) / 2;

            // Closed threshold raised to 0.25 so blink is easier to detect
            if (ear < 0.25) {
              eyeWasClosedRef.current = true;
            } else if (eyeWasClosedRef.current && ear > 0.30) {
              // Eyes opened back from closed → blink confirmed
              eyeWasClosedRef.current = false;
              setDone((d) => ({ ...d, blinked: true }));
            }

          // ── 4. MATCHED — auto-capture
          } else if (!cur.matched && !capturedRef.current) {
            capturedRef.current = true;
            setTimeout(() => {
              setDone((d) => ({ ...d, matched: true }));
              capturePhoto();
            }, 500);
          }
        }
      } catch {
        // silently ignore frame errors
      }

      if (running) rafRef.current = requestAnimationFrame(detect);
    }

    rafRef.current = requestAnimationFrame(detect);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [cameraOn, modelsReady, selfiePreview]);

  // ── Capture ────────────────────────────────────────────────────
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
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `facescan-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelfieFile(file);
      setSelfiePreview(canvas.toDataURL("image/jpeg", 0.9));
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  // ── ID file handling + client-side size check ──────────────────
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
    capturedRef.current     = false;
    eyeWasClosedRef.current = false;
    centeredHeldRef.current = null;
    smileHeldRef.current    = null;
    setDone({ centered: false, smiled: false, blinked: false, matched: false });
    startCamera();
  }

  // ── Validate ID type on server before moving to face scan ──────
  async function handleValidateAndContinue() {
    if (!idType) { setFormError("Please select an ID type."); return; }
    if (!idFile) { setFormError("Please upload a photo of your ID."); return; }
    setFormError(null);
    setIdValidating(true);

    try {
      const fd = new FormData();
      fd.append("id_type", idType);
      fd.append("image", idFile);
      const res  = await fetch("/api/validate-id", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data?.valid === false) {
        setIdValidError(
          data?.reason ??
          "The uploaded image does not match the selected ID type. Please upload the correct document."
        );
        setIdValidating(false);
        return;
      }
    } catch {
      // If validation API is unavailable we allow through (fail-open)
    }

    setIdValidError(null);
    setIdValidating(false);
    setStep(3);
  }

  async function handleSubmit() {
    if (!idType || !idFile || !selfieFile) {
      setSubmitError("Please complete all steps.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData();
    fd.append("valid_id_type", idType);
    fd.append("valid_id", idFile);
    fd.append("selfie", selfieFile);
    const res  = await fetch("/api/verification", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setSubmitError(data?.error ?? "Submission failed. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  // ── Success screen ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black">Application Submitted!</h1>
            <p className="mt-2 text-sm text-blue-100">Your verification is under review</p>
          </div>
          <div className="px-8 py-8">
            <div className="mb-8 space-y-4">
              {[
                { label: "Application Received", desc: "Your ID and face scan were uploaded successfully.", done: true, active: false },
                { label: "Under Review",         desc: "Our admin team will review your documents.",       done: false, active: true },
                { label: "Verified",             desc: "You will receive an SMS once approved.",           done: false, active: false },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    s.done ? "bg-emerald-500 text-white" : s.active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
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
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700">
                  Review typically takes 1–3 business days. You will receive an SMS on your registered number when approved.
                </p>
              </div>
            </div>
            <button onClick={() => router.push("/feed")}
              className="mt-6 w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 active:scale-[0.98]">
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-8 text-white">
          <div className="mb-6 flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => {
                  if (step === 3) {
                    stopCamera();
                    setSelfieFile(null); setSelfiePreview(null);
                    setDone({ centered: false, smiled: false, blinked: false, matched: false });
                    capturedRef.current = false;
                  }
                  setStep(step - 1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-lg font-black">Verify Your Account</h1>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${step >= s.id ? "bg-white text-blue-700" : "bg-white/20 text-white/60"}`}>
                  {step > s.id ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : s.id}
                </div>
                <span className={`hidden text-xs font-semibold sm:inline ${step >= s.id ? "text-white" : "text-white/50"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`h-px w-6 ${step > s.id ? "bg-white" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-8">

          {/* ── Step 1: Intro ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Why verify your account?</h2>
                <p className="mt-2 text-sm text-slate-500">Verified residents get full access to all BarangayPGT features.</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", title: "Post and Comment", desc: "Share updates and engage with your community." },
                  { icon: ShieldCheck,  color: "text-blue-600 bg-blue-50",       title: "Trusted Identity",  desc: "Verified by the Barangay." },
                  { icon: User,         color: "text-purple-600 bg-purple-50",   title: "Community Access",  desc: "Participate in all barangay activities." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                <p className="text-xs font-semibold text-blue-700">
                  You will need: A valid government-issued ID + a live face scan (smile and blink required).
                </p>
              </div>
              <button onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg hover:bg-blue-700 active:scale-[0.98]">
                Get Started <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => router.push("/feed")} className="w-full text-center text-sm font-semibold text-slate-400 hover:text-slate-600">
                Maybe Later
              </button>
            </div>
          )}

          {/* ── Step 2: Upload ID ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Upload Valid ID</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The photo must clearly show your selected ID. Random or wrong ID types will be automatically rejected.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">ID Type</label>
                <select
                  value={idType}
                  onChange={(e) => { setIdType(e.target.value); setIdValidError(null); }}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20">
                  <option value="">Select your ID type...</option>
                  {VALID_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {idType && (
                <div className="rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                  <p className="text-xs font-bold text-blue-700">
                    Upload a clear photo of your {VALID_ID_TYPES.find(t => t.value === idType)?.label}.
                    The ID type in the photo must match what you selected above.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">ID Photo</label>
                <input ref={idInputRef} type="file" accept="image/*" onChange={handleIdFileChange} className="hidden" />
                {idPreview ? (
                  <div className="relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    <img src={idPreview} alt="ID" className="w-full max-h-48 object-cover" />
                    <button
                      onClick={() => {
                        setIdFile(null); setIdPreview(null); setIdValidError(null);
                        if (idInputRef.current) idInputRef.current.value = "";
                      }}
                      className="absolute right-2 top-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-bold text-white">
                      Change
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => idInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 hover:border-blue-400 hover:bg-blue-50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Tap to upload your ID</p>
                      <p className="text-xs text-slate-400">Full ID must be visible — JPG/PNG max 10 MB</p>
                    </div>
                  </button>
                )}
              </div>

              {/* ID validation error */}
              {idValidError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-xs font-semibold text-red-600">{idValidError}</p>
                </div>
              )}

              {formError && <p className="text-sm font-semibold text-red-500">{formError}</p>}

              <button
                onClick={handleValidateAndContinue}
                disabled={idValidating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60">
                {idValidating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying ID...</>
                  : <>Continue <ChevronRight className="h-4 w-4" /></>
                }
              </button>
            </div>
          )}

          {/* ── Step 3: Face Scan ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">Live Face Scan</h2>
                <p className="mt-1 text-sm text-slate-500">Follow the on-screen instructions carefully.</p>
              </div>

              {selfiePreview ? (
                /* Captured preview */
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                    <img src={selfiePreview} alt="Face scan" className="w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-bold text-white">Liveness Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleRetake}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
                      <RotateCcw className="h-4 w-4" /> Retake
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg hover:bg-blue-700 disabled:opacity-60">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><ShieldCheck className="h-4 w-4" /> Submit</>}
                    </button>
                  </div>
                  {submitError && <p className="text-sm font-semibold text-red-500">{submitError}</p>}
                </div>
              ) : (
                /* Live camera */
                <div className="space-y-4">
                  {/* Camera box */}
                  <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "3/4" }}>
                    <video ref={videoRef} autoPlay playsInline muted
                      className="h-full w-full object-cover"
                      style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }} />

                    {/* Dark vignette that creates face-oval cutout */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse ${ORX * 2.1}% ${ORY * 2.1 * 0.75}% at 50% 46%, transparent 68%, rgba(0,0,0,0.60) 100%)`,
                      }}
                    />

                    {/* ── Clean single-arc progress ring ── */}
                    {cameraOn && !camError && (
                      <svg
                        className="pointer-events-none absolute inset-0"
                        viewBox={`0 0 ${VW} ${VH}`}
                        style={{ width: "100%", height: "100%" }}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Background track */}
                        <ellipse
                          cx={OCX} cy={OCY} rx={ORX} ry={ORY}
                          fill="none"
                          stroke="rgba(255,255,255,0.18)"
                          strokeWidth="1.2"
                        />
                        {/* Progress arc — fills clockwise from top */}
                        <ellipse
                          cx={OCX} cy={OCY} rx={ORX} ry={ORY}
                          fill="none"
                          stroke={arcColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={arcDash}
                          strokeDashoffset={arcOffset}
                          style={{
                            transform: `rotate(-90deg)`,
                            transformOrigin: `${OCX}px ${OCY}px`,
                            transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease",
                            filter: `drop-shadow(0 0 3px ${arcColor})`,
                          }}
                        />
                      </svg>
                    )}

                    {/* Loading */}
                    {(!cameraOn || !modelsReady) && !camError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                        <p className="text-sm text-slate-300">
                          {!cameraOn ? "Starting camera..." : "Loading face detection..."}
                        </p>
                      </div>
                    )}

                    {/* Camera error */}
                    {camError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
                        <VideoOff className="h-10 w-10 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-300">{camError}</p>
                        <button onClick={startCamera}
                          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                          Try Again
                        </button>
                      </div>
                    )}

                    {/* Flip button */}
                    {cameraOn && !camError && (
                      <button
                        onClick={() => setFacingMode((m) => m === "user" ? "environment" : "user")}
                        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Instruction panel */}
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    {/* Progress bar */}
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: arcColor,
                          boxShadow: `0 0 6px ${arcColor}88`,
                        }}
                      />
                    </div>

                    {/* Current instruction */}
                    <p className="mb-3 text-center text-[13px] font-bold text-slate-800">
                      {!modelsReady && cameraOn ? "Initializing detection..." : instruction}
                    </p>

                    {/* Stage steps */}
                    <div className="flex items-center justify-center gap-1">
                      {STAGES.map((s, i) => (
                        <div key={s.key} className="flex items-center gap-1">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-all duration-500 ${
                            done[s.key]
                              ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                              : s.key === currentStage?.key
                              ? "bg-blue-500 text-white animate-pulse"
                              : "bg-slate-200 text-slate-400"
                          }`}>
                            {done[s.key] ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${
                            done[s.key] ? "text-emerald-600" : s.key === currentStage?.key ? "text-blue-600" : "text-slate-300"
                          }`}>
                            {s.key === "centered" ? "Center" : s.key === "smiled" ? "Smile" : s.key === "blinked" ? "Blink" : "Check"}
                          </span>
                          {i < STAGES.length - 1 && (
                            <div className={`mx-1 h-px w-4 transition-colors duration-500 ${done[s.key] ? "bg-emerald-400" : "bg-slate-200"}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
