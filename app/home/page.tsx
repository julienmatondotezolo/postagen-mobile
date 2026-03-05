"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAllPlans, deletePlan, type Plan } from "@/lib/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMediaStats, getMedia, uploadMedia, type MediaRecord } from "@/lib/api";
import { compressFiles } from "@/lib/compress";
import toast from "react-hot-toast";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

interface DeleteModalState {
  isOpen: boolean;
  plan: Plan | null;
}

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    plan: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Media stats
  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
  });

  // Recent media
  const { data: recentMedia } = useQuery({
    queryKey: ["media-recent"],
    queryFn: () => getMedia("all", 8),
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const allPlans = await getAllPlans();
      setPlans(allPlans);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      toast.loading(t("dashboard.uploading"), { id: "quick-upload" });

      const compressed = await compressFiles(Array.from(fileList));
      if (compressed.length === 0) {
        toast.error(t("dashboard.uploadFailed"), { id: "quick-upload" });
        return;
      }

      const formData = new FormData();
      for (const file of compressed) {
        formData.append("files", file);
      }

      await uploadMedia(formData);

      toast.success(
        `${compressed.length} ${t("dashboard.filesUploaded")}`,
        { id: "quick-upload" }
      );

      // Refresh stats and recent media
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      queryClient.invalidateQueries({ queryKey: ["media-recent"] });
    } catch (error) {
      console.error("Quick upload error:", error);
      toast.error(t("dashboard.uploadFailed"), { id: "quick-upload" });
    } finally {
      setIsUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, plan: Plan) => {
      e.stopPropagation();
      setDeleteModal({ isOpen: true, plan });
    },
    []
  );

  const handleConfirmDelete = async () => {
    if (!deleteModal.plan) return;
    setIsDeleting(true);
    try {
      await deletePlan(deleteModal.plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== deleteModal.plan!.id));
      toast.success(t("home.planDeleted"));
      setDeleteModal({ isOpen: false, plan: null });
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(t("home.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, plan: null });
  };

  const getStatusColor = (status: Plan["status"]) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-600";
      case "Scheduled":
        return "bg-blue-100 text-blue-600";
      case "Published":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusIcon = (status: Plan["status"]) => {
    switch (status) {
      case "Draft":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "Scheduled":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "Published":
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const displayPlans = plans.slice(0, 3);

  return (
    <>
      <div className="min-h-screen bg-mood-plan pb-28">
        <div className="mx-auto max-w-md px-6 py-8">
          {/* Logo + Greeting */}
          <div className="mb-8">
            <Image
              src="/PostaGen-Logo.png"
              alt="Postagène Logo"
              width={140}
              height={40}
              className="h-auto w-auto mb-6"
              priority
            />
            <h1 className="text-3xl font-bold text-gray-900">
              {t("dashboard.title")}
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-50">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
              <p className="text-xs text-gray-500">{t("dashboard.totalMedia")}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-50">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                <svg className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.liked ?? 0}</p>
              <p className="text-xs text-gray-500">{t("dashboard.liked")}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-50">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
              <p className="text-xs text-gray-500">{t("dashboard.plans")}</p>
            </div>
          </div>

          {/* Create New Plan CTA */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/create")}
              className="w-full rounded-[24px] bg-linear-to-br from-purple-500 via-purple-600 to-indigo-600 p-5 text-left shadow-xl shadow-purple-200/50 transition-all hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {t("dashboard.createPlan")}
                    </h3>
                    <p className="text-sm text-purple-100">
                      {t("dashboard.createPlanDesc")}
                    </p>
                  </div>
                </div>
                <svg className="h-5 w-5 text-white/80 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          </div>

          {/* Quick Upload */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-900">
              {t("dashboard.quickUpload")}
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full rounded-2xl border-2 border-dashed border-purple-200 bg-white/60 p-6 text-center transition-all hover:border-purple-400 hover:bg-purple-50/50 active:scale-[0.98] disabled:opacity-50"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
                  <p className="text-sm font-medium text-purple-600">
                    {t("dashboard.uploading")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("dashboard.tapToUpload")}
                  </p>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,image/heic,image/heif,video/*,.heic,.heif"
              onChange={handleQuickUpload}
              className="hidden"
            />
          </div>

          {/* Recent Media */}
          {recentMedia && recentMedia.length > 0 && (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {t("dashboard.recentMedia")}
                </h2>
                <button
                  onClick={() => router.push("/media")}
                  className="text-sm font-semibold text-purple-600"
                >
                  {t("dashboard.seeAll")}
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {recentMedia.map((media: MediaRecord) => (
                  <div
                    key={media.id}
                    className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-sm"
                  >
                    {media.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={media.url}
                        alt={media.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="relative h-full w-full">
                        <video
                          src={media.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
                            <svg className="h-4 w-4 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Folder indicator */}
                    {media.folder === "liked" && (
                      <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plans */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {t("dashboard.myPlans")}
              </h2>
              {plans.length > 3 && (
                <button
                  onClick={() => router.push("/plans")}
                  className="text-sm font-semibold text-purple-600"
                >
                  {t("dashboard.seeAll")}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
                <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>
              </div>
            ) : displayPlans.length === 0 ? (
              <div className="rounded-2xl bg-white/60 border border-gray-100 p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
                    <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-1 text-base font-bold text-gray-900">{t("home.noPlan")}</h3>
                <p className="mb-4 text-sm text-gray-500">{t("home.noPlanDesc")}</p>
                <button
                  onClick={() => router.push("/create")}
                  className="rounded-2xl bg-linear-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-purple-700"
                >
                  {t("home.createFirst")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => router.push(`/plan/${plan.id}`)}
                    className="group relative overflow-hidden rounded-[24px] bg-white border border-gray-50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="mb-0.5 text-base font-bold text-gray-900">{plan.name}</h3>
                          <p className="text-xs text-gray-500">
                            {formatDate(plan.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusColor(plan.status)}`}>
                            {getStatusIcon(plan.status)}
                            {plan.status}
                          </div>
                          <button
                            onClick={(e) => handleDeleteClick(e, plan)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                            aria-label="Delete plan"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {plan.description && (
                        <p className="mb-3 text-sm text-gray-600 line-clamp-1">{plan.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">{plan.mediaIds.length} media</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="font-medium">{plan.postIds.length} {t("home.posts")}</span>
                        </div>
                        {plan.isActive && (
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-purple-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                            <span className="text-[10px] font-bold">Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.plan && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6 backdrop-enter"
          onClick={handleCancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>

            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              {t("home.deletePlan")}
            </h3>
            <p className="mb-8 text-center text-sm text-gray-500 leading-relaxed">
              {t("home.deleteConfirm")}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  t("home.deletePlan")
                )}
              </button>
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="w-full rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
