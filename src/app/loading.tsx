import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      <p className="text-sm font-medium text-slate-400">Loading ledger data...</p>
    </div>
  );
}
