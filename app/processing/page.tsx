"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getAllMedia,
  getBrandIdentity,
  savePost,
  createPlan,
  updateMedia,
  type Post,
} from "@/lib/db";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";

function getAnalysisSteps(t: (key: string) => string) {
  return [
    { text: t("processing.step1"), threshold: 10 },
    { text: t("processing.step2"), threshold: 30 },
    { text: t("processing.step3"), threshold: 50 },
    { text: t("processing.step4"), threshold: 70 },
    { text: t("processing.step5"), threshold: 90 },
  ];
}

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
  thumbnail?: string; // For videos: extracted frame as thumbnail
}

interface ConvertedVideo {
  id: string;
  base64: string;
  mimeType: string;
  type: "video";
}

interface GenerateResponse {
  posts: GenerateResponsePost[];
  planName: string;
  planDescription: string;
  convertedVideos?: ConvertedVideo[];
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
  const { t } = useI18n();
  const router = useRouter();
  const ANALYSIS_STEPS = getAnalysisSteps(t);
  const [progress, setProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState(ANALYSIS_STEPS[0].text);
  const apiDoneRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const imageCountRef = useRef<number>(1);
  const hasMutatedRef = useRef(false); // Prevent double-trigger from React 18 Strict Mode

  /**
   * Exponential-decay progress animation.
   */
  const runProgressAnimation = useCallback(() => {
    const steps = getAnalysisSteps(t);
    const tick = () => {
      if (apiDoneRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const imgCount = imageCountRef.current;

      const estimatedTotal = imgCount <= 3 ? 12 : imgCount <= 5 ? 20 : 30;
      const k = 2.5 / estimatedTotal;
      const newProgress = Math.min(90, 90 * (1 - Math.exp(-k * elapsed)));

      setProgress(newProgress);

      for (let i = steps.length - 1; i >= 0; i--) {
        if (newProgress >= steps[i].threshold) {
          setCurrentStepText(steps[i].text);
          break;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [t]);

  // TanStack Query mutation - automatically prevents duplicate requests
  const mutation = useMutation({
    mutationFn: async () => {
      
      const mediaFiles = await getAllMedia();
      const mediaUrlsCheck = sessionStorage.getItem("postagen-mediaUrls");
      let mediaUrlCount = 0;
      try { mediaUrlCount = JSON.parse(mediaUrlsCheck || "[]").length; } catch {}

      if (mediaFiles.length === 0 && mediaUrlCount === 0) {
        router.push("/upload");
        throw new Error("No media files");
      }

      imageCountRef.current = mediaFiles.length + mediaUrlCount;
      startTimeRef.current = Date.now();
      apiDoneRef.current = false;

      // Start the smooth progress animation
      runProgressAnimation();

      // --- Fetch brand identity from IndexedDB ---
      const brandIdentity = await getBrandIdentity();

        // --- Read context from sessionStorage ---
        const language = sessionStorage.getItem("postagen-language") || "nl";
        const weeklyContext = sessionStorage.getItem("postagen-weeklyContext") || "";
        const specialMessage = sessionStorage.getItem("postagen-specialMessage") || "";
        const mediaUrlsJson = sessionStorage.getItem("postagen-mediaUrls") || "[]";
        let mediaUrls: string[] = [];
        try { mediaUrls = JSON.parse(mediaUrlsJson); } catch {}

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

        // Append context fields
        formData.append("language", language);
        if (weeklyContext) formData.append("weeklyContext", weeklyContext);
        if (specialMessage) formData.append("specialMessage", specialMessage);

        // Append library media URLs
        for (const url of mediaUrls) {
          formData.append("mediaUrls", url);
        }

        // Convert each base64 media item to a Blob and append as "files"
        for (const m of mediaFiles) {
          const blob = base64ToBlob(m.base64);
          const filename = `${m.id}${extFromMime(m.mimeType)}`;
          formData.append("files", blob, filename);
        }

      // --- API call with timeout ---
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch(`${API_BASE_URL}/api/generate`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          console.error(`API error ${response.status}: ${errorText}`);

          let errorMessage: string;
          if (response.status === 413) {
            errorMessage = t("processing.tooLarge");
          } else if (response.status === 400) {
            errorMessage = t("processing.noMedia");
          } else {
            errorMessage = `${t("processing.error")} (${response.status})`;
          }
          throw new Error(errorMessage);
        }

        const data: GenerateResponse = await response.json();

        // --- Validate response ---
        if (!data.posts || data.posts.length === 0) {
          throw new Error(t("processing.noResults"));
        }

        // --- IMMEDIATELY jump to 100% ---
        apiDoneRef.current = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setProgress(100);
        setCurrentStepText(t("processing.done"));

        // --- Update IndexedDB with converted MP4 videos ---
        if (data.convertedVideos && data.convertedVideos.length > 0) {
          for (const video of data.convertedVideos) {
            try {
              await updateMedia({
                id: video.id,
                base64: video.base64,
                mimeType: video.mimeType,
                type: video.type,
              });
            } catch (err) {
              console.error(`❌ Failed to update video ${video.id}:`, err);
            }
          }
        }

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
            thumbnail: post.thumbnail,
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

        return newPlan;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        apiDoneRef.current = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          throw new Error(t("processing.timeout"));
        }
        throw fetchError;
      }
    },
    onSuccess: (newPlan) => {
      // Clean up sessionStorage
      sessionStorage.removeItem("postagen-language");
      sessionStorage.removeItem("postagen-weeklyContext");
      sessionStorage.removeItem("postagen-specialMessage");
      sessionStorage.removeItem("postagen-mediaUrls");

      setTimeout(() => {
        router.push(`/plan/${newPlan.id}`);
      }, 800);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("processing.error"), {
        duration: 6000,
      });
    },
  });

  // Trigger mutation on mount — ONCE only (React 18 Strict Mode calls useEffect twice)
  useEffect(() => {
    if (hasMutatedRef.current) return;
    hasMutatedRef.current = true;
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      apiDoneRef.current = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleRetry = () => {
    mutation.reset();
    setProgress(0);
    setCurrentStepText(getAnalysisSteps(t)[0].text);
    hasMutatedRef.current = false; // Allow retry
    hasMutatedRef.current = true;  // Mark as triggered
    mutation.mutate();
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
                {mutation.isError ? (
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
        {mutation.isError ? (
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
              {t("common.retry")}
            </button>
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
