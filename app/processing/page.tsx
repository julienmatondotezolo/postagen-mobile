"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  getAllMedia,
  getBrandIdentity,
  savePost,
  createPlan,
  type Post,
} from "@/lib/db";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";

const ANALYSIS_STEPS = [
  "Analyzing your menu...",
  "Crafting perfect captions...",
  "Selecting best angles...",
  "Optimizing your content...",
  "Finalizing your plan...",
];

interface GenerateResponsePost {
  id: string;
  mediaId: string;
  caption: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  dayName: string;
  sentiment: "Very Positive" | "Positive" | "Neutral" | "Negative";
  isOptimized: boolean;
  createdAt: number;
}

interface GenerateResponse {
  posts: GenerateResponsePost[];
  planName: string;
  planDescription: string;
}

const API_TIMEOUT_MS = 60_000;

export default function Processing() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Prevent duplicate plan creation (React Strict Mode runs useEffect twice)
    if (hasGenerated) return;
    setHasGenerated(true);

    const generatePlan = async () => {
      try {
        const mediaFiles = await getAllMedia();
        if (mediaFiles.length === 0) {
          router.push("/upload");
          return;
        }

        // --- Progress animation: smoothly fill to ~80% ---
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 80) {
              clearInterval(progressInterval);
              return 80;
            }
            // Ease-out: slow down as we approach 80
            const remaining = 80 - prev;
            const increment = Math.max(0.3, remaining * 0.04);
            return Math.min(80, prev + increment);
          });
        }, 100);

        // --- Step text rotation ---
        const stepInterval = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev >= ANALYSIS_STEPS.length - 1) {
              clearInterval(stepInterval);
              return ANALYSIS_STEPS.length - 1;
            }
            return prev + 1;
          });
        }, 2000);

        // --- Fetch brand identity from IndexedDB ---
        const brandIdentity = await getBrandIdentity();

        // --- Build request payload ---
        const requestBody = {
          brandIdentity: {
            websiteUrl: brandIdentity?.websiteUrl,
            description: brandIdentity?.description,
            businessName: brandIdentity?.businessName,
          },
          media: mediaFiles.map((m) => ({
            id: m.id,
            base64: m.base64, // Already a data URL from fileToBase64()
            type: m.type,
            mimeType: m.mimeType,
          })),
        };

        // --- API call with timeout + abort ---
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timeoutId = setTimeout(() => {
          controller.abort();
        }, API_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          clearInterval(progressInterval);
          clearInterval(stepInterval);

          if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
            toast.error(
              "De verwerking duurde te lang. Probeer het opnieuw met minder foto's.",
              { duration: 6000 }
            );
          } else {
            toast.error(
              "Kan geen verbinding maken met de server. Controleer je internetverbinding.",
              { duration: 6000 }
            );
          }
          setHasError(true);
          return;
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          clearInterval(progressInterval);
          clearInterval(stepInterval);

          const errorText = await response.text().catch(() => "");
          console.error(`API error ${response.status}: ${errorText}`);
          toast.error(
            `Er ging iets mis bij het genereren (${response.status}). Probeer het opnieuw.`,
            { duration: 6000 }
          );
          setHasError(true);
          return;
        }

        const data: GenerateResponse = await response.json();

        // --- Validate response ---
        if (!data.posts || data.posts.length === 0) {
          clearInterval(progressInterval);
          clearInterval(stepInterval);
          toast.error(
            "De AI heeft geen posts kunnen genereren. Probeer het opnieuw.",
            { duration: 6000 }
          );
          setHasError(true);
          return;
        }

        // --- Jump to 100% ---
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        setProgress(100);
        setCurrentStep(ANALYSIS_STEPS.length - 1);

        // --- Save posts to IndexedDB ---
        for (const post of data.posts) {
          const validPost: Post = {
            id: post.id,
            mediaId: post.mediaId,
            caption: post.caption,
            hashtags: post.hashtags,
            scheduledDate: post.scheduledDate,
            scheduledTime: post.scheduledTime,
            dayName: post.dayName,
            sentiment: post.sentiment,
            isOptimized: post.isOptimized,
            createdAt: post.createdAt,
          };
          await savePost(validPost);
        }

        // --- Create plan in IndexedDB ---
        const postIds = data.posts.map((p) => p.id);
        const mediaIds = mediaFiles.map((m) => m.id);
        const newPlan = await createPlan(
          data.planName,
          postIds,
          mediaIds,
          data.planDescription,
          "Draft"
        );

        // --- Navigate to plan view after brief delay ---
        setTimeout(() => {
          router.push(`/plan/${newPlan.id}`);
        }, 800);
      } catch (error) {
        console.error("Error generating plan:", error);
        toast.error(
          "Er is een onverwachte fout opgetreden. Probeer het opnieuw.",
          { duration: 6000 }
        );
        setHasError(true);
      }
    };

    generatePlan();

    // Cleanup: abort in-flight request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setHasGenerated(false);
    setProgress(0);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-mood-processing flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Central Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            {/* Pulsing background glow */}
            <div className="absolute inset-0 animate-pulse rounded-full bg-purple-200/40 blur-3xl scale-150"></div>

            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-2xl shadow-purple-100">
              <div className="flex items-center justify-center gap-1">
                {hasError ? (
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
        {hasError ? (
          <>
            <h1 className="mb-6 text-4xl font-bold text-gray-900">
              Oeps!
            </h1>
            <h2 className="mb-6 text-2xl font-serif italic font-normal text-red-500">
              Er ging iets mis
            </h2>
            <p className="mb-8 text-base text-gray-600 font-medium">
              Controleer je verbinding en probeer het opnieuw.
            </p>
            <button
              onClick={handleRetry}
              className="rounded-2xl bg-[#8B5CF6] px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Opnieuw proberen
            </button>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-4xl font-bold text-gray-900">
              AI Analysis
            </h1>
            <h2 className="mb-6 text-4xl font-serif italic font-normal text-violet-600">
              in Progress
            </h2>

            {/* Current Step */}
            <p className="mb-16 text-base text-gray-600 font-medium">
              {ANALYSIS_STEPS[currentStep] ||
                ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1]}
            </p>

            {/* Progress Bar Container */}
            <div className="relative px-4">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full progress-shimmer transition-all duration-300 ease-out shadow-lg shadow-purple-200"
                  style={{ width: `${progress}%` }}
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
