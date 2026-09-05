"use client";

import React, { useState } from "react";
import { Menu, User, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import type { UserRole } from "@/lib/types";

const ROLES: { role: UserRole; name: string }[] = [
  { role: "admin", name: "Admin" },
  { role: "accountant", name: "Priya (Accountant)" },
  { role: "sales_manager", name: "Rahul (Sales)" },
  { role: "purchase_manager", name: "Anita (Purchase)" },
  { role: "viewer", name: "Viewer (Read Only)" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>("admin");

  return (
    <>
      <header className="h-16 bg-slate-950/80 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md select-none">
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
          {/* Demo Persona Role Switcher */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="text-slate-400 pl-2 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Persona:</span>
            </span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="bg-slate-800 text-slate-200 border-0 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-amber-400 font-medium outline-none cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-200">
              {ROLES.find((r) => r.role === activeRole)?.name.split(" ")[0]}
            </span>
          </div>
        </div>
      </header>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
