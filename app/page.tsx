"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveBrandIdentity } from "@/lib/db";
import Image from "next/image";

export default function IdentitySetup() {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
            Establish your <span className="font-serif italic font-normal text-violet-600">brand identity</span>
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
              placeholder="Paste your link here..."
              className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-12 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-200 hover:shadow-sm"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-400">
              OR
            </span>
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
            placeholder="Tell us about your business, values, and audience"
            rows={6}
            className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none hover:border-purple-200 hover:shadow-sm"
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isLoading || (!websiteUrl && !description.trim())}
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
