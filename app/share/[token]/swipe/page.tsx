"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSharedFolder, getShareVotes, submitShareVote, type MediaRecord } from "@/lib/api";
import SwipeCard from "@/components/SwipeCard";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";
import toast from "react-hot-toast";

export default function ShareSwipePage() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [voterName, setVoterName] = useState<string>("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaRecord | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const historyRef = useRef<Array<{ mediaId: string; index: number }>>([]);
  const haptics = useHaptics();

  // Check sessionStorage for existing name
  useEffect(() => {
    const saved = sessionStorage.getItem(`share_voter_${token}`);
    if (saved) {
      setVoterName(saved);
      setNameSubmitted(true);
    }
  }, [token]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shared-folder", token],
    queryFn: () => getSharedFolder(token),
    enabled: !!token,
  });

  // Load existing votes when name is submitted
  const { data: existingVotes } = useQuery({
    queryKey: ["share-votes", token, voterName],
    queryFn: () => getShareVotes(token, voterName),
    enabled: nameSubmitted && !!voterName,
  });

  // Build list of already-voted media IDs (only on initial load)
  const initialVotesLoaded = useRef(false);
  useEffect(() => {
    if (existingVotes?.votes && !initialVotesLoaded.current) {
      initialVotesLoaded.current = true;
      setVotedIds(new Set(existingVotes.votes.map((v) => v.media_id)));
    }
  }, [existingVotes]);

  const handleNameSubmit = () => {
    if (!voterName.trim()) return;
    const name = voterName.trim();
    setVoterName(name);
    sessionStorage.setItem(`share_voter_${token}`, name);
    setNameSubmitted(true);
  };

  // Filter out already-voted media
  const unvotedMedia = data?.media.filter((m) => !votedIds.has(m.id)) ?? [];
  const remaining = unvotedMedia.length - currentIndex;
  const visibleCards = unvotedMedia.slice(currentIndex, currentIndex + 2);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (currentIndex >= unvotedMedia.length) return;

      const item = unvotedMedia[currentIndex];
      const vote = direction === "right" ? "liked" : "unliked";
      if (direction === "right") haptics.success(); else haptics.error();

      historyRef.current.push({ mediaId: item.id, index: currentIndex });
      setCurrentIndex((prev) => prev + 1);

      try {
        await submitShareVote(token, {
          voter_name: voterName,
          media_id: item.id,
          vote,
        });
      } catch {
        haptics.error();
        toast.error(t("share.voteError"));
      }
    },
    [unvotedMedia, currentIndex, token, voterName, t, haptics]
  );

  const handleUndo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return;
    haptics.tap();
    setCurrentIndex(last.index);
    // Note: for share swipe we don't delete the vote from DB — the next swipe will upsert/overwrite
  }, []);

  const canUndo = historyRef.current.length > 0;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-white">{t("share.notFound")}</h2>
      </div>
    );
  }

  // Name gate
  if (!nameSubmitted) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${data.folder.color}20` }}
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill={data.folder.color}>
              <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-white">{data.folder.name}</h1>
          <p className="mb-8 text-center text-sm text-white/50">{t("share.enterName")}</p>
          <input
            type="text"
            value={voterName}
            onChange={(e) => setVoterName(e.target.value)}
            placeholder={t("share.namePlaceholder")}
            className="mb-4 w-full rounded-2xl bg-white/10 px-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
          />
          <button
            onClick={handleNameSubmit}
            disabled={!voterName.trim()}
            className="w-full rounded-2xl bg-purple-600 py-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          >
            {t("share.start")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-8 pb-4">
        <button
          onClick={() => router.push(`/share/${token}`)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
        >
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">{data.folder.name}</h1>
          <p className="text-xs text-white/50">
            {remaining} {t("share.remaining")}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Card Area */}
      <div className="relative flex-1 mx-6 mb-4">
        {remaining <= 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{t("share.allDone")}</h2>
            <p className="text-white/50">{t("share.allDoneDesc")}</p>
            <button
              onClick={() => router.push(`/share/${token}`)}
              className="mt-8 rounded-2xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
            >
              {t("share.backToGallery")}
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

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            onClick={() => setFullscreenMedia(null)}
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
