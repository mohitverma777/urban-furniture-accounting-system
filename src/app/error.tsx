"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-6">
      <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
        <AlertOctagon className="w-8 h-8" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-bold text-white">Application Error</h2>
        <p className="text-sm text-slate-400">
          An unexpected error occurred while loading this page.
        </p>
        {error.message && (
          <p className="text-xs font-mono p-3 bg-slate-900 border border-slate-800 rounded-xl text-rose-300 text-left overflow-x-auto">
            {error.message}
          </p>
        )}
      </div>

      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-amber-950/40"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
