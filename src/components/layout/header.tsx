"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, User, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";

interface UserProfile {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT" | "USER";
}

export function Header() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-900/50 text-purple-300 border border-purple-700/50">ADMIN</span>;
      case "ACCOUNTANT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-900/50 text-blue-300 border border-blue-700/50">ACCOUNTANT</span>;
      case "USER":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">USER</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className="h-16 bg-slate-950/80 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md select-none print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Open Mobile Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-4">
          {/* User Profile & Role Info */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    @{user.loginId}
                  </span>
                </div>
              </div>

              {getRoleBadge(user.role)}

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/auth/login"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Log In
              </a>
            </div>
          )}
        </div>
      </header>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
