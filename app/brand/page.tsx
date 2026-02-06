"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrandIdentity, type BrandIdentity } from "@/lib/db";

export default function Brand() {
  const router = useRouter();
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(
    null
  );

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const identity = await getBrandIdentity();
        setBrandIdentity(identity || null);
      } catch (error) {
        console.error("Error loading brand identity:", error);
      }
    };

    loadBrand();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-purple-50/30 px-6 py-8 pb-24">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <p className="mb-1 text-sm font-medium text-gray-500">Identity Settings</p>
          <h1 className="text-4xl font-bold text-gray-900">
            Your <span className="font-serif italic font-normal text-violet-600">Brand</span>
          </h1>
        </div>
        <p className="mb-6 text-base text-gray-600">Your brand identity settings</p>

        {!brandIdentity ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="mb-4 text-base text-gray-600">
              No brand identity set up yet. Create one to get started!
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-2xl bg-linear-to-r from-purple-500 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-purple-700"
            >
              Set Up Brand Identity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Brand Information
              </h2>
              {brandIdentity.websiteUrl && (
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-500">
                    Website URL
                  </label>
                  <p className="text-base text-gray-900">{brandIdentity.websiteUrl}</p>
                </div>
              )}
              {brandIdentity.description && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-base text-gray-600">
                    {brandIdentity.description}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-2xl border border-purple-500 bg-white px-6 py-3 text-base font-semibold text-purple-600 transition-all hover:bg-purple-50"
            >
              Edit Brand Identity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
