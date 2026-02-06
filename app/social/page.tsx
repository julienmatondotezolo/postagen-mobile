"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllPosts, getAllMedia, getMediaUrl, type Post, type MediaFile } from "@/lib/db";

export default function Social() {
  const router = useRouter();
  const [posts, setPosts] = useState<(Post & { media?: MediaFile })[]>([]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const [allPosts, allMedia] = await Promise.all([
          getAllPosts(),
          getAllMedia(),
        ]);

        const mediaMap = new Map(allMedia.map((m) => [m.id, m]));
        const postsWithMedia = allPosts.map((post) => ({
          ...post,
          media: mediaMap.get(post.mediaId),
        }));

        setPosts(postsWithMedia);
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };

    loadPosts();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-purple-50/30 px-6 py-8 pb-24">
      <div className="mx-auto max-w-md">
        <div className="mb-8">
          <p className="mb-1 text-sm font-medium text-gray-500">Content Hub</p>
          <h1 className="text-4xl font-bold text-gray-900">
            Your <span className="font-serif italic font-normal text-violet-600">Social</span> Feed
          </h1>
        </div>
        <p className="mb-6 text-base text-gray-600">All your social media posts</p>

        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className="cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm transition-transform hover:scale-[1.02]"
              >
                {post.media && (
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    {post.media.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getMediaUrl(post.media)}
                        alt="Post"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-200">
                        <svg
                          className="h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                <div className="px-4 py-3">
                  <p className="line-clamp-2 text-sm text-gray-600">
                    {post.caption}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>{post.scheduledDate}</span>
                    <span>•</span>
                    <span>{post.scheduledTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
