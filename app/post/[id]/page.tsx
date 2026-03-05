"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPost, updatePostApi, type ApiPost } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function PostDetail() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<ApiPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const loadPost = async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
      setEditedCaption(data.caption);
    } catch (error) {
      console.error("Error loading post:", error);
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSaveCaption = async () => {
    if (!post) return;
    try {
      await updatePostApi(post.id, { caption: editedCaption });
      setIsEditing(false);
      await loadPost();
    } catch (error) {
      console.error("Error updating caption:", error);
    }
  };

  const handleCopyAndOpen = async (platform: "instagram" | "facebook") => {
    if (!post) return;

    const fullText = `${post.caption}\n\n${post.hashtags.join(" ")}`;

    try {
      await navigator.clipboard.writeText(fullText);

      if (platform === "instagram") {
        window.open("https://www.instagram.com/", "_blank");
      } else {
        window.open("https://www.facebook.com/", "_blank");
      }
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mood-detail">
        <div className="animate-pulse text-purple-600 font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  const formatDate = (dateStr: string, time: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today, ${time}`;
    }
    return `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${time}`;
  };

  return (
    <div className="min-h-screen bg-mood-detail px-6 py-8 pb-24">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-gray-50"
          >
            <svg
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t("plan.postDetails")}</h1>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-gray-50">
            <svg
              className="h-6 w-6 text-gray-700"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Post Preview */}
        <div className="mb-8 rounded-[48px] bg-[#E6D5C3]/40 p-5">
          <div className="relative overflow-hidden rounded-[36px] bg-white shadow-2xl shadow-orange-100/50">
            {post.media_url && (
              <div className="relative aspect-square overflow-hidden">
                {post.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.media_url}
                    alt="Post"
                    className="h-full w-full object-cover"
                  />
                ) : post.media_type === "video" ? (
                  <div className="relative h-full w-full bg-black">
                    {isVideoPlaying ? (
                      <video
                        src={post.media_url}
                        className="h-full w-full object-cover"
                        controls
                        autoPlay
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div
                        className="relative h-full w-full cursor-pointer"
                        onClick={() => setIsVideoPlaying(true)}
                      >
                        {post.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumbnail}
                            alt="Video preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-900 flex items-center justify-center">
                            <p className="text-white text-sm">Video</p>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center hover:bg-black/40 transition-colors">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-2xl hover:scale-110 transition-transform">
                            <svg
                              className="h-10 w-10 text-gray-900 ml-1"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <p className="text-gray-400">Unknown media type</p>
                  </div>
                )}
                {post.is_optimized && (
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-[#4ADE80] px-4 py-1.5 shadow-lg">
                    <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                    <span className="text-[10px] font-black text-white tracking-widest uppercase">
                      AI OPTIMIZED
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Caption Section */}
        <div className="mb-6 rounded-[32px] bg-white p-6 shadow-sm border border-gray-50">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              {t("plan.caption")}
            </span>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-sm font-bold text-purple-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                {t("plan.edit")}
              </button>
            ) : (
              <button
                onClick={handleSaveCaption}
                className="text-sm font-bold text-purple-600"
              >
                {t("common.save")}
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-purple-500 focus:outline-none transition-all hover:border-purple-200"
              rows={4}
            />
          ) : (
            <p className="mb-4 text-sm leading-relaxed text-gray-700 font-medium">
              {post.caption}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="text-sm font-bold text-purple-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Schedule and Sentiment */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-[32px] bg-white p-5 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">
                SCHEDULE
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {post.scheduled_date && post.scheduled_time
                ? formatDate(post.scheduled_date, post.scheduled_time)
                : "Not scheduled"}
            </p>
          </div>
          <div className="rounded-[32px] bg-white p-5 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-purple-400"
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
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">
                SENTIMENT
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {post.sentiment}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => handleCopyAndOpen("instagram")}
            className="w-full rounded-[24px] bg-black px-6 py-5 text-base font-bold text-white shadow-xl shadow-gray-200 transition-all hover:bg-gray-900 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t("plan.copyCaption")} & Instagram
          </button>
          <button
            onClick={() => handleCopyAndOpen("facebook")}
            className="w-full rounded-[24px] bg-white px-6 py-5 text-base font-bold text-gray-900 shadow-lg border border-gray-100 transition-all hover:bg-gray-50 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg
              className="h-6 w-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {t("plan.copyCaption")} & Facebook
          </button>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-center text-[10px] font-bold text-gray-300 tracking-widest leading-relaxed px-8">
          COPYING AUTOMATICALLY SAVES THE CAPTION TO YOUR CLIPBOARD AND LAUNCHES THE PLATFORM
        </p>
      </div>
    </div>
  );
}
