"use client";

import { useRouter, usePathname } from "next/navigation";
import { useGeneration } from "@/lib/generation";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";
import { useState, useEffect, useRef } from "react";

export default function GenerationPopup() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const generation = useGeneration();
  const haptics = useHaptics();
  const [minimized, setMinimized] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss "done" popup after 8 seconds
  useEffect(() => {
    if (generation.status === "done") {
      autoDismissRef.current = setTimeout(() => {
        generation.dismiss();
      }, 8000);
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      };
    }
  }, [generation.status, generation]);

  // Auto-dismiss "error" popup after 10 seconds
  useEffect(() => {
    if (generation.status === "error") {
      autoDismissRef.current = setTimeout(() => {
        generation.dismiss();
      }, 10000);
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      };
    }
  }, [generation.status, generation]);

  if (generation.status === "idle") return null;

  // Hide popup while on /processing page — that page shows its own UI
  if (pathname === "/processing") return null;

  // Minimized — small circle
  if (minimized && generation.status === "generating") {
    return (
      <button
        onClick={() => { haptics.tap(); setMinimized(false); }}
        className="fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {Math.round(generation.progress)}%
      </button>
    );
  }

  // Generating state
  if (generation.status === "generating") {
    return (
      <div className="fixed bottom-24 right-4 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-r-transparent" />
            <p className="text-sm font-bold text-gray-900">{t("processing.title")}</p>
          </div>
          <button
            onClick={() => { haptics.tap(); setMinimized(true); }}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-purple-100">
          <div
            className="h-full rounded-full bg-purple-600 transition-all duration-300"
            style={{ width: `${generation.progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {Math.round(generation.progress)}% {t("processing.title").toLowerCase()}
        </p>
      </div>
    );
  }

  // Done state
  if (generation.status === "done" && generation.planId) {
    return (
      <div className="fixed bottom-24 right-4 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-900">{t("processing.done")}</p>
          </div>
          <button
            onClick={() => { haptics.tap(); generation.dismiss(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => {
            haptics.tap();
            generation.dismiss();
            router.push(`/plan/${generation.planId}`);
          }}
          className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-700 active:scale-[0.98]"
        >
          {t("processing.viewPlan")}
        </button>
      </div>
    );
  }

  // Error state
  if (generation.status === "error") {
    return (
      <div className="fixed bottom-24 right-4 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-900">{t("processing.error")}</p>
          </div>
          <button
            onClick={() => { haptics.tap(); generation.dismiss(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">{generation.error}</p>
        <button
          onClick={() => { haptics.tap(); generation.retry(); }}
          className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-700 active:scale-[0.98]"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return null;
}
