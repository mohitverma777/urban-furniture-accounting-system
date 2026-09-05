"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  BookOpen,
  PieChart,
  BarChart3,
  Server,
  Building2,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Stock", href: "/stock", icon: Boxes },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Purchases", href: "/purchases", icon: ShoppingBag },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Accounting", href: "/accounting", icon: BookOpen },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "AI Assistant", href: "/ai", icon: Sparkles },
  { name: "System", href: "/diagnostics", icon: Server },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-slate-950 border-r border-slate-800 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md">
          <Building2 className="w-5 h-5 font-bold" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white tracking-tight leading-tight">
            Urban Furniture
          </span>
          <span className="text-[11px] font-medium text-amber-400 tracking-wide uppercase">
            Accounting SaaS
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-800 text-amber-400 font-semibold shadow-sm border border-slate-700/50"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">
              Double-Entry Ledger
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Schema v0.1.0
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}
