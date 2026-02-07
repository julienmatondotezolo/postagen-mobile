"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  getAllPosts,
  getAllMedia,
  getAllPlans,
  getMediaUrl,
  type Post,
  type MediaFile,
  type Plan,
} from "@/lib/db";

interface PostWithContext extends Post {
  media?: MediaFile;
  planName: string;
}

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // Start from Monday
  const monday = new Date(baseDate);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const { t } = useI18n();
  const DAY_LABELS = [t("calendar.mon"), t("calendar.tue"), t("calendar.wed"), t("calendar.thu"), t("calendar.fri"), t("calendar.sat"), t("calendar.sun")];
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateKey(new Date())
  );
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDays(base);
  }, [weekOffset]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allPosts, allMedia, allPlans] = await Promise.all([
        getAllPosts(),
        getAllMedia(),
        getAllPlans(),
      ]);

      const mediaMap = new Map<string, MediaFile>(
        allMedia.map((m) => [m.id, m])
      );

      // Build a map from postId -> planName
      const postToPlan = new Map<string, string>();
      allPlans.forEach((plan: Plan) => {
        plan.postIds.forEach((pid) => {
          postToPlan.set(pid, plan.name);
        });
      });

      const enriched: PostWithContext[] = allPosts.map((post) => ({
        ...post,
        media: mediaMap.get(post.mediaId),
        planName: postToPlan.get(post.id) || t("calendar.unassigned"),
      }));

      setPosts(enriched);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const postsByDate = useMemo(() => {
    const map = new Map<string, PostWithContext[]>();
    posts.forEach((post) => {
      const existing = map.get(post.scheduledDate) || [];
      existing.push(post);
      map.set(post.scheduledDate, existing);
    });
    return map;
  }, [posts]);

  const selectedDayPosts = useMemo(
    () => postsByDate.get(selectedDate) || [],
    [postsByDate, selectedDate]
  );

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDateKey(date) === formatDateKey(today);
  };

  const monthLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0];
    const last = weekDays[6];
    const fMonth = first.toLocaleDateString("en-US", { month: "long" });
    const lMonth = last.toLocaleDateString("en-US", { month: "long" });
    const year = first.getFullYear();
    if (fMonth === lMonth) return `${fMonth} ${year}`;
    return `${fMonth} – ${lMonth} ${year}`;
  }, [weekDays]);

  return (
    <div className="min-h-screen bg-mood-plan pb-28">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {t("calendar.title")}
          </h1>
        </div>

        {/* Week Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {monthLabel}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Week View */}
        <div className="mb-8 grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dateKey = formatDateKey(day);
            const isSelected = selectedDate === dateKey;
            const dayPosts = postsByDate.get(dateKey) || [];
            const hasPost = dayPosts.length > 0;
            const today = isToday(day);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`flex flex-col items-center justify-center rounded-2xl py-3 transition-all ${
                  isSelected
                    ? "bg-[#8B5CF6] text-white shadow-lg shadow-purple-200"
                    : today
                      ? "bg-purple-50 text-gray-800"
                      : "bg-white/60 text-gray-500 hover:bg-white hover:shadow-sm"
                }`}
              >
                <span
                  className={`text-[10px] font-bold mb-1 ${
                    isSelected
                      ? "text-purple-200"
                      : "text-gray-400"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="text-base font-bold">{day.getDate()}</span>
                {/* Post dots */}
                <div className="mt-1.5 flex gap-0.5 h-1.5">
                  {hasPost ? (
                    dayPosts.slice(0, 3).map((_, j) => (
                      <div
                        key={j}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-white/80" : "bg-[#8B5CF6]"
                        }`}
                      />
                    ))
                  ) : (
                    <div className="h-1.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Label */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <span className="text-sm font-medium text-gray-400">
            {selectedDayPosts.length} post
            {selectedDayPosts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Posts for Selected Day */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-r-transparent" />
            <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>
          </div>
        ) : selectedDayPosts.length === 0 ? (
          <div className="py-12 text-center rounded-3xl bg-white/40 backdrop-blur-sm border border-white">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <svg
                  className="h-8 w-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 font-medium">
              {t("calendar.noPosts")}
            </p>
            <p className="mt-1 text-xs text-gray-300">
              Create a plan to fill your calendar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                {post.media ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 relative">
                    {post.media.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(post.media)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : post.media.type === "video" && post.thumbnail ? (
                      // Show video thumbnail
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.thumbnail}
                          alt="Video thumbnail"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90">
                            <svg
                              className="h-3 w-3 text-gray-900 ml-0.5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <svg
                          className="h-6 w-6 text-gray-300"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                    <svg
                      className="h-6 w-6 text-purple-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#8B5CF6]">
                      {post.scheduledTime}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs font-medium text-gray-400 truncate">
                      {post.planName}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                    {post.caption}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex shrink-0 items-center">
                  <svg
                    className="h-4 w-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
