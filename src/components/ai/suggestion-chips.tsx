"use client";

/**
 * src/components/ai/suggestion-chips.tsx
 *
 * Quick-action suggestion chips displayed when the AI assistant chat is empty.
 */

import React from "react";
import { TrendingUp, Users, Target, IndianRupee, Store, PieChart } from "lucide-react";

interface Chip {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}

const CHIPS: Chip[] = [
  {
    icon: Store,
    label: "Top Vendor",
    prompt: "Which vendor did we spend the most with this month?",
  },
  {
    icon: Target,
    label: "Budget Check",
    prompt: "Are we over budget this month?",
  },
  {
    icon: TrendingUp,
    label: "Profit Analysis",
    prompt: "What is our profit this month?",
  },
  {
    icon: Users,
    label: "Top Customer",
    prompt: "Who is our biggest customer?",
  },
  {
    icon: PieChart,
    label: "Top Expenses",
    prompt: "Show me our top expenses.",
  },
  {
    icon: IndianRupee,
    label: "Cash Position",
    prompt: "What is our cash balance?",
  },
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        return (
          <button
            key={chip.label}
            onClick={() => onSelect(chip.prompt)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40
                       hover:bg-slate-800 hover:border-violet-500/40 hover:text-violet-300
                       text-slate-300 text-xs font-medium transition-all duration-150 text-left group"
          >
            <Icon className="w-4 h-4 shrink-0 text-violet-400 group-hover:scale-110 transition-transform" />
            <span className="truncate">{chip.prompt}</span>
          </button>
        );
      })}
    </div>
  );
}
