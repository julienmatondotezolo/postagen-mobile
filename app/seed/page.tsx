"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedDummyData, clearAllData } from "@/lib/seedData";

export default function SeedPage() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState<{
    mediaCount: number;
    postsCount: number;
    existingMedia: number;
    newMedia: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);
    try {
      const result = await seedDummyData();
      setResult(result);
      // Redirect to plan page after seeding
      setTimeout(() => {
        router.push("/plan");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      return;
    }
    setIsClearing(true);
    setError(null);
    try {
      await clearAllData();
      setResult(null);
      alert("All data cleared successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50/30 px-6 py-8 pb-24">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Seed Dummy Data</h1>
        <p className="mb-8 text-gray-600">
          This will populate your app with sample images from Unsplash and create dummy posts.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSeed}
            disabled={isSeeding || isClearing}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? "Seeding data..." : "Seed Dummy Data"}
          </button>

          <button
            onClick={handleClear}
            disabled={isSeeding || isClearing}
            className="w-full rounded-2xl border-2 border-red-500 bg-white px-6 py-4 text-base font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? "Clearing..." : "Clear All Data"}
          </button>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              ✓ Successfully seeded data!
            </p>
            <p className="mt-2 text-sm text-green-700">
              • {result.mediaCount} total images ({result.existingMedia} existing, {result.newMedia} from Unsplash)
            </p>
            <p className="text-sm text-green-700">
              • {result.postsCount} posts created
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Error:</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> This will use your uploaded images first, then fetch from Unsplash to fill remaining slots (up to 8 total images).
          </p>
        </div>
      </div>
    </div>
  );
}
