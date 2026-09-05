"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");

  if (isAuthPage) {
    return (
      <ToastProvider>
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 font-sans antialiased">
          {children}
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased print:h-auto print:w-full print:bg-white print:text-slate-900 print:overflow-visible">
        {/* Persistent Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block">
          <Header />

          {/* Scrollable Page Container */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
