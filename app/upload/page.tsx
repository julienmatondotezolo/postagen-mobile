"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { saveMedia, getAllMedia, deleteMedia, getMediaUrl, clearAllMedia, type MediaFile } from "@/lib/db";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/lib/i18n";

/**
 * Compress an image file to a maximum dimension and quality.
 * Returns the original file if it's already small enough.
 */
async function compressImage(file: File, maxDimension: number = 1920, quality: number = 0.8): Promise<File> {
  // Skip if file is already small (<1MB)
  if (file.size < 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip if image is already small enough
      if (img.width <= maxDimension && img.height <= maxDimension && file.size < 3 * 1024 * 1024) {
        resolve(file);
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      // Draw to canvas and export
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, return original
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name, { type: "image/jpeg" });
          console.log(`📷 Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB (${width}x${height})`);
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Return original on error
    };

    img.src = url;
  });
}

export default function MediaUpload() {
  const { t } = useI18n();
  const router = useRouter();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [temporaryFiles, setTemporaryFiles] = useState<File[]>([]); // Store files temporarily before saving to DB
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fullscreenMedia, setFullscreenMedia] = useState<(MediaFile & { tempUrl?: string }) | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const files = await getAllMedia();
      setMediaFiles(files);
    } catch (error) {
      console.error("Error loading media:", error);
      toast.error("Failed to load media files", {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    }
  };

  // Convert HEIC images to JPEG
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      // Dynamically import heic2any only on client side
      const heic2any = (await import('heic2any')).default;
      
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      
      // heic2any can return Blob or Blob[], handle both cases
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      
      // Create a new File from the converted Blob
      const newFileName = file.name.replace(/\.heic$/i, '.jpg');
      return new File([blob], newFileName, { type: "image/jpeg" });
    } catch (error) {
      console.error("Error converting HEIC:", error);
      throw error;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setLoadingProgress(0);
    let successCount = 0;
    let failCount = 0;
    const failedFiles: string[] = [];
    const totalFiles = files.length;

    try {
      const newFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        
        // Update progress
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        setLoadingProgress(progress);
        
        // Check if file is HEIC and convert it
        const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                       file.name.toLowerCase().endsWith('.heif') ||
                       file.type === 'image/heic' ||
                       file.type === 'image/heif';
        
        if (isHeic) {
          try {
            toast.loading(`Converting ${file.name}...`, { id: `convert-${i}` });
            file = await convertHeicToJpeg(file);
            toast.success(`Converted ${file.name}`, { id: `convert-${i}` });
          } catch (error) {
            console.error(`Error converting HEIC ${file.name}:`, error);
            toast.error(`Failed to convert ${file.name}`, { id: `convert-${i}` });
            failCount++;
            failedFiles.push(file.name);
            continue;
          }
        }
        
        // Check if file is image or video (after potential HEIC conversion)
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          failCount++;
          failedFiles.push(file.name);
          continue;
        }

        // Reject files >50MB (large videos cause browser hang via base64/IndexedDB)
        const MAX_FILE_SIZE_MB = 50;
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          failCount++;
          failedFiles.push(`${file.name} (te groot, max ${MAX_FILE_SIZE_MB}MB)`);
          continue;
        }

        // Compress images to reduce payload size (max 1920px, 80% quality)
        if (file.type.startsWith("image/")) {
          try {
            file = await compressImage(file, 1920, 0.8);
          } catch (error) {
            console.warn(`⚠️ Could not compress ${file.name}, using original`);
          }
        }
        
        // For videos: warn about compatibility
        if (file.type.startsWith("video/")) {
          console.log(`🎥 Video detected: ${file.name} (${file.type})`);
          // Videos are saved as-is - backend will extract frames for analysis
          // Note: Browser playback requires compatible codecs (MP4/WebM work best)
        }

        // Check max limit
        if (temporaryFiles.length + newFiles.length >= 100) {
          toast.error(t("upload.maxFiles"), {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          });
          break;
        }

        newFiles.push(file);
        successCount++;
      }
      
      setLoadingProgress(100);
      
      // Add new files to temporary storage (not IndexedDB yet)
      setTemporaryFiles(prev => [...prev, ...newFiles]);

      // Show success toast
      if (successCount > 0) {
        toast.success(`Added ${successCount} file${successCount > 1 ? 's' : ''}`, {
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
      }

      // Show error toast for failed uploads
      if (failCount > 0) {
        const errorMessage = failedFiles.length > 0 
          ? `Failed to process ${failCount} file${failCount > 1 ? 's' : ''}: ${failedFiles.slice(0, 2).join(', ')}${failedFiles.length > 2 ? '...' : ''}`
          : `Failed to process ${failCount} file${failCount > 1 ? 's' : ''}`;
        
        toast.error(errorMessage, {
          style: {
            background: '#ef4444',
            color: '#fff',
          },
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error processing media:", error);
      toast.error("An unexpected error occurred while processing files", {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDelete = async (index: number) => {
    try {
      // Remove from temporary files array
      setTemporaryFiles(prev => prev.filter((_, i) => i !== index));
      
      // Clear selection if the deleted file was selected
      setSelectedMedia(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(index.toString());
        return newSelected;
      });
      
      toast.success(t("upload.removeSuccess"), {
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error("Error removing media:", error);
      toast.error(t("upload.removeError"), {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const count = selectedMedia.size;
      const indicesToDelete = Array.from(selectedMedia).map(id => parseInt(id));
      
      // Remove selected files from temporary files
      setTemporaryFiles(prev => prev.filter((_, index) => !indicesToDelete.includes(index)));
      
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
      
      toast.success(`Successfully removed ${count} file${count > 1 ? 's' : ''}`, {
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error("Error removing selected media:", error);
      toast.error("Failed to remove selected media", {
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedMedia.size === temporaryFiles.length) {
      // Deselect all
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all
      const allIds = new Set(temporaryFiles.map((_, index) => index.toString()));
      setSelectedMedia(allIds);
      setIsSelectionMode(true);
    }
  };

  const toggleSelection = (index: string) => {
    const newSelected = new Set(selectedMedia);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelected.add(index);
      setIsSelectionMode(true);
    }
    setSelectedMedia(newSelected);
  };

  const handleLongPressStart = (index: string) => {
    longPressTimerRef.current = setTimeout(() => {
      toggleSelection(index);
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMediaClick = (file: File, index: number) => {
    if (isSelectionMode) {
      toggleSelection(index.toString());
    } else {
      // Create a temporary URL for fullscreen view
      const url = URL.createObjectURL(file);
      const tempMedia: MediaFile & { tempUrl?: string } = {
        id: index.toString(),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        base64: '', // Not needed for temp display
        mimeType: file.type,
        uploadedAt: Date.now(),
        tempUrl: url, // Add temporary URL for display
      };
      setFullscreenMedia(tempMedia);
    }
  };

  const handleClickOutside = () => {
    if (isSelectionMode) {
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleGenerate = async () => {
    if (temporaryFiles.length === 0) return;
    
    // Prevent multiple simultaneous calls
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    
    setIsLoading(true);
    try {
      toast.loading(t("upload.preparing"), { id: "saving" });
      
      // Clear old media BEFORE saving new ones
      // This ensures only the new uploads are sent to backend
      await clearAllMedia();
      console.log("🗑️ Cleared old media from IndexedDB");
      
      // Save new media files to IndexedDB
      for (const file of temporaryFiles) {
        await saveMedia(file);
      }
      
      console.log(`💾 Saved ${temporaryFiles.length} new media file(s)`);
      toast.success(t("upload.ready"), { id: "saving", duration: 2000 });
      
      // Navigate to processing page
      router.push("/processing");
    } catch (error) {
      console.error("Error saving media:", error);
      toast.error(t("upload.saveError"), { id: "saving" });
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-mood-upload px-6 py-8 pb-48" onClick={handleClickOutside}>
        <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
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
              {t("create.step2")}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            {t("upload.title")}
          </h1>
          <p className="text-base text-gray-600">
            {t("upload.subtitle")}
          </p>
        </div>

        {/* Drop Zone / Media Grid */}
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={(e) => e.stopPropagation()}
          className={`mb-8 rounded-[60px] border-[3px] border-dashed transition-all relative ${
            isDragging
              ? "border-purple-400 bg-purple-50/50"
              : "border-purple-100 bg-white/40"
          } ${temporaryFiles.length > 0 || isLoading ? "p-6" : "flex min-h-[320px] flex-col items-center justify-center"}`}
        >
          {isLoading ? (
            // Loading state - show while uploading/converting
            <div className="flex flex-col items-center justify-center min-h-[320px] px-8">
              <div className="mb-6 relative">
                {/* Animated spinner */}
                <div className="h-24 w-24 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center animate-pulse">
                  <svg
                    className="h-12 w-12 text-white animate-spin"
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
                </div>
              </div>
              
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                Processing media...
              </h2>
              <p className="mb-6 text-lg text-gray-400">
                Converting and uploading your files
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-purple-500 to-purple-600 transition-all duration-300 ease-out shadow-lg shadow-purple-200"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="mt-3 text-center text-sm font-bold tracking-widest text-gray-400 uppercase">
                  {loadingProgress}% COMPLETE
                </p>
              </div>
            </div>
          ) : temporaryFiles.length === 0 ? (
            // Empty state - show upload prompt
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-purple-400 to-purple-600 text-white shadow-2xl shadow-purple-200 transition-all hover:scale-110 active:scale-95"
              >
                <svg
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                {t("upload.dropzone")}
              </h2>
              <p className="text-lg text-gray-400">
                {t("upload.dropzoneOr")}
              </p>
            </>
          ) : (
            // Media grid with selection
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {t("upload.yourAssets")}
                </h2>
                <div className="flex items-center gap-3">
                  {isSelectionMode && selectedMedia.size > 0 && (
                    <button 
                      onClick={handleDeleteSelected}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                    >
                      {t("upload.deleteSelected")} ({selectedMedia.size})
                    </button>
                  )}
                  <button 
                    onClick={handleSelectAll}
                    className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    {selectedMedia.size === temporaryFiles.length ? t("upload.deselectAll") : t("upload.selectAll")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {temporaryFiles.map((file, index) => {
                  const isSelected = selectedMedia.has(index.toString());
                  const fileUrl = URL.createObjectURL(file);
                  return (
                    <div
                      key={index}
                      className={`group relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm transition-all cursor-pointer ${
                        isSelected 
                          ? "ring-4 ring-purple-500 scale-95" 
                          : "hover:shadow-md hover:-translate-y-1"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMediaClick(file, index);
                      }}
                      onTouchStart={() => handleLongPressStart(index.toString())}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(index.toString())}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                    >
                      {file.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl}
                          alt="Upload"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="relative h-full w-full">
                          <video
                            src={fileUrl}
                            className="h-full w-full object-cover"
                            preload="metadata"
                          />
                          {/* Video Play Icon Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
                              <svg
                                className="h-6 w-6 text-gray-900 ml-0.5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 shadow-lg z-10">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      
                      {/* Delete button (only show when not in selection mode) */}
                      {!isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(index);
                          }}
                          className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex shadow-lg z-10"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,image/heic,image/heif,video/*,.heic,.heif"
          onChange={handleFileInput}
          className="hidden"
        />
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-mood-upload via-mood-upload to-transparent pt-6 pb-24 px-6 pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          {/* Counter Badge - Fixed above buttons */}
          <div className="flex justify-end mb-3">
            <div className="px-4 py-2 rounded-full bg-white text-sm font-bold text-purple-600 shadow-lg">
              {temporaryFiles.length} {t("upload.counter")}
            </div>
          </div>

          <div className="space-y-3">
            {/* Add More Media Button - Only show when media exists */}
            {temporaryFiles.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-dashed border-purple-300 text-purple-600 font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all shadow-lg"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add More Media
              </button>
            )}

            {/* Generate Button - Always visible */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerate();
              }}
              disabled={temporaryFiles.length === 0 || isLoading}
              className="w-full rounded-2xl bg-gray-900 px-6 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{t("upload.generateBtn")}</span>
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenMedia(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-6 right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Media Content */}
          <div 
            className="max-w-7xl max-h-full w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenMedia.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fullscreenMedia.tempUrl || `data:${fullscreenMedia.mimeType};base64,${fullscreenMedia.base64}`}
                alt="Fullscreen view"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <video
                src={fullscreenMedia.tempUrl || `data:${fullscreenMedia.mimeType};base64,${fullscreenMedia.base64}`}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
