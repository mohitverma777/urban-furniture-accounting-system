"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, CreditCard, User, ShoppingBag, ArrowRight } from "lucide-react";

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
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Customer Portal
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Welcome back, {user?.name || "Customer"}. View your invoices, payments, and account details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/portal/invoices"
          className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FileText className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            My Invoices
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View past and outstanding customer invoices.
          </p>
        </Link>

        <Link
          href="/portal/payments"
          className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            My Payments
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track payment history and transaction records.
          </p>
        </Link>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <User className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
            Account Profile
          </h2>
          <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <p><span className="font-medium text-slate-700 dark:text-slate-300">Login ID:</span> {user?.loginId}</p>
            <p><span className="font-medium text-slate-700 dark:text-slate-300">Email:</span> {user?.email}</p>
            <p><span className="font-medium text-slate-700 dark:text-slate-300">Role:</span> {user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
