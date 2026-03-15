"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Calendar, 
  Upload, 
  Building2, 
  ChevronRight,
  UserCircle
} from "lucide-react";
import DatePicker from "@/app/components/DatePicker";

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const age = useMemo(() => {
    if (!birthDate) return "";
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return "";
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      years--;
    }
    return years.toString();
  }, [birthDate]);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [purokAddress, setPurokAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let token = window.localStorage.getItem("device_token");
      if (!token) {
        token = self.crypto.randomUUID();
        window.localStorage.setItem("device_token", token);
      }
      setDeviceToken(token);
    }
  }, []);

  // Polling for verification status
  useEffect(() => {
    if (!registered || !email) return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/auth/register/status?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        
        if (data.verified) {
          clearInterval(intervalId);
          // Small delay for better UX
          setTimeout(() => {
            router.push("/approval-pending?verified=true");
          }, 1500);
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 3000); // Check every 3 seconds

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [registered, email, router]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Za-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, [password]);

  const isPasswordSecure = useMemo(() => {
    return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  }, [password]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setFileName(file.name);
    } else {
      setImageFile(null);
      setFileName("No file chosen");
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!isPasswordSecure) {
      setError("Password must be at least 8 characters and contain both letters and numbers.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    if (!imageFile) {
      setError("Please upload a valid ID.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("phone", phone);
    formData.append("purok_address", purokAddress);
    formData.append("sex", sex);
    formData.append("birth_date", birthDate || "");
    formData.append("age", age || "");
    formData.append("valid_id", imageFile);
    if (deviceToken) {
      formData.append("device_token", deviceToken);
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Registration failed.");
      setSubmitting(false);
      return;
    }

    setRegistered(true);
    setSubmitting(false);
  }

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white p-1 shadow-[0_25px_70px_rgba(37,99,235,0.1)]">
          <div className="bg-white px-8 pb-12 pt-12 text-center sm:px-12">
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 scale-110 animate-pulse rounded-[32px] bg-blue-600/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
                <Mail className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">Check your Gmail</h1>
            <p className="mb-8 text-sm font-medium leading-relaxed text-slate-500">
              We&apos;ve sent a verification link to <strong className="text-slate-900">{email}</strong>. 
              Please click the link in your email to verify your account and proceed with registration.
            </p>
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  setResending(true);
                  setResendMsg(null);
                  try {
                    const res = await fetch("/api/auth/register/resend", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setResendMsg("Verification email resent successfully!");
                    } else {
                      setResendMsg(data?.error ?? "Failed to resend email.");
                    }
                  } catch {
                    setResendMsg("Failed to resend email. Please try again.");
                  }
                  setResending(false);
                }}
                disabled={resending}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
              >
                {resending ? "Resending..." : "Resend Verification Email"}
              </button>
              {resendMsg && (
                <p className={`text-sm font-medium ${resendMsg.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
                  {resendMsg}
                </p>
              )}
              <button 
                onClick={() => router.push("/")}
                className="text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4 py-12">
      <div className="w-full max-w-2xl overflow-hidden rounded-[40px] bg-white shadow-[0_25px_70px_rgba(37,99,235,0.1)]">
        <div className="bg-white px-6 pt-12 pb-10 sm:px-12">
          <div className="mb-10 text-center">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 scale-110 rounded-3xl bg-blue-600/10 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Register as Resident
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-base font-medium text-slate-500">
              Create your account to participate in your barangay community
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200"
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <UserCircle className="h-3.5 w-3.5 text-blue-600" />
                  Sex
                </label>
                <select
                  required
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Select sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  Birth Date
                </label>
                <DatePicker
                  value={birthDate}
                  onChange={(val) => setBirthDate(val)}
                  placeholder="Select your birth date"
                  required
                  minYear={1920}
                  maxYear={new Date().getFullYear()}
                />
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Age
                </label>
                <input
                  type="text"
                  value={age}
                  readOnly
                  placeholder="Calculated from birth date"
                  className="block w-full rounded-2xl border-0 bg-slate-100 px-4 py-4 text-sm text-slate-500 ring-1 ring-slate-200 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={11}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200"
                  placeholder="09171234567"
                />
                <p className="px-1 text-[10px] font-medium text-slate-400">Must be exactly 11 digits (e.g., 09171234567)</p>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200"
                  placeholder="Min 8 chars, mix of A-Z & 0-9"
                />
                {/* Professional Strength Indicator */}
                {password.length > 0 && (
                  <div className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 ${
                    passwordStrength <= 1 ? "bg-red-50 ring-1 ring-red-100" : passwordStrength <= 2 ? "bg-amber-50 ring-1 ring-amber-100" : passwordStrength === 3 ? "bg-blue-50 ring-1 ring-blue-100" : "bg-emerald-50 ring-1 ring-emerald-100"
                  }`}>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      passwordStrength <= 1 ? "bg-red-500" : passwordStrength <= 2 ? "bg-amber-500" : passwordStrength === 3 ? "bg-blue-500" : "bg-emerald-500"
                    }`}>
                      {passwordStrength >= 3 ? (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01" /></svg>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold ${
                      passwordStrength <= 1 ? "text-red-600" : passwordStrength <= 2 ? "text-amber-600" : passwordStrength === 3 ? "text-blue-600" : "text-emerald-600"
                    }`}>
                      {passwordStrength <= 1 ? "Weak — Add numbers & special characters" : passwordStrength <= 2 ? "Fair — Add special characters for better security" : passwordStrength === 3 ? "Good — Almost there!" : "Strong — Excellent password!"}
                    </span>
                  </div>
                )}
                {!isPasswordSecure && password.length > 0 && passwordStrength <= 1 && (
                   <p className="mt-1 px-1 text-[10px] font-medium text-slate-400">Min 8 characters with letters & numbers</p>
                )}
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ${
                    confirmPassword && confirmPassword !== password ? "ring-red-500" : "ring-slate-200"
                  }`}
                  placeholder="Confirm your password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 px-1 text-[10px] font-bold text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="mt-1 px-1 text-[10px] font-bold text-emerald-500">Passwords match</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Purok Address
              </label>
              <input
                type="text"
                required
                value={purokAddress}
                onChange={(e) => setPurokAddress(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ring-1 ring-slate-200"
                placeholder="e.g., Purok 5"
              />
            </div>

            <div className="rounded-3xl bg-blue-50/50 p-6 ring-1 ring-blue-100">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assigned Barangay
                  </label>
                  <p className="text-lg font-bold text-slate-900">Brgy. Pagatpatan</p>
                  <p className="text-xs font-medium text-slate-500">
                    Registration is currently limited to residents of Barangay Pagatpatan.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                Upload Valid ID
              </label>
              <div className="group relative flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-all hover:border-blue-300 hover:bg-blue-50/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 transition-transform group-hover:scale-105">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-700">{imageFile ? fileName : "Choose a file"}</p>
                  <p className="text-[11px] font-medium text-slate-400">Valid ID (Driver's License, Passport, National ID)</p>
                </div>
                <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm group-hover:bg-blue-700">
                  Browse
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isPasswordSecure || password !== confirmPassword || phone.length !== 11}
              className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-[24px] bg-blue-600 px-8 py-5 text-base font-bold text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 mr-2">
                {submitting ? "Creating account…" : "Create Account"}
              </span>
              <ChevronRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-center ring-1 ring-red-100">
                <p className="text-sm font-semibold text-red-600" role="alert">
                  {error}
                </p>
              </div>
            )}

            <p className="text-center text-sm font-medium text-slate-600">
              Already have an account?{" "}
              <a href="/" className="font-bold text-blue-600 transition-colors hover:text-blue-700 underline-offset-4 hover:underline">
                Sign in here
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}


