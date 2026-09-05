"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FileText,
  Receipt,
  Users,
  Package,
  BookOpen,
  Compass,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "INVOICE" | "PURCHASE" | "CONTACT" | "PRODUCT" | "JOURNAL" | "NAVIGATION";
  url: string;
  badge?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close on click outside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      search("");
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results);
        setSelectedIndex(0);
      }
    } catch (err) {
      console.error("[Command Palette Error]", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search on input change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      search(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.url);
  };

  const getCategoryIcon = (cat: SearchResultItem["category"]) => {
    switch (cat) {
      case "INVOICE":
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case "PURCHASE":
        return <Receipt className="w-4 h-4 text-blue-400" />;
      case "CONTACT":
        return <Users className="w-4 h-4 text-amber-400" />;
      case "PRODUCT":
        return <Package className="w-4 h-4 text-purple-400" />;
      case "JOURNAL":
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case "NAVIGATION":
      default:
        return <Compass className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm group"
        title="Press Ctrl+K to search"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
        <span className="truncate">Search ERP, Invoices, Contacts…</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono font-bold text-slate-400 border border-slate-700/60">
          Ctrl K
        </kbd>
      </button>

      {/* Mobile Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Search (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
              <Search className="w-5 h-5 text-amber-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search invoices (SO-...), contacts, furniture items, journals, or pages…"
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
              />
              {loading && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Close (Esc or click outside)"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
              <kbd
                onClick={() => setIsOpen(false)}
                className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-semibold text-slate-400 border border-slate-700 cursor-pointer hover:bg-slate-700"
                title="Press Esc or click outside to close"
              >
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
              {results.length === 0 && !loading && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p>No matching records found for &ldquo;{query}&rdquo;</p>
                  <p className="text-slate-500 mt-1">
                    Try searching for an order number, customer name, furniture SKU, or report.
                  </p>
                </div>
              )}

              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-800 text-white shadow-sm border border-slate-700/80"
                        : "text-slate-300 hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? "text-amber-400 translate-x-0.5" : "text-slate-600 opacity-0"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono text-slate-400">↑</kbd> <kbd className="font-mono text-slate-400">↓</kbd> navigate
                </span>
                <span>
                  <kbd className="font-mono text-slate-400">↵</kbd> open
                </span>
                <span>
                  <kbd className="font-mono text-slate-400">esc</kbd> close
                </span>
              </div>
              <span className="text-[10px] text-slate-600 font-mono">
                Urban Furniture Global Search
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
