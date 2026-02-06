"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  getPlanById,
  getPostsByIds,
  getAllMedia,
  getMediaUrl,
  deletePlan,
  type Post,
  type MediaFile,
  type Plan,
} from "@/lib/db";
import toast from "react-hot-toast";

// Generate 7 days starting from today
const generateDays = () => {
  const days = [];
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayFull = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayIndex = date.getDay();

    days.push({
      label: dayLabels[dayIndex],
      full: dayFull[dayIndex],
      date: date.toISOString().split("T")[0],
      num: date.getDate(),
    });
  }

  return days;
};

export default function VisualPlan() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [posts, setPosts] = useState<(Post & { media?: MediaFile })[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [days, setDays] = useState<
    Array<{ label: string; full: string; date: string; num: number }>
  >([]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDays(generateDays());
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = (element: HTMLDivElement) => {
    const { scrollLeft, scrollWidth, clientWidth } = element;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Initialize scroll position check
  useEffect(() => {
    if (scrollContainerRef.current && days.length > 0) {
      checkScrollPosition(scrollContainerRef.current);
    }
  }, [days]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const dayWidth = 76;
    const scrollAmount = dayWidth * 5;

    const newScrollLeft =
      direction === "right"
        ? scrollContainerRef.current.scrollLeft + scrollAmount
        : scrollContainerRef.current.scrollLeft - scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });

    setTimeout(() => {
      if (scrollContainerRef.current) {
        checkScrollPosition(scrollContainerRef.current);
      }
    }, 300);
  };

  const loadPlan = async () => {
    try {
      const planData = await getPlanById(planId);
      if (!planData) {
        router.push("/home");
        return;
      }

      setPlan(planData);

      const [planPosts, allMedia] = await Promise.all([
        getPostsByIds(planData.postIds),
        getAllMedia(),
      ]);

      const mediaMap = new Map(allMedia.map((m) => [m.id, m]));
      const postsWithMedia = planPosts.map((post) => ({
        ...post,
        media: mediaMap.get(post.mediaId),
      }));

      setPosts(postsWithMedia);
    } catch (error) {
      console.error("Error loading plan:", error);
    }
  };

  useEffect(() => {
    if (posts.length > 0 && !selectedDate) {
      setSelectedDate(posts[0].scheduledDate);
    } else if (days.length > 0 && !selectedDate) {
      setSelectedDate(days[0].date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, days]);

  const handleDeletePlan = async () => {
    if (!plan) return;
    setIsDeleting(true);
    try {
      await deletePlan(plan.id);
      toast.success("Plan deleted");
      router.push("/home");
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const filteredPosts = posts.filter(
    (post) => post.scheduledDate === selectedDate
  );

  const getColorForTime = (time: string) => {
    if (time.includes("12:00")) return "bg-purple-500";
    if (time.includes("06:30")) return "bg-orange-400";
    return "bg-blue-400";
  };

  return (
    <>
      <div className="min-h-screen bg-mood-plan pb-28">
        <div className="mx-auto max-w-md px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/home")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
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
                {plan && (
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      plan.status === "Draft"
                        ? "bg-gray-100 text-gray-600"
                        : plan.status === "Scheduled"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-600"
                    }`}
                  >
                    {plan.status}
                  </div>
                )}
              </div>
              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-red-50 hover:text-red-500 transition-all text-gray-400"
                aria-label="Delete plan"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              {plan?.description || "Weekly Strategy"}
            </p>
            <h1 className="text-4xl font-bold text-gray-900">
              {plan?.name || (
                <span>
                  Visual{" "}
                  <span className="font-serif italic font-normal text-violet-600">
                    Plan
                  </span>
                </span>
              )}
            </h1>
          </div>

          {/* Day Selector */}
          <div className="mb-8 relative">
            {/* Left Arrow */}
            {showLeftArrow && (
              <button
                onClick={() => handleScroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-all active:scale-95"
                aria-label="Scroll left"
              >
                <svg
                  className="h-5 w-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}

            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onScroll={(e) => checkScrollPosition(e.currentTarget)}
            >
              {days.map((day, index) => {
                const isSelected = selectedDate === day.date;
                const hasPost = posts.some(
                  (post) => post.scheduledDate === day.date
                );
                return (
                  <button
                    key={`${day.label}-${index}`}
                    onClick={() => setSelectedDate(day.date)}
                    className={`shrink-0 flex flex-col items-center justify-center w-16 h-24 rounded-[32px] transition-all hover:scale-105 ${
                      isSelected
                        ? "bg-black text-white shadow-xl shadow-gray-200"
                        : "bg-white/60 backdrop-blur-sm text-gray-400 border border-white hover:border-gray-200 hover:shadow-md"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold mb-2 ${isSelected ? "text-gray-400" : "text-gray-300"}`}
                    >
                      {day.label}
                    </span>
                    <span className="text-xl font-bold">{day.num}</span>
                    {isSelected && (
                      <div className="mt-2 h-1 w-1 rounded-full bg-white"></div>
                    )}
                    {!isSelected && hasPost && (
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-500"></div>
                    )}
                  </button>
                );
              })}

              {/* Add More Days Button */}
              <button
                className="shrink-0 flex items-center justify-center w-16 h-24 rounded-[32px] bg-pink-500 text-white shadow-lg hover:bg-pink-600 hover:scale-105 hover:shadow-xl transition-all active:scale-95"
                onClick={() => {
                  console.log("Add more days");
                }}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>

            {/* Right Arrow */}
            {showRightArrow && (
              <button
                onClick={() => handleScroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-all active:scale-95"
                aria-label="Scroll right"
              >
                <svg
                  className="h-5 w-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-gray-500">No posts yet</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-12 text-center bg-white/40 backdrop-blur-sm rounded-[40px] border border-white">
                <p className="text-gray-400 font-medium">
                  No posts scheduled for this day
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-[40px] bg-white border border-gray-50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-6">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${getColorForTime(post.scheduledTime)}`}
                      ></div>
                      <span className="text-xs font-bold text-gray-400 tracking-wide">
                        {post.scheduledTime} •{" "}
                        {post.dayName?.toUpperCase() || "MONDAY"}
                      </span>
                    </div>
                    <button className="text-gray-300">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Image */}
                  {post.media && (
                    <div className="relative mx-4 mt-4 aspect-4/3 overflow-hidden rounded-[32px] bg-gray-50 group">
                      {post.media.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getMediaUrl(post.media)}
                          alt="Post"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <svg
                            className="h-12 w-12 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                        <button className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/90 py-3 text-sm font-bold text-gray-900 backdrop-blur-md shadow-sm active:scale-[0.98] transition-all hover:bg-white hover:shadow-md">
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Swap
                        </button>
                        <button
                          onClick={() => router.push(`/post/${post.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/90 py-3 text-sm font-bold text-gray-900 backdrop-blur-md shadow-sm active:scale-[0.98] transition-all hover:bg-white hover:shadow-md"
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
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Title and Description */}
                  <div className="px-6 pb-8 pt-6">
                    <h3 className="mb-2 text-xl font-bold text-gray-900 leading-tight">
                      {post.caption.split(".")[0] || "New Post"}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {post.caption}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && plan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl slide-up">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <svg
                  className="h-7 w-7 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
            </div>

            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              Delete Plan?
            </h3>
            <p className="mb-6 text-center text-sm text-gray-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">
                &ldquo;{plan.name}&rdquo;
              </span>
              ? This will permanently remove{" "}
              <span className="font-semibold text-red-500">
                {plan.postIds.length} posts
              </span>
              .
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
