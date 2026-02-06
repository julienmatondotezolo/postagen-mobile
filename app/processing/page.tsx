"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
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
  { text: "Received images, starting analysis...", threshold: 10 },
  { text: "Analyzing your images with AI...", threshold: 30 },
  { text: "Generating captions...", threshold: 50 },
  { text: "Optimizing schedule...", threshold: 70 },
  { text: "Finalizing your plan...", threshold: 90 },
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

const API_TIMEOUT_MS = 120_000; // 120 seconds — GPT Vision can be slow with 10+ images

/**
 * Convert a base64 data URL to a Blob.
 */
function base64ToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Get a file extension from a MIME type.
 */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  return map[mime] || ".bin";
}

export default function Processing() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState(ANALYSIS_STEPS[0].text);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);
  const apiDoneRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const imageCountRef = useRef<number>(1);

  /**
   * Exponential-decay progress animation.
   */
  const runProgressAnimation = useCallback(() => {
    const tick = () => {
      if (apiDoneRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const imgCount = imageCountRef.current;

      const estimatedTotal = imgCount <= 3 ? 12 : imgCount <= 5 ? 20 : 30;
      const k = 2.5 / estimatedTotal;
      const newProgress = Math.min(90, 90 * (1 - Math.exp(-k * elapsed)));

      setProgress(newProgress);

      for (let i = ANALYSIS_STEPS.length - 1; i >= 0; i--) {
        if (newProgress >= ANALYSIS_STEPS[i].threshold) {
          setCurrentStepText(ANALYSIS_STEPS[i].text);
          break;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (hasGenerated) return;
    setHasGenerated(true);
    isMountedRef.current = true;

    const generatePlan = async () => {
      try {
        const mediaFiles = await getAllMedia();
        if (mediaFiles.length === 0) {
          router.push("/upload");
          return;
        }

        // Bail out if the component already unmounted (React 18 strict mode)
        if (!isMountedRef.current) return;

        imageCountRef.current = mediaFiles.length;
        startTimeRef.current = Date.now();
        apiDoneRef.current = false;

        // Start the smooth progress animation
        runProgressAnimation();

        // --- Fetch brand identity from IndexedDB ---
        const brandIdentity = await getBrandIdentity();

        // --- Build FormData (multipart/form-data) ---
        const formData = new FormData();

        // Append brandIdentity as JSON string
        formData.append(
          "brandIdentity",
          JSON.stringify({
            websiteUrl: brandIdentity?.websiteUrl,
            description: brandIdentity?.description,
            businessName: brandIdentity?.businessName,
          })
        );

        // Convert each base64 media item to a Blob and append as "files"
        for (const m of mediaFiles) {
          const blob = base64ToBlob(m.base64);
          const filename = `${m.id}${extFromMime(m.mimeType)}`;
          formData.append("files", blob, filename);
        }

        // --- API call with timeout ---
        // Create AbortController INSIDE the async function (not in useEffect scope)
        // to avoid React 18 strict mode cleanup aborting the fetch immediately.
        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
          controller.abort();
        }, API_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(`${API_BASE_URL}/api/generate`, {
            method: "POST",
            // DO NOT set Content-Type — browser sets multipart boundary automatically
            body: formData,
            signal: controller.signal,
          });
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          apiDoneRef.current = true;
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

          // If component unmounted, don't update state
          if (!isMountedRef.current) return;

          if (
            fetchError instanceof DOMException &&
            fetchError.name === "AbortError"
          ) {
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

        // If component unmounted, don't process response
        if (!isMountedRef.current) return;

        if (!response.ok) {
          apiDoneRef.current = true;
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

          const errorText = await response.text().catch(() => "");
          console.error(`API error ${response.status}: ${errorText}`);

          let errorMessage: string;
          if (response.status === 413) {
            errorMessage =
              "De upload is te groot. Probeer minder of kleinere bestanden te uploaden.";
          } else if (response.status === 400) {
            errorMessage =
              "Geen geldige media gevonden. Upload minstens één foto of video.";
          } else {
            errorMessage = `Er ging iets mis bij het genereren (${response.status}). Probeer het opnieuw.`;
          }

          toast.error(errorMessage, { duration: 6000 });
          setHasError(true);
          return;
        }

        const data: GenerateResponse = await response.json();

        if (!isMountedRef.current) return;

        // --- Validate response ---
        if (!data.posts || data.posts.length === 0) {
          apiDoneRef.current = true;
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          toast.error(
            "De AI heeft geen posts kunnen genereren. Probeer het opnieuw.",
            { duration: 6000 }
          );
          setHasError(true);
          return;
        }

        // --- IMMEDIATELY jump to 100% ---
        apiDoneRef.current = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setProgress(100);
        setCurrentStepText("Done! Preparing your plan...");

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

        if (!isMountedRef.current) return;

        // --- Navigate to plan view after brief delay ---
        setTimeout(() => {
          router.push(`/plan/${newPlan.id}`);
        }, 800);
      } catch (error) {
        console.error("Error generating plan:", error);
        apiDoneRef.current = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        if (!isMountedRef.current) return;

        toast.error(
          "Er is een onverwachte fout opgetreden. Probeer het opnieuw.",
          { duration: 6000 }
        );
        setHasError(true);
      }
    };

    generatePlan();

    return () => {
      // Mark unmounted — do NOT abort the controller here (React 18 strict mode fix)
      isMountedRef.current = false;
      apiDoneRef.current = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setHasGenerated(false);
    setProgress(0);
    setCurrentStepText(ANALYSIS_STEPS[0].text);
  };

  return (
    <div className="min-h-screen bg-mood-processing flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Central Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
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
            <h1 className="mb-6 text-4xl font-bold text-gray-900">Oeps!</h1>
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
