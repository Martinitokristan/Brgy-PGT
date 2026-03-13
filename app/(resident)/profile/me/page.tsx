"use client";

import useSWR from "swr";
import { useState, FormEvent } from "react";
import { 
  Camera, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  Calendar,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Settings
} from "lucide-react";

type Profile = {
  id: string;
  role: string;
  is_approved: boolean;
  barangay_id: number | null;
  phone: string | null;
  purok_address: string | null;
  sex: string | null;
  birth_date: string | null;
  age: number | null;
  avatar: string | null;
  cover_photo: string | null;
};

type MeResponse = {
  user: { id: string; email?: string | null };
  profile: Profile | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyProfilePage() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    "/api/profile/me",
    fetcher
  );

  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const profile = data?.profile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setAvatarFile(file);
          setAvatarPreview(reader.result as string);
        } else {
          setCoverFile(file);
          setCoverPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  function handleChange(key: keyof Profile, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, String(value));
    });
    
    if (avatarFile) formData.append("avatar", avatarFile);
    if (coverFile) formData.append("cover_photo", coverFile);

    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSaveError(body?.error ?? "Failed to save profile.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setForm({});
    void mutate();
  }

  const getStorageUrl = (path: string | null | undefined, bucket: string) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      {/* Cover Photo Selection */}
      <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-slate-200 ring-1 ring-slate-200 sm:h-64">
        <img 
          src={coverPreview || getStorageUrl(profile?.cover_photo, 'profile-covers') || "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80"} 
          className="h-full w-full object-cover"
          alt="Cover"
        />
        <label className="absolute bottom-4 right-4 cursor-pointer rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition-all hover:bg-white/30">
          <Camera className="h-5 w-5" />
          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
        </label>
      </div>

      <div className="relative -mt-16 px-6 sm:-mt-20">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative">
            <div className="h-32 w-32 overflow-hidden rounded-[32px] bg-white p-1 shadow-xl ring-1 ring-slate-100 sm:h-40 sm:w-40">
              <div className="h-full w-full overflow-hidden rounded-[28px] bg-slate-100">
                {avatarPreview || getStorageUrl(profile?.avatar, 'avatars') ? (
                  <img src={avatarPreview || getStorageUrl(profile?.avatar, 'avatars')!} className="h-full w-full object-cover" alt="Avatar" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UserIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
            </div>
            <label className="absolute bottom-2 right-2 cursor-pointer rounded-2xl bg-blue-600 p-2 text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
              <Camera className="h-5 w-5" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
            </label>
          </div>

          <div className="mb-4 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Resident Settings</h1>
            <p className="font-medium text-slate-500">Manage your profile and information</p>
          </div>

          <div className="mb-4 flex gap-2">
            {profile?.is_approved && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                Verified Resident
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 lg:grid-cols-3">
        {/* Left Column - Personal Info Form */}
        <div className="lg:col-span-2">
          <div className="rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={(form.phone !== undefined ? form.phone : profile?.phone) || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                      handleChange("phone", val);
                    }}
                    maxLength={11}
                    className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                    placeholder="09171234567"
                  />
                  <p className="px-1 text-[10px] font-medium text-slate-400">Numeric only, 11 digits (e.g., 09171234567)</p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    Purok Address
                  </label>
                  <input
                    type="text"
                    defaultValue={profile?.purok_address ?? ""}
                    onChange={(e) => handleChange("purok_address", e.target.value)}
                    className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                    placeholder="Purok 1"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                    Sex
                  </label>
                  <select
                    defaultValue={profile?.sex ?? ""}
                    onChange={(e) => handleChange("sex", e.target.value)}
                    className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="">Select Sex</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    Birth Date
                  </label>
                  <input
                    type="date"
                    defaultValue={profile?.birth_date ?? ""}
                    onChange={(e) => handleChange("birth_date", e.target.value)}
                    className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-4 text-sm text-slate-900 ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || (Object.keys(form).length === 0 && !avatarFile && !coverFile)}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Save Changes
                  </>
                )}
              </button>

              {saveError && (
                <div className="rounded-2xl bg-red-50 p-4 text-center ring-1 ring-red-100">
                  <p className="text-xs font-bold text-red-600">{saveError}</p>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column - Account Status */}
        <div className="space-y-6">
          <div className="rounded-[32px] bg-slate-900 p-8 text-white shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Account Status</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-sm font-medium text-slate-400">Resident ID</span>
                <span className="text-sm font-bold text-white">#00{profile?.barangay_id || "7"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-sm font-medium text-slate-400">Member Since</span>
                <span className="text-sm font-bold text-white">Mar 2026</span>
              </div>
              <div className="pt-2">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Your profile information is only visible to barangay administrators for verification purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

