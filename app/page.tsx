"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { saveBrandIdentity, getBrandIdentity } from "@/lib/db";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";
import Image from "next/image";

const LOSTERIA_FALLBACK = {
  businessName: "L'Osteria Deerlijk",
  websiteUrl: "https://l-osteria.be",
  description:
    "L'Osteria Deerlijk — Authentiek Italiaans familierestaurant gerund door Angelo en Jessica Bombini sinds 2003. " +
    "Gelegen aan Stationsstraat 232, 8540 Deerlijk. Onze familiegeschiedenis gaat terug tot 1964 in Leuven " +
    "(Gianni Bombini). Wij serveren authentieke Italiaanse gerechten in een warme, familiale sfeer. " +
    "Specialiteiten: Bruschetta tradizionale, Carpaccio di manzo, Scampi flambé, Filetto al naturale, " +
    "huisgemaakte pasta. Open dinsdag t/m zaterdag. Gesloten op maandag en zondag.",
};

interface BrandApiResponse {
  businessName: string;
  websiteUrl: string;
  description: string;
  tone?: string;
  languages?: string[];
  menuHighlights?: string[];
}

function IdentitySetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const brandSlug = searchParams.get("brand");
        if (brandSlug) {
          await preseedBrand(brandSlug);
        } else {
          await loadExistingBrand();
        }
      } catch (error) {
        console.error("Error initializing brand data:", error);
      } finally {
        setIsPreloading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preseedBrand = async (slug: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/brand/${slug}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BrandApiResponse = await res.json();

      setWebsiteUrl(data.websiteUrl || "");
      setDescription(data.description || "");

      // Save to IndexedDB immediately
      await saveBrandIdentity({
        websiteUrl: data.websiteUrl,
        description: data.description,
        businessName: data.businessName,
        analyzedAt: Date.now(),
      });
    } catch {
      // Fallback to hardcoded data for known slugs
      console.warn("Backend unreachable, using hardcoded fallback");
      if (slug.includes("osteria")) {
        setWebsiteUrl(LOSTERIA_FALLBACK.websiteUrl);
        setDescription(LOSTERIA_FALLBACK.description);

        await saveBrandIdentity({
          websiteUrl: LOSTERIA_FALLBACK.websiteUrl,
          description: LOSTERIA_FALLBACK.description,
          businessName: LOSTERIA_FALLBACK.businessName,
          analyzedAt: Date.now(),
        });
      } else {
        toast.error("Kon merkgegevens niet laden. Vul de velden handmatig in.", {
          duration: 4000,
        });
      }
    }
  };

  const loadExistingBrand = async () => {
    const existing = await getBrandIdentity();
    if (existing) {
      setWebsiteUrl(existing.websiteUrl || "");
      setDescription(existing.description || "");
    }
  };

  const handleAnalyze = async () => {
    if (!websiteUrl && !description.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await saveBrandIdentity({
        websiteUrl: websiteUrl || undefined,
        description: description || undefined,
        analyzedAt: Date.now(),
      });

      // Navigate to upload screen
      router.push("/upload");
    } catch (error) {
      console.error("Error saving brand identity:", error);
      toast.error("Kon merkidentiteit niet opslaan. Probeer het opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mood-onboarding px-6 py-8">
      <div className="mx-auto max-w-md">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-2">
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
            Establish your{" "}
            <span className="font-serif italic font-normal text-violet-600">
              brand identity
            </span>
          </h1>
          <p className="text-base leading-relaxed text-gray-600">
            Let&apos;s sync your digital presence to create content that sounds
            like you.
          </p>
        </div>

        {/* Website Input */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Website or Socials
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
              placeholder={isPreloading ? "Laden..." : "Paste your link here..."}
              disabled={isPreloading}
              className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-12 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-200 hover:shadow-sm disabled:opacity-50"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-400">OR</span>
          </div>
        </div>

        {/* Description Input */}
        <div className="mb-8">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isPreloading
                ? "Laden..."
                : "Tell us about your business, values, and audience"
            }
            disabled={isPreloading}
            rows={6}
            className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none hover:border-purple-200 hover:shadow-sm disabled:opacity-50"
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isLoading || isPreloading || (!websiteUrl && !description.trim())}
          className="w-full rounded-2xl bg-[#8B5CF6] px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
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
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze my brand</span>
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
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function IdentitySetup() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-mood-onboarding flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <IdentitySetupInner />
    </Suspense>
  );
}
