"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({
    loginId: "",
    email: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.fieldErrors) {
        setFieldErrors(data.fieldErrors);
        setError(data.error || "Validation failed");
        setLoading(false);
        return;
      }

      // Always show success message to not reveal account existence
      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Password Reset</h2>
          <p className="text-sm text-slate-400 mb-6">
            If an account with that Login ID and email exists, the password has been updated.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  const FieldError = ({ field }: { field: string }) => {
    const errors = fieldErrors[field];
    if (!errors?.length) return null;
    return <p className="text-xs text-red-400 mt-1">{errors[0]}</p>;
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Reset Password
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Enter your Login ID and email to reset your password
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

          <div>
            <label htmlFor="loginId" className="block text-sm font-medium text-slate-300 mb-1.5">
              Login ID
            </label>
            <input
              id="loginId"
              type="text"
              value={form.loginId}
              onChange={(e) => updateField("loginId", e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="loginId" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
              Email ID
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="email" />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(e) => updateField("newPassword", e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="newPassword" />
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={form.confirmNewPassword}
              onChange={(e) => updateField("confirmNewPassword", e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <FieldError field="confirmNewPassword" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-semibold text-sm hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Reset Password
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/auth/login"
            className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            ← Back to Sign In
          </Link>
        </div>

        {/* Demo limitation notice */}
        <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-500">
          <strong className="text-slate-400">Demo Note:</strong> In this hackathon
          environment, password reset is performed directly (no email verification).
          In production, a secure email-based reset flow would be implemented.
        </div>
      </div>
    </div>
  );
}
