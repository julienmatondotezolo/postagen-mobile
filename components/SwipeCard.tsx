"use client";

import { useRef, useState, useCallback } from "react";
import type { MediaRecord } from "@/lib/api";
import { useHaptics } from "@/lib/haptics";

interface SwipeCardProps {
  media: MediaRecord;
  onSwipe: (direction: "left" | "right") => void;
  onTap?: () => void;
  isTop: boolean;
}

export default function SwipeCard({ media, onSwipe, onTap, isTop }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const haptics = useHaptics();

  const SWIPE_THRESHOLD = 100;

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!isTop) return;
      setIsDragging(true);
      startPos.current = { x: clientX, y: clientY };
    },
    [isTop]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !isTop) return;
      const deltaX = clientX - startPos.current.x;
      const deltaY = clientY - startPos.current.y;
      setOffset({ x: deltaX, y: deltaY });
    },
    [isDragging, isTop]
  );

  const TAP_THRESHOLD = 10;

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(offset.x) > SWIPE_THRESHOLD) {
      const direction = offset.x > 0 ? "right" : "left";
      haptics.swipe();
      // Animate out
      const flyX = offset.x > 0 ? 500 : -500;
      setOffset({ x: flyX, y: offset.y });
      setTimeout(() => onSwipe(direction), 200);
    } else if (Math.abs(offset.x) < TAP_THRESHOLD && Math.abs(offset.y) < TAP_THRESHOLD) {
      // It was a tap, not a drag
      setOffset({ x: 0, y: 0 });
      haptics.tap();
      onTap?.();
    } else {
      // Snap back
      setOffset({ x: 0, y: 0 });
    }
  }, [isDragging, offset, onSwipe, onTap]);

  const rotation = offset.x * 0.1;
  const likeOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const nopeOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        transform: `translateX(${offset.x}px) translateY(${offset.y * 0.3}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease",
        zIndex: isTop ? 10 : 5,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => handleMove(e.clientX, e.clientY)}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gray-100 shadow-2xl">
        {/* Media */}
        {media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.filename}
            className="h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <video
            src={media.url}
            className="h-full w-full object-cover pointer-events-none"
            preload="metadata"
          />
        )}

        {/* LIKE overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-green-500/30 transition-opacity"
          style={{ opacity: likeOpacity }}
        >
          <div className="rounded-2xl border-4 border-white px-8 py-4 rotate-[-20deg]">
            <svg className="h-20 w-20 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        {/* NOPE overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-red-500/30 transition-opacity"
          style={{ opacity: nopeOpacity }}
        >
          <div className="rounded-2xl border-4 border-white px-8 py-4 rotate-[20deg]">
            <svg className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Filename label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-16">
          <p className="text-lg font-bold text-white truncate">{media.filename}</p>
          <p className="text-sm text-white/70">
            {media.type === "image" ? "Photo" : "Video"} &middot;{" "}
            {(media.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
      </div>
    </div>
  );
}
