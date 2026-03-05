"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function VerifyRequiredPage() {
  const { user, resendVerification, logout } = useAuth();
  const { t } = useI18n();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setIsSending(true);
    setError("");
    const result = await resendVerification();
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
    setIsSending(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mood-onboarding px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-[32px] bg-white p-8 shadow-sm border border-gray-50 text-center">
          {/* Mail icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
            <svg className="h-10 w-10 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {t("auth.verifyRequiredTitle")}
          </h2>

          <p className="mb-2 text-sm text-gray-500">
            {t("auth.verifyRequiredDesc")}
          </p>

          {user && (
            <p className="mb-6 text-sm font-semibold text-[#8B5CF6]">
              {user.email}
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {sent && !error && (
            <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
              {t("auth.verifyResent")}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={isSending}
            className="mb-3 w-full rounded-2xl bg-[#8B5CF6] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 active:scale-[0.98] disabled:opacity-50"
          >
            {isSending ? t("common.loading") : t("auth.resendBtn")}
          </button>

          <button
            onClick={logout}
            className="w-full rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}
