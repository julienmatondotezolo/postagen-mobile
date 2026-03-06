"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { getAllMedia, getBrandIdentity, updateMedia } from "@/lib/db";
import { createPlanApi, addPostsToPlanApi, apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

type GenerationStatus = "idle" | "generating" | "done" | "error";

interface GenerationState {
  status: GenerationStatus;
  progress: number;
  planId: string | null;
  error: string | null;
}

interface GenerationContextValue extends GenerationState {
  startGeneration: () => void;
  dismiss: () => void;
  retry: () => void;
}

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
}

interface GenerateResponsePost {
  id: string;
  mediaId: string;
  realMediaId?: string | null;
  caption: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  dayName: string;
  sentiment: "Very Positive" | "Positive" | "Neutral" | "Negative";
  isOptimized: boolean;
  createdAt: number;
  thumbnail?: string;
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

const API_TIMEOUT_MS = 120_000;

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

const initialState: GenerationState = {
  status: "idle",
  progress: 0,
  planId: null,
  error: null,
};

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GenerationState>(initialState);
  const generatingRef = useRef(false);
  const apiDoneRef = useRef(false);
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const imageCountRef = useRef<number>(1);

  const cleanupAnimation = useCallback(() => {
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }
  }, []);

  const runProgressAnimation = useCallback(() => {
    startTimeRef.current = Date.now();
    animIntervalRef.current = setInterval(() => {
      if (apiDoneRef.current) {
        cleanupAnimation();
        return;
      }
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const imgCount = imageCountRef.current;
      const estimatedTotal = imgCount <= 3 ? 12 : imgCount <= 5 ? 20 : 30;
      const k = 2.5 / estimatedTotal;
      const newProgress = Math.min(90, 90 * (1 - Math.exp(-k * elapsed)));
      setState((prev) => ({ ...prev, progress: newProgress }));
    }, 200);
  }, [cleanupAnimation]);

  const startGeneration = useCallback(() => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    apiDoneRef.current = false;

    setState({ status: "generating", progress: 0, planId: null, error: null });

    (async () => {
      try {
        const mediaFiles = await getAllMedia();
        const mediaUrlsCheck = sessionStorage.getItem("postagen-mediaUrls");
        let mediaUrlCount = 0;
        try { mediaUrlCount = JSON.parse(mediaUrlsCheck || "[]").length; } catch {}

        if (mediaFiles.length === 0 && mediaUrlCount === 0) {
          throw new Error("No media files");
        }

        imageCountRef.current = mediaFiles.length + mediaUrlCount;
        runProgressAnimation();

        const brandIdentity = await getBrandIdentity();
        const language = sessionStorage.getItem("postagen-language") || "nl";
        const weeklyContext = sessionStorage.getItem("postagen-weeklyContext") || "";
        const specialMessage = sessionStorage.getItem("postagen-specialMessage") || "";
        const mediaUrlsJson = sessionStorage.getItem("postagen-mediaUrls") || "[]";
        const mediaIdsJson = sessionStorage.getItem("postagen-mediaIds") || "[]";
        const addToPlanId = sessionStorage.getItem("postagen-addToPlanId");
        let mediaUrls: string[] = [];
        let mediaIds: string[] = [];
        try { mediaUrls = JSON.parse(mediaUrlsJson); } catch {}
        try { mediaIds = JSON.parse(mediaIdsJson); } catch {}

        const formData = new FormData();
        formData.append("brandIdentity", JSON.stringify({
          websiteUrl: brandIdentity?.websiteUrl,
          description: brandIdentity?.description,
          businessName: brandIdentity?.businessName,
        }));
        formData.append("language", language);
        if (weeklyContext) formData.append("weeklyContext", weeklyContext);
        if (specialMessage) formData.append("specialMessage", specialMessage);
        for (const url of mediaUrls) formData.append("mediaUrls", url);
        for (const id of mediaIds) formData.append("mediaIds", id);
        for (const m of mediaFiles) {
          const blob = base64ToBlob(m.base64);
          const filename = `${m.id}${extFromMime(m.mimeType)}`;
          formData.append("files", blob, filename);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        const response = await apiFetch(`${API_BASE_URL}/api/generate`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          console.error(`API error ${response.status}: ${errorText}`);
          if (response.status === 413) throw new Error("Files too large");
          if (response.status === 400) throw new Error("No media provided");
          throw new Error(`Generation failed (${response.status})`);
        }

        const data: GenerateResponse = await response.json();
        if (!data.posts || data.posts.length === 0) {
          throw new Error("No results generated");
        }

        // Stop animation
        apiDoneRef.current = true;
        cleanupAnimation();

        // Update IndexedDB with converted videos
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
              console.error(`Failed to update video ${video.id}:`, err);
            }
          }
        }

        // Create plan
        const postData = data.posts.map((post) => ({
          caption: post.caption,
          hashtags: post.hashtags,
          scheduled_date: post.scheduledDate,
          scheduled_time: post.scheduledTime,
          day_name: post.dayName,
          sentiment: post.sentiment,
          is_optimized: post.isOptimized,
          thumbnail: post.thumbnail || null,
          media_id: post.realMediaId || null,
        }));

        let planId: string;
        if (addToPlanId) {
          await addPostsToPlanApi(addToPlanId, postData);
          planId = addToPlanId;
        } else {
          const result = await createPlanApi({
            name: data.planName,
            description: data.planDescription,
            status: "Draft",
            posts: postData,
          });
          planId = result.plan.id;
        }

        // Clean up sessionStorage
        sessionStorage.removeItem("postagen-language");
        sessionStorage.removeItem("postagen-weeklyContext");
        sessionStorage.removeItem("postagen-specialMessage");
        sessionStorage.removeItem("postagen-mediaUrls");
        sessionStorage.removeItem("postagen-mediaIds");
        sessionStorage.removeItem("postagen-addToPlanId");

        // Success
        navigator.vibrate?.([100, 50, 100, 50, 200]);
        setState({ status: "done", progress: 100, planId, error: null });
      } catch (err: unknown) {
        apiDoneRef.current = true;
        cleanupAnimation();
        const message = err instanceof DOMException && err.name === "AbortError"
          ? "Request timed out"
          : err instanceof Error ? err.message : "Generation failed";
        navigator.vibrate?.([200, 100, 200]);
        setState({ status: "error", progress: 0, planId: null, error: message });
      } finally {
        generatingRef.current = false;
      }
    })();
  }, [runProgressAnimation, cleanupAnimation]);

  const dismiss = useCallback(() => {
    setState(initialState);
  }, []);

  const retry = useCallback(() => {
    setState(initialState);
    generatingRef.current = false;
    // Small delay to reset state before starting again
    setTimeout(() => startGeneration(), 0);
  }, [startGeneration]);

  return (
    <GenerationContext.Provider value={{ ...state, startGeneration, dismiss, retry }}>
      {children}
    </GenerationContext.Provider>
  );
}
