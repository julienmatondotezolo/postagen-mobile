"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMedia, getFolders, updateMediaStatus, type MediaRecord } from "@/lib/api";
import SwipeCard from "@/components/SwipeCard";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";
import toast from "react-hot-toast";

export default function SwipePage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaRecord | null>(null);
  const historyRef = useRef<Array<{ id: string; index: number }>>([]);
  const haptics = useHaptics();

  const folderId = searchParams.get("folderId");
  const isUnsorted = searchParams.get("folder") === "unsorted" || !folderId;

  // Get folder name for display
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const folderName = folderId
    ? folders?.find((f) => f.id === folderId)?.name ?? "..."
    : t("media.unsorted");

  // Only fetch pending media for the selected folder
  const { data: media, isLoading } = useQuery({
    queryKey: ["media-swipe", folderId, "pending"],
    queryFn: () =>
      getMedia({
        folderId: folderId || undefined,
        folder: isUnsorted ? "unsorted" : undefined,
        status: "pending",
        limit: 200,
      }),
  });

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (!media || currentIndex >= media.length) return;

      const item = media[currentIndex];
      const newStatus = direction === "right" ? "liked" : "unliked";
      if (direction === "right") haptics.like(); else haptics.dislike();

      historyRef.current.push({ id: item.id, index: currentIndex });
      setCurrentIndex((prev) => prev + 1);

      try {
        await updateMediaStatus(item.id, newStatus);
        queryClient.invalidateQueries({ queryKey: ["media-stats"] });
        queryClient.invalidateQueries({ queryKey: ["media-recent"] });
        queryClient.invalidateQueries({ queryKey: ["media"] });
        queryClient.invalidateQueries({ queryKey: ["folders"] });
      } catch {
        haptics.error();
        toast.error(t("media.swipeError"));
      }
    },
    [media, currentIndex, queryClient, t, haptics]
  );

  const handleUndo = useCallback(async () => {
    const last = historyRef.current.pop();
    if (!last) return;
    haptics.tap();

    setCurrentIndex(last.index);

    try {
      await updateMediaStatus(last.id, "pending");
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      queryClient.invalidateQueries({ queryKey: ["media-recent"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch {
      haptics.error();
      toast.error(t("media.swipeError"));
    }
  }, [queryClient, t, haptics]);

  const remaining = media ? media.length - currentIndex : 0;
  const visibleCards = media?.slice(currentIndex, currentIndex + 2) ?? [];
  const canUndo = historyRef.current.length > 0;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={() => { haptics.tap(); router.push("/media"); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">{t("media.swipeTitle")}</h1>
          <p className="text-xs text-white/50">
            {folderName} — {remaining} {t("media.remaining")}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Card Area */}
      <div className="relative flex-1 mx-6 mb-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          </div>
        ) : remaining === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{t("media.allSorted")}</h2>
            <p className="text-white/50">{t("media.allSortedDesc")}</p>
            <button
              onClick={() => { haptics.tap(); router.push("/media"); }}
              className="mt-8 rounded-2xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
            >
              {t("media.backToMedia")}
            </button>
          </div>
        ) : (
          visibleCards
            .map((item: MediaRecord, i: number) => (
              <SwipeCard
                key={item.id}
                media={item}
                isTop={i === 0}
                onSwipe={handleSwipe}
                onTap={() => setFullscreenMedia(item)}
              />
            ))
            .reverse()
        )}
      </div>

      {/* Bottom Buttons */}
      {remaining > 0 && (
        <div className="relative z-20 flex items-center justify-center gap-6 pb-10">
          <button
            onClick={() => handleSwipe("left")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border-2 border-red-500 text-red-500 transition-all hover:bg-red-500 hover:text-white active:scale-90"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border-2 border-white/20 text-white/60 transition-all hover:bg-white/20 active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border-2 border-green-500 text-green-500 transition-all hover:bg-green-500 hover:text-white active:scale-90"
          >
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Undo available on "all sorted" screen too */}
      {remaining === 0 && canUndo && (
        <div className="relative z-20 flex justify-center pb-6">
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 transition-all hover:bg-white/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            {t("media.undo")}
          </button>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
          onClick={() => { haptics.tap(); setFullscreenMedia(null); }}
        >
          <button
            onClick={() => { haptics.tap(); setFullscreenMedia(null); }}
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {fullscreenMedia.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullscreenMedia.url}
              alt={fullscreenMedia.filename}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={fullscreenMedia.url}
              className="max-h-full max-w-full object-contain"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
