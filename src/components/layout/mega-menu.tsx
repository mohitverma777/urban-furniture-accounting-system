"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  ChevronDown,
  ShoppingCart,
  Receipt,
  CreditCard,
  ShoppingBag,
  FileText,
  DollarSign,
  Users,
  Package,
  PieChart,
  Target,
  BookOpen,
  BookMarked,
  Layers,
  FileCheck,
  TrendingUp,
  BarChart3,
  Sparkles,
  History,
  X,
} from "lucide-react";

export function NavigationMegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const salesLinks = [
    { title: "Sales Order", href: "/sales", icon: ShoppingCart },
    { title: "Sale Invoice", href: "/sales?tab=invoices", icon: Receipt },
    { title: "Receipt", href: "/payments", icon: CreditCard },
  ];

  const purchaseLinks = [
    { title: "Purchase Order", href: "/purchases", icon: ShoppingBag },
    { title: "Purchase Bill", href: "/purchases?tab=bills", icon: FileText },
    { title: "Payment", href: "/payments", icon: DollarSign },
  ];

  const accountLinks = [
    { title: "Contact", href: "/contacts", icon: Users },
    { title: "Product", href: "/products", icon: Package },
    { title: "Analyticals", href: "/budgets", icon: PieChart },
    { title: "Analytical Budget", href: "/budgets", icon: Target },
    { title: "Chart of Account", href: "/accounting", icon: BookOpen },
    { title: "Journals", href: "/accounting", icon: BookMarked },
    { title: "Journal Entries", href: "/accounting", icon: Layers },
  ];

  const reportLinks = [
    { title: "AI Cash Flow Forecast", href: "/reports/cash-flow-forecast", icon: Sparkles },
    { title: "Balancesheet", href: "/reports/balance-sheet", icon: FileCheck },
    { title: "Profit and Loss", href: "/reports/profit-loss", icon: TrendingUp },
    { title: "GST Tax Summary", href: "/reports/gst", icon: Receipt },
    { title: "Budget Report", href: "/budgets", icon: BarChart3 },
    { title: "Audit Trail", href: "/audit-log", icon: History },
  ];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
          isOpen
            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/40"
            : "bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
        }`}
        aria-label="Navigation Menu"
        aria-expanded={isOpen}
      >
        <LayoutGrid className={`w-4 h-4 ${isOpen ? "text-slate-950" : "text-amber-400"}`} />
        <span>Modules & Navigation</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-950" : "text-slate-400"
          }`}
        />
      </button>

      {/* Mega Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[90vw] max-w-4xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl z-50 p-6 animate-in fade-in-0 zoom-in-95">
          {/* Header Bar inside Mega Menu */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">
                Navigation Directory
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4-Column Grid Layout matching Excalidraw mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* 1. Sales */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Sales
                </h3>
              </div>
              <ul className="space-y-1">
                {salesLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors group"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 2. Purchase */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Purchase
                </h3>
              </div>
              <ul className="space-y-1">
                {purchaseLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors group"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 3. Account */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Account
                </h3>
              </div>
              <ul className="space-y-1">
                {accountLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors group"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 4. Report */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Report
                </h3>
              </div>
              <ul className="space-y-1">
                {reportLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors group"
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
