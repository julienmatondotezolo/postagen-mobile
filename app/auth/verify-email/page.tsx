"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useI18n } from "@/lib/i18n";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const status = searchParams.get("status");

  const isSuccess = status === "success";
  const isExpired = status === "expired";
  const isInvalid = status === "invalid";
  const isError = status === "error";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mood-onboarding px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-[32px] bg-white p-8 shadow-sm border border-gray-50 text-center">
          {/* Icon */}
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isSuccess ? "bg-green-50" : "bg-red-50"}`}>
            {isSuccess ? (
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {isSuccess && t("auth.verifySuccess")}
            {isExpired && t("auth.verifyExpired")}
            {(isInvalid || isError) && t("auth.verifyError")}
            {!status && t("auth.verifyChecking")}
          </h2>

          <p className="mb-6 text-sm text-gray-500">
            {isSuccess && t("auth.verifySuccessDesc")}
            {isExpired && t("auth.verifyExpiredDesc")}
            {(isInvalid || isError) && t("auth.verifyErrorDesc")}
          </p>

          <Link
            href={isSuccess ? "/home" : "/auth/login"}
            className="inline-block w-full rounded-2xl bg-[#8B5CF6] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 active:scale-[0.98]"
          >
            {isSuccess ? t("auth.goToApp") : t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-mood-onboarding">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-r-transparent" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
