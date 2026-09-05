"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, CreditCard, User, ArrowRight } from "lucide-react";

interface UserProfile {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: string;
  contactId?: string | null;
}

export default function PortalPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Customer Portal
        </h1>
        <p className="text-slate-400 text-sm">
          Welcome back, {user?.name || "Customer"}. View your invoices, payment receipts, and account balance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/portal/invoices"
          className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <FileText className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            My Invoices
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            View commercial invoices, payment status, and download corporate PDFs.
          </p>
        </Link>

        <Link
          href="/portal/payments"
          className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CreditCard className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            My Payments
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Track bank and cash transaction history and verified receipts.
          </p>
        </Link>

        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <User className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-100">
            Account Profile
          </h2>
          <div className="mt-2 space-y-1.5 text-xs text-slate-400">
            <p><span className="font-semibold text-slate-300">Account:</span> {user?.name}</p>
            <p><span className="font-semibold text-slate-300">Login ID:</span> @{user?.loginId}</p>
            <p><span className="font-semibold text-slate-300">Email:</span> {user?.email}</p>
            <p><span className="font-semibold text-slate-300">Portal Role:</span> {user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
