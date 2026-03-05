"use client";

import { useUpload } from "@/lib/upload";
import { useI18n } from "@/lib/i18n";

export default function UploadPopup() {
  const { t } = useI18n();
  const upload = useUpload();

  if (!upload.popupVisible) return null;

  // Minimized state — small circle
  if (upload.popupMinimized) {
    return (
      <button
        onClick={upload.expandPopup}
        className="fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {upload.percent}%
      </button>
    );
  }

  // Done state
  if (upload.showDoneMessage) {
    return (
      <div className="fixed bottom-24 left-4 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-900">{t("upload.allUploaded")}</p>
          </div>
          <button
            onClick={upload.dismissPopup}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {upload.totalCount} {t("dashboard.filesUploaded")}
        </p>
      </div>
    );
  }

  // Uploading state
  return (
    <div className="fixed bottom-24 left-4 z-50 w-72 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">{t("upload.uploading")}</p>
        <button
          onClick={upload.minimizePopup}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-purple-100">
        <div
          className="h-full rounded-full bg-purple-600 transition-all duration-300"
          style={{ width: `${upload.percent}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">
        {upload.completedCount} / {upload.totalCount} {t("upload.filesOf")}
      </p>
    </div>
  );
}
