import { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, Shield, Camera, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UI } from "@/ui/colors";
import usersApi from "@/api/usersApi";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || "");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security State
  const [secCurrentPassword, setSecCurrentPassword] = useState("");
  const [secNewPassword, setSecNewPassword] = useState("");
  const [secConfirmPassword, setSecConfirmPassword] = useState("");

  const [secError, setSecError] = useState("");
  const [secSuccess, setSecSuccess] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setProfilePicture(user.profile_picture || "");
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please upload a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Image must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePicture(base64String);
      setProfileError("");
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const isChangingSensitiveInfo = (name !== user?.name) || (email !== user?.email);

    if (isChangingSensitiveInfo && !profileCurrentPassword) {
      setProfileError("Current password is required to change name or email.");
      return;
    }

    try {
      setIsSavingProfile(true);

      const payload: any = {};
      if (name !== user?.name) payload.name = name;
      if (email !== user?.email) payload.email = email;
      if (profilePicture !== user?.profile_picture) payload.profile_picture = profilePicture;

      if (Object.keys(payload).length === 0) {
        setProfileSuccess("No changes to save.");
        setIsSavingProfile(false);
        return;
      }

      if (isChangingSensitiveInfo) {
        payload.current_password = profileCurrentPassword;
      }

      await usersApi.updateMe(payload);
      await refreshUser();

      setProfileSuccess("Profile updated successfully!");
      setProfileCurrentPassword("");
      setTimeout(() => setProfileSuccess(""), 5000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (err.message || "Failed to update profile."));
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError("");
    setSecSuccess("");

    if (secNewPassword !== secConfirmPassword) {
      setSecError("New passwords do not match.");
      return;
    }

    if (secNewPassword.length < 6) {
      setSecError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSavingSecurity(true);
      await usersApi.updatePassword({
        current_password: secCurrentPassword,
        new_password: secNewPassword
      });

      setSecSuccess("Password updated successfully!");
      setSecCurrentPassword("");
      setSecNewPassword("");
      setSecConfirmPassword("");
      setTimeout(() => setSecSuccess(""), 5000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (err.message || "Failed to update password."));
      setSecError(msg);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const initials = user?.name 
    ? user.name.split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().substring(0, 2) 
    : "U";

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: UI.colors.text.primary }}>
          Account Settings
        </h1>
        <p className="text-base font-medium" style={{ color: UI.colors.text.secondary }}>
          Manage your profile information and account security
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Profile Section */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profile Information</h2>
          </div>
          
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-8">
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">{initials}</span>
                  )}
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 flex flex-wrap gap-3 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Upload Photo
                </button>
                {profilePicture !== user?.profile_picture && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePicture(user?.profile_picture || "");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            </div>

            {/* Error/Success */}
            {(profileError || profileSuccess) && (
              <div className={cn(
                "p-3 rounded-lg border flex items-center gap-3 text-sm font-medium",
                profileError ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
              )}>
                {profileError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <p>{profileError || profileSuccess}</p>
              </div>
            )}

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Verification */}
            {((name !== user?.name) || (email !== user?.email)) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                <div className="flex items-center gap-3 text-amber-800">
                  <Lock size={18} />
                  <p className="text-xs font-semibold">Confirm password to update name or email</p>
                </div>
                <input
                  type="password"
                  value={profileCurrentPassword}
                  onChange={(e) => setProfileCurrentPassword(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Enter current password"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-8 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-100 active:scale-95"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Security Section */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
             <Shield className="text-indigo-600" size={18} />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Security & Password</h2>
          </div>
          
          <form onSubmit={handleSecuritySubmit} className="p-6 space-y-8">
            {/* Error/Success */}
            {(secError || secSuccess) && (
              <div className={cn(
                "p-3 rounded-lg border flex items-center gap-3 text-sm font-medium",
                secError ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
              )}>
                {secError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <p>{secError || secSuccess}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={secCurrentPassword}
                    onChange={(e) => setSecCurrentPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={secNewPassword}
                    onChange={(e) => setSecNewPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Min. 6 chars"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={secConfirmPassword}
                    onChange={(e) => setSecConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-50 dark:border-slate-800">
               <button
                type="submit"
                disabled={isSavingSecurity}
                className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
              >
                {isSavingSecurity ? <Loader2 className="animate-spin" size={18} /> : "Update Password"}
              </button>
            </div>
          </form>
        </section>

      </div>
    </div>
  );
}
