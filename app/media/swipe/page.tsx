"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMedia, getFolders, updateMediaFolder, type MediaRecord } from "@/lib/api";
import SwipeCard from "@/components/SwipeCard";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";

export default function SwipePage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const folder = searchParams.get("folder") || "unsorted";
  const folderId = searchParams.get("folderId");

  // Get folder name for display
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
    enabled: !!folderId,
  });

  const folderName = folderId
    ? folders?.find((f) => f.id === folderId)?.name ?? "..."
    : folder === "unsorted"
    ? t("media.unsorted")
    : folder === "liked"
    ? t("media.liked")
    : folder === "unliked"
    ? t("media.unliked")
    : t("media.all");

  const { data: media, isLoading } = useQuery({
    queryKey: ["media-swipe", folder, folderId],
    queryFn: () => {
      if (folderId) {
        return getMedia(undefined, 200, 0).then((all) =>
          all.filter((m) => (m as MediaRecord & { folder_id?: string }).folder_id === folderId)
        );
      }
      return getMedia(folder, 200);
    },
  });

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (!media || currentIndex >= media.length) return;

      const item = media[currentIndex];
      const targetFolder = direction === "right" ? "liked" : "unliked";

      setCurrentIndex((prev) => prev + 1);

      try {
        await updateMediaFolder(item.id, targetFolder);
        queryClient.invalidateQueries({ queryKey: ["media-stats"] });
        queryClient.invalidateQueries({ queryKey: ["media-recent"] });
        queryClient.invalidateQueries({ queryKey: ["media"] });
        queryClient.invalidateQueries({ queryKey: ["folders"] });
      } catch {
        toast.error(t("media.swipeError"));
      }
    },
    [media, currentIndex, queryClient, t]
  );

  const handleButtonSwipe = (direction: "left" | "right") => {
    handleSwipe(direction);
  };

  const remaining = media ? media.length - currentIndex : 0;
  const visibleCards = media?.slice(currentIndex, currentIndex + 2) ?? [];

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={() => router.push("/media")}
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
              onClick={() => router.push("/media")}
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
              />
            ))
            .reverse()
        )}
      </div>

      {/* Bottom Buttons */}
      {remaining > 0 && (
        <div className="relative z-20 flex items-center justify-center gap-8 pb-10">
          <button
            onClick={() => handleButtonSwipe("left")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border-2 border-red-500 text-red-500 transition-all hover:bg-red-500 hover:text-white active:scale-90"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => handleButtonSwipe("right")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border-2 border-green-500 text-green-500 transition-all hover:bg-green-500 hover:text-white active:scale-90"
          >
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
