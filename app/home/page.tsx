"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getAllPlans, deletePlan, type Plan } from "@/lib/db";
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    plan: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <>
      <div className="min-h-screen bg-mood-plan pb-28">
        <div className="mx-auto max-w-md px-6 py-8">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/PostaGen-Logo.png"
              alt="Postagène Logo"
              width={140}
              height={40}
              className="h-auto w-auto mb-6"
              priority
            />
            <p className="mb-1 text-sm font-medium text-gray-500">{t("home.title")}</p>
            <h1 className="text-4xl font-bold text-gray-900">
              {t("home.title")}
            </h1>
          </div>

          {/* Plans List */}
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
                  <svg className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">{t("home.noPlan")}</h3>
              <p className="mb-6 text-sm text-gray-500">
                {t("home.noPlanDesc")}
              </p>
              <button
                onClick={() => router.push("/create")}
                className="rounded-2xl bg-linear-to-r from-purple-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {t("home.createFirst")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => router.push(`/plan/${plan.id}`)}
                  className="group relative overflow-hidden rounded-[32px] bg-white border border-gray-50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="p-6">
                    {/* Plan Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="mb-1 text-lg font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500">Created {formatDate(plan.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusColor(plan.status)}`}>
                          {getStatusIcon(plan.status)}
                          {plan.status}
                        </div>
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteClick(e, plan)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                          aria-label="Delete plan"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Plan Description */}
                    {plan.description && (
                      <p className="mb-4 text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                    )}

                    {/* Plan Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{plan.mediaIds.length} media</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{plan.postIds.length} {t("home.posts")}</span>
                      </div>
                      {plan.isActive && (
                        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-purple-50 px-2 py-1 text-purple-600">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-600"></div>
                          <span className="font-bold">Active</span>
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
            {/* Trash Icon */}
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
