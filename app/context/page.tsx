"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";

const QUICK_CHIPS = [
  { key: "liveMusic", emoji: "🎵" },
  { key: "newMenu", emoji: "🍽️" },
  { key: "happyHour", emoji: "🍹" },
  { key: "newHours", emoji: "🕐" },
  { key: "holiday", emoji: "🎉" },
  { key: "promo", emoji: "💰" },
];

const LANGUAGES = [
  { code: "nl" as const, label: "NL" },
  { code: "fr" as const, label: "FR" },
  { code: "en" as const, label: "EN" },
];

export default function ContextPage() {
  const { t } = useI18n();
  const router = useRouter();
  const haptics = useHaptics();
  const [language, setLanguage] = useState<"nl" | "fr" | "en">("nl");
  const [weeklyContext, setWeeklyContext] = useState("");
  const [specialMessage, setSpecialMessage] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleChipToggle = (chipLabel: string) => {
    const current = weeklyContext.trim();
    if (current.includes(chipLabel)) {
      // Remove chip
      setWeeklyContext(
        current
          .replace(chipLabel, "")
          .replace(/,\s*,/g, ",")
          .replace(/^,\s*|,\s*$/g, "")
          .trim()
      );
    } else {
      // Add chip
      setWeeklyContext(current ? `${current}, ${chipLabel}` : chipLabel);
    }
  };

  const handleGenerate = () => {
    if (isNavigating) return;
    setIsNavigating(true);

    // Store context in sessionStorage
    sessionStorage.setItem("postagen-language", language);
    sessionStorage.setItem("postagen-weeklyContext", weeklyContext);
    sessionStorage.setItem("postagen-specialMessage", specialMessage);

    router.push("/processing");
  };

  return (
    <div className="min-h-screen bg-mood-upload px-6 py-8 pb-48">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => { haptics.tap(); router.back(); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium text-purple-600">
              {t("context.step")}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            {t("context.title")}
          </h1>
          <p className="text-base text-gray-600">
            {t("context.subtitle")}
          </p>
        </div>

        {/* Language Selector */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-bold text-gray-900">
            {t("context.languageLabel")}
          </label>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { haptics.tap(); setLanguage(lang.code); }}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-all ${
                  language === lang.code
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-200"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Events */}
        <div className="mb-6">
          <label className="mb-3 block text-sm font-bold text-gray-900">
            {t("context.eventsLabel")}
          </label>
          <textarea
            value={weeklyContext}
            onChange={(e) => setWeeklyContext(e.target.value)}
            onFocus={() => haptics.tap()}
            placeholder={t("context.eventsPlaceholder")}
            rows={3}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
          />
          {/* Quick Chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => {
              const label = t(`context.chip_${chip.key}`);
              const isActive = weeklyContext.includes(label);
              return (
                <button
                  key={chip.key}
                  onClick={() => { haptics.tap(); handleChipToggle(label); }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {chip.emoji} {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Message */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-bold text-gray-900">
            {t("context.messageLabel")}
          </label>
          <textarea
            value={specialMessage}
            onChange={(e) => setSpecialMessage(e.target.value)}
            onFocus={() => haptics.tap()}
            placeholder={t("context.messagePlaceholder")}
            rows={3}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
          />
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-mood-upload via-mood-upload to-transparent pt-6 pb-12 px-6 pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          <button
            onClick={() => { haptics.success(); handleGenerate(); }}
            disabled={isNavigating}
            className="w-full rounded-2xl bg-gray-900 px-6 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>{t("context.generateBtn")}</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
