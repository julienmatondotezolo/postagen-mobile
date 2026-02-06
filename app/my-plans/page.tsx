"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllPlans, getPlanWithData, deletePlan, setActivePlan, getMediaUrl, type Plan, type Post, type MediaFile } from "@/lib/db";

type FilterType = "all" | "drafts" | "published";

interface PlanWithData {
  plan: Plan;
  posts: (Post & { media?: MediaFile })[];
}

export default function MyPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithData[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<PlanWithData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    filterPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, searchQuery, activeFilter]);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const allPlans = await getAllPlans();
      const plansWithData: PlanWithData[] = [];

      for (const plan of allPlans) {
        const planData = await getPlanWithData(plan.id);
        if (planData) {
          plansWithData.push(planData);
        }
      }

      setPlans(plansWithData);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlans = () => {
    let filtered = [...plans];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((planData) =>
        planData.plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        planData.plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (activeFilter === "published") {
      filtered = filtered.filter((planData) => planData.plan.isActive);
    } else if (activeFilter === "drafts") {
      filtered = filtered.filter((planData) => !planData.plan.isActive);
    }

    setFilteredPlans(filtered);
  };

  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this plan? This will also delete all associated posts.")) {
      try {
        await deletePlan(planId);
        await loadPlans();
      } catch (error) {
        console.error("Error deleting plan:", error);
      }
    }
  };

  const handleSetActivePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setActivePlan(planId);
      await loadPlans();
    } catch (error) {
      console.error("Error setting active plan:", error);
    }
  };

  const handleViewPlan = (planId: string) => {
    router.push(`/plan?planId=${planId}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPreviewImages = (posts: (Post & { media?: MediaFile })[]) => {
    return posts
      .filter((post) => post.media)
      .slice(0, 3)
      .map((post) => post.media!);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-24">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-sm font-medium text-gray-500">Postagène</p>
          <h1 className="text-4xl font-bold text-gray-900">
            My <span className="font-serif italic font-normal text-violet-600">Plans</span>
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-3xl bg-white/60 backdrop-blur-sm border border-white px-6 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
            />
            <svg
              className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              activeFilter === "all"
                ? "bg-black text-white shadow-lg"
                : "bg-white/60 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("drafts")}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              activeFilter === "drafts"
                ? "bg-black text-white shadow-lg"
                : "bg-white/60 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveFilter("published")}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              activeFilter === "published"
                ? "bg-black text-white shadow-lg"
                : "bg-white/60 text-gray-600 hover:bg-white hover:shadow-md"
            }`}
          >
            Published
          </button>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Loading plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
                <svg
                  className="h-10 w-10 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">No plans found</h3>
            <p className="mb-6 text-gray-500">
              {searchQuery ? "Try adjusting your search" : "Create your first content plan to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push("/upload")}
                className="rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5"
              >
                Create New Plan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPlans.map(({ plan, posts }) => {
              const previewImages = getPreviewImages(posts);
              const remainingCount = Math.max(0, posts.length - 3);

              return (
                <div
                  key={plan.id}
                  onClick={() => handleViewPlan(plan.id)}
                  className="overflow-hidden rounded-[40px] bg-white border border-gray-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                >
                  {/* Preview Images */}
                  <div className="grid grid-cols-3 gap-1 p-4">
                    {previewImages.map((media, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
                      >
                        {media.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getMediaUrl(media)}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-200">
                            <svg
                              className="h-8 w-8 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Remaining count overlay */}
                    {remainingCount > 0 && previewImages.length === 3 && (
                      <div className="absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
                        <span className="text-lg font-bold text-white">+{remainingCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Plan Info */}
                  <div className="px-6 pb-6">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="mb-1 text-xl font-bold text-gray-900 leading-tight">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created on {formatDate(plan.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`ml-3 rounded-full px-3 py-1 text-xs font-bold ${
                          plan.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {plan.isActive ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </div>

                    {plan.description && (
                      <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                        {plan.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPlan(plan.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-all"
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement share functionality
                          alert("Share functionality coming soon!");
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-900 hover:bg-gray-200 transition-all"
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
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => router.push("/upload")}
        className="fixed bottom-28 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-black shadow-2xl transition-all hover:scale-110 hover:shadow-3xl active:scale-95 z-40"
      >
        <svg
          className="h-6 w-6 text-white"
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
  );
}
