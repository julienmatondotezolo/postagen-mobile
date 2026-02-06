"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllMedia, savePost, createPlan, type Post } from "@/lib/db";

const ANALYSIS_STEPS = [
  "Analyzing your menu...",
  "Crafting perfect captions...",
  "Selecting best angles...",
  "Optimizing your content...",
  "Finalizing your plan...",
];

export default function Processing() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    // Prevent duplicate plan creation (React Strict Mode runs useEffect twice)
    if (hasGenerated) return;
    setHasGenerated(true);

    const generatePlan = async () => {
      try {
        const mediaFiles = await getAllMedia();
        if (mediaFiles.length === 0) {
          router.push("/upload");
          return;
        }

        // Simulate processing with progress updates
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            return prev + 2;
          });
        }, 100);

        // Update step text
        const stepInterval = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev >= ANALYSIS_STEPS.length - 1) {
              clearInterval(stepInterval);
              return ANALYSIS_STEPS.length - 1;
            }
            return prev + 1;
          });
        }, 2000);

        // Generate posts after processing
        setTimeout(async () => {
          clearInterval(interval);
          clearInterval(stepInterval);
          
          // IMPORTANT: Only create posts if we have media files
          // Never create a post without an associated image/video
          if (mediaFiles.length === 0) {
            console.error("No media files available - cannot create posts");
            router.push("/upload");
            return;
          }
          
          // Generate posts from media - one post per media file
          const posts: Post[] = [];
          const postIds: string[] = [];
          const mediaIds: string[] = [];
          const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
          const times = ["12:00 PM", "06:30 PM", "09:00 AM", "03:00 PM", "05:00 PM", "08:00 AM", "02:00 PM", "07:00 PM"];
          const sentiments: Post["sentiment"][] = ["Very Positive", "Positive", "Very Positive", "Positive", "Very Positive"];

          // Create exactly one post for each media file (1:1 relationship)
          mediaFiles.forEach((media, index) => {
            // Generate random day offset between 0 and 6 (today to today + 6 days)
            const randomDayOffset = Math.floor(Math.random() * 7);
            const date = new Date();
            date.setDate(date.getDate() + randomDayOffset);
            const dateStr = date.toISOString().split("T")[0];
            const dayName = dayNames[date.getDay()];

            const post: Post = {
              id: `post-${Date.now()}-${index}`,
              mediaId: media.id,
              caption: `Transforming your workflow with AI that actually understands your brand. #Postagen empowers creatives to focus on what matters. ✨`,
              hashtags: ["#AIBranding", "#ContentStrategy", "#FutureOfWork", "#Productivity"],
              scheduledDate: dateStr,
              scheduledTime: times[index % times.length],
              dayName,
              sentiment: sentiments[index % sentiments.length],
              isOptimized: true,
              createdAt: Date.now(),
            };
            posts.push(post);
            postIds.push(post.id);
            mediaIds.push(media.id);
            savePost(post);
          });

          // Create a plan with all posts (status defaults to "Draft")
          const planName = `Content Plan - ${new Date().toLocaleDateString()}`;
          const newPlan = await createPlan(planName, postIds, mediaIds, "AI-generated content plan", "Draft");

          setTimeout(() => {
            router.push(`/plan/${newPlan.id}`);
          }, 1000);
        }, 5000);
      } catch (error) {
        console.error("Error generating plan:", error);
      }
    };

    generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-mood-processing flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Central Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            {/* Pulsing background glow */}
            <div className="absolute inset-0 animate-pulse rounded-full bg-purple-200/40 blur-3xl scale-150"></div>
            
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-2xl shadow-purple-100">
              <div className="flex items-center justify-center gap-1">
                <svg
                  className="h-10 w-10 animate-pulse text-purple-600"
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
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-4xl font-bold text-gray-900">
          AI Analysis
        </h1>
        <h2 className="mb-6 text-4xl font-serif italic font-normal text-violet-600">
          in Progress
        </h2>

        {/* Current Step */}
        <p className="mb-16 text-base text-gray-600 font-medium">
          {ANALYSIS_STEPS[currentStep] || ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1]}
        </p>

        {/* Progress Bar Container */}
        <div className="relative px-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full progress-shimmer transition-all duration-300 ease-out shadow-lg shadow-purple-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-4 text-xs font-bold tracking-widest text-gray-400 uppercase">
            {Math.round(progress)}% OPTIMIZED
          </p>
        </div>
      </div>
    </div>
  );
}
