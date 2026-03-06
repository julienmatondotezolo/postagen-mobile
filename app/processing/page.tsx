"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGeneration } from "@/lib/generation";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";
import confetti from "canvas-confetti";

function getAnalysisSteps(t: (key: string) => string) {
  return [
    { text: t("processing.step1"), threshold: 10 },
    { text: t("processing.step2"), threshold: 30 },
    { text: t("processing.step3"), threshold: 50 },
    { text: t("processing.step4"), threshold: 70 },
    { text: t("processing.step5"), threshold: 90 },
  ];
}

export default function Processing() {
  const { t } = useI18n();
  const router = useRouter();
  const haptics = useHaptics();
  const generation = useGeneration();
  const hasStartedRef = useRef(false);
  const hasRedirectedRef = useRef(false);

  const ANALYSIS_STEPS = getAnalysisSteps(t);

  // Start generation on mount (once)
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (generation.status === "idle") {
      generation.startGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect on completion
  useEffect(() => {
    if (generation.status === "done" && generation.planId && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      haptics.magic();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#8B5CF6", "#FFD700", "#EC4899", "#A855F7"] });
      setTimeout(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#8B5CF6", "#FFD700"] });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#EC4899", "#A855F7"] });
      }, 250);
      setTimeout(() => {
        generation.dismiss();
        router.push(`/plan/${generation.planId}`);
      }, 800);
    }
  }, [generation, haptics, router]);

  // Derive step text from progress
  let currentStepText = ANALYSIS_STEPS[0].text;
  for (let i = ANALYSIS_STEPS.length - 1; i >= 0; i--) {
    if (generation.progress >= ANALYSIS_STEPS[i].threshold) {
      currentStepText = ANALYSIS_STEPS[i].text;
      break;
    }
  }
  if (generation.status === "done") {
    currentStepText = t("processing.done");
  }

  const handleRetry = () => {
    haptics.tap();
    generation.retry();
  };

  const progress = generation.status === "done" ? 100 : generation.progress;

  return (
    <div className="min-h-screen bg-mood-processing flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Central Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-purple-200/40 blur-3xl scale-150"></div>
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-2xl shadow-purple-100">
              <div className="flex items-center justify-center gap-1">
                {generation.status === "error" ? (
                  <svg
                    className="h-10 w-10 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-10 w-10 animate-pulse text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        {generation.status === "error" ? (
          <>
            <h1 className="mb-6 text-4xl font-bold text-gray-900">Oeps!</h1>
            <h2 className="mb-6 text-2xl font-serif italic font-normal text-red-500">
              Er ging iets mis
            </h2>
            <p className="mb-8 text-base text-gray-600 font-medium">
              {generation.error || "Controleer je verbinding en probeer het opnieuw."}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full rounded-2xl bg-[#8B5CF6] px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {t("common.retry")}
              </button>
              <button
                onClick={() => router.push("/home")}
                className="w-full rounded-2xl bg-gray-100 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98]"
              >
                {t("common.back")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-4xl font-bold text-gray-900">
              {t("processing.title")}
            </h1>

            {/* Current Step */}
            <p className="mb-16 text-base text-gray-600 font-medium">
              {currentStepText}
            </p>

            {/* Progress Bar Container */}
            <div className="relative px-4">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full progress-shimmer shadow-lg shadow-purple-200"
                  style={{
                    width: `${progress}%`,
                    transition:
                      progress >= 100
                        ? "width 0.3s ease-out"
                        : "none",
                  }}
                ></div>
              </div>
              <p className="mt-4 text-xs font-bold tracking-widest text-gray-400 uppercase">
                {Math.round(progress)}% OPTIMIZED
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
