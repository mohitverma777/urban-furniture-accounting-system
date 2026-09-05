"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, UserPlus, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    loginId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field-specific error when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Password strength indicators
  const pwChecks = {
    length: form.password.length > 8,
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    special: /[^a-zA-Z0-9]/.test(form.password),
    match: form.password === form.confirmPassword && form.confirmPassword.length > 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role: "USER", // Public signup always creates USER
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Signup successful — redirect to portal
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const PasswordCheck = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-400" : "text-slate-500"}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  const FieldError = ({ field }: { field: string }) => {
    const errors = fieldErrors[field];
    if (!errors?.length) return null;
    return (
      <p className="text-xs text-red-400 mt-1">{errors[0]}</p>
    );
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create Account
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Sign up for your invoicing portal
        </p>
      </div>

      {/* Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Your full name"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="name" />
          </div>

          {/* Login ID */}
          <div>
            <label htmlFor="loginId" className="block text-sm font-medium text-slate-300 mb-1.5">
              Login ID
              <span className="text-slate-500 font-normal ml-1">(6-12 characters)</span>
            </label>
            <input
              id="loginId"
              type="text"
              value={form.loginId}
              onChange={(e) => updateField("loginId", e.target.value)}
              placeholder="Choose a login ID"
              required
              minLength={6}
              maxLength={12}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="loginId" />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Email ID
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="email" />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Create a strong password"
                required
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                <PasswordCheck ok={pwChecks.length} label="More than 8 chars" />
                <PasswordCheck ok={pwChecks.lowercase} label="Lowercase letter" />
                <PasswordCheck ok={pwChecks.uppercase} label="Uppercase letter" />
                <PasswordCheck ok={pwChecks.special} label="Special character" />
              </div>
            )}
            <FieldError field="password" />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
              Re-enter Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter your password"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            {form.confirmPassword.length > 0 && (
              <div className="mt-1">
                <PasswordCheck ok={pwChecks.match} label="Passwords match" />
              </div>
            )}
            <FieldError field="confirmPassword" />
          </div>

          {/* Role info */}
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Role:</span> User (Invoicing Portal).
            Contact your administrator for Accountant or Admin access.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-semibold text-sm hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                SIGN UP
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Already have an account? </span>
          <Link
            href="/auth/login"
            className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
