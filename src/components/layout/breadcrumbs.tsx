"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center text-xs font-medium text-slate-400">
        <Home className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
        <span>Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center text-xs font-medium text-slate-400 space-x-1.5">
      <Link
        href="/"
        className="hover:text-slate-200 transition-colors flex items-center"
      >
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Home</span>
      </Link>
      {segments.map((segment, idx) => {
        const url = `/${segments.slice(0, idx + 1).join("/")}`;
        const isLast = idx === segments.length - 1;
        const formatted =
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="text-slate-200 font-semibold">{formatted}</span>
            ) : (
              <Link
                href={url}
                className="hover:text-slate-200 transition-colors"
              >
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
