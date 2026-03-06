"use client";

import { useWebHaptics } from "web-haptics/react";
import { defaultPatterns } from "web-haptics";

export function useHaptics() {
  const { trigger } = useWebHaptics();

  return {
    tap: () => trigger("light"),
    success: () => trigger(defaultPatterns.success),
    error: () => trigger(defaultPatterns.error),
    like: () => trigger({ pattern: [
      { duration: 15, intensity: 0.4 },
      { delay: 40, duration: 25, intensity: 0.8 },
      { delay: 30, duration: 15, intensity: 0.5 },
    ] }),
    dislike: () => trigger({ pattern: [
      { duration: 30, intensity: 0.7 },
      { delay: 60, duration: 20, intensity: 0.3 },
    ] }),
    swipe: () => trigger({ pattern: [{ duration: 20, intensity: 0.6 }, { delay: 30, duration: 15, intensity: 0.3 }] }),
    magic: () => trigger({ pattern: [
      { duration: 15, intensity: 0.3 },
      { delay: 50, duration: 20, intensity: 0.5 },
      { delay: 50, duration: 25, intensity: 0.7 },
      { delay: 50, duration: 35, intensity: 1.0 },
    ] }),
    longError: () => trigger({ pattern: [
      { duration: 40, intensity: 0.8 },
      { delay: 50, duration: 40, intensity: 0.9 },
      { delay: 50, duration: 50, intensity: 1.0 },
    ] }),
  };
}
