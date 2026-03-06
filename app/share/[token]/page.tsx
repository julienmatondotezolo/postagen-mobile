"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSharedFolder } from "@/lib/api";
import type { MediaRecord } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";

export default function ShareGalleryPage() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const haptics = useHaptics();
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shared-folder", token],
    queryFn: () => getSharedFolder(token),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mood-plan">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-r-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mood-plan px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">{t("share.notFound")}</h2>
      </div>
    );
  }

  const { folder, owner_name, media } = data;

  return (
    <div className="min-h-screen bg-mood-plan pb-28">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${folder.color}20` }}
          >
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill={folder.color}>
              <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{folder.name}</h1>
          <p className="text-sm text-gray-500">
            {t("share.by")} {owner_name}
          </p>
        </div>

        {/* Media Grid */}
        {media.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">{t("media.noMedia")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {media.map((item: MediaRecord) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm cursor-pointer"
                onClick={() => { haptics.tap(); setFullscreenIndex(media.indexOf(item)); }}
              >
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
                ) : (
                  <div className="relative h-full w-full">
                    <video src={item.url} className="h-full w-full object-cover" preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                        <svg className="h-5 w-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swipe FAB */}
      {media.length > 0 && (
        <button
          onClick={() => { haptics.tap(); router.push(`/share/${token}/swipe`); }}
          className="fixed bottom-8 right-6 z-40 flex items-center gap-2 rounded-full bg-purple-600 px-6 py-4 text-white shadow-xl shadow-purple-300/50 transition-all hover:scale-105 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span className="font-semibold">{t("share.swipe")}</span>
        </button>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenIndex !== null && media[fullscreenIndex] && (() => {
        const currentMedia = media[fullscreenIndex];
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
            onClick={() => { haptics.tap(); setFullscreenIndex(null); }}
          >
            <button
              onClick={() => { haptics.tap(); setFullscreenIndex(null); }}
              className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Prev button */}
            {fullscreenIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); haptics.tap(); setFullscreenIndex(fullscreenIndex - 1); }}
                className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
              >
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next button */}
            {fullscreenIndex < media.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); haptics.tap(); setFullscreenIndex(fullscreenIndex + 1); }}
                className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
              >
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {currentMedia.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentMedia.url}
                alt={currentMedia.filename}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={currentMedia.url}
                className="max-h-full max-w-full object-contain"
                controls
                autoPlay
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}
