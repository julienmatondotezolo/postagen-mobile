"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { saveBrandIdentity, getBrandIdentity } from "@/lib/db";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

interface AnalyzeBrandResponse {
  businessName: string;
  description: string;
  tone: string;
  menuHighlights: string[];
}

export default function IdentitySetup() {
  const { t } = useI18n();
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  // Load any previously saved brand identity
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const existing = await getBrandIdentity();
        if (existing) {
          setWebsiteUrl(existing.websiteUrl || "");
          setDescription(existing.description || "");
          setBusinessName(existing.businessName || "");
        }
      } catch (error) {
        console.error("Error loading existing brand data:", error);
      } finally {
        setIsLoadingExisting(false);
      }
    };
    loadExisting();
  }, []);

  /**
   * Call the backend to scrape and analyze the website URL and/or description.
   */
  const handleAnalyzeUrl = async () => {
    if (!websiteUrl.trim() && !description.trim()) {
      toast.error(t("create.noInput"));
      return;
    }

    setIsAnalyzing(true);
    try {
      const payload: { url?: string; description?: string } = {};
      if (websiteUrl.trim()) payload.url = websiteUrl.trim();
      if (description.trim()) payload.description = description.trim();

      const res = await fetch(`${API_BASE_URL}/api/brand/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout for scraping + GPT
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg =
          errorData?.message ||
          t("create.analyzeError");
        toast.error(msg, { duration: 5000 });
        return;
      }

      const data: AnalyzeBrandResponse = await res.json();

      // Fill in the fields with the analysis
      if (data.businessName) setBusinessName(data.businessName);
      if (data.description) setDescription(data.description);

      toast.success(
        `${data.businessName || ""} ${t("create.analyzeSuccess")}`,
        { duration: 2000 }
      );
    } catch (error) {
      console.error("Error analyzing brand:", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error(t("create.analyzeTimeout"), {
          duration: 5000,
        });
      } else {
        toast.error(
          t("create.serverError"),
          { duration: 5000 }
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Save the brand identity and navigate to the upload page.
   */
  const handleContinue = async () => {
    if (!websiteUrl && !description.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveBrandIdentity({
        websiteUrl: websiteUrl || undefined,
        description: description || undefined,
        businessName: businessName || undefined,
        analyzedAt: Date.now(),
      });

      router.push("/upload");
    } catch (error) {
      console.error("Error saving brand identity:", error);
      toast.error(t("create.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = websiteUrl.trim() || description.trim();

  return (
    <div className="min-h-screen bg-mood-onboarding px-6 py-8">
      <div className="mx-auto max-w-md">
        {/* Header with back + step */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/home")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
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
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium text-purple-600">
              {t("create.step1")}
            </span>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <Image
            src="/PostaGen-Logo.png"
            alt="Postagène Logo"
            width={140}
            height={40}
            className="h-auto w-auto"
            priority
          />
        </div>

        {/* Main Heading */}
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900">
            {t("create.brandIdentity")}
          </h1>
          <p className="text-base leading-relaxed text-gray-600">
            {t("create.subtitle")}
          </p>
        </div>

        {/* Website Input + Analyze Button */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("create.websiteLabel")}
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder={
                isLoadingExisting ? t("common.loading") : t("create.websitePlaceholder")
              }
              disabled={isLoadingExisting || isAnalyzing}
              className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-12 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-200 hover:shadow-sm disabled:opacity-50"
            />
          </div>

          {/* Analyze URL button - shows when URL is entered */}
          {websiteUrl.trim() && (
            <button
              onClick={handleAnalyzeUrl}
              disabled={isAnalyzing || isLoadingExisting}
              className="mt-3 w-full rounded-2xl border-2 border-purple-200 bg-purple-50 px-6 py-3 text-sm font-semibold text-purple-700 transition-all hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t("create.analyzing")}</span>
                </>
              ) : (
                <>
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>{t("create.analyzeBtn")}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-400">{t("common.or")}</span>
          </div>
        </div>

        {/* Description Input */}
        <div className="mb-8">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("create.descLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isLoadingExisting
                ? t("common.loading")
                : t("create.descPlaceholder")
            }
            disabled={isLoadingExisting}
            rows={6}
            className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none hover:border-purple-200 hover:shadow-sm disabled:opacity-50"
          />

          {/* Analyze description button - shows when description is entered but no URL */}
          {description.trim() && !websiteUrl.trim() && (
            <button
              onClick={handleAnalyzeUrl}
              disabled={isAnalyzing || isLoadingExisting}
              className="mt-3 w-full rounded-2xl border-2 border-purple-200 bg-purple-50 px-6 py-3 text-sm font-semibold text-purple-700 transition-all hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t("create.analyzing")}</span>
                </>
              ) : (
                <>
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
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <span>{t("create.analyzeBtn")}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={isSaving || isLoadingExisting || isAnalyzing || !isFormValid}
          className="w-full rounded-2xl bg-[#8B5CF6] px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{t("common.save")}...</span>
            </>
          ) : (
            <>
              <span>{t("create.continueBtn")}</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
