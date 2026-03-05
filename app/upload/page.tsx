"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { saveMedia, clearAllMedia, type MediaFile } from "@/lib/db";
import { getMedia, type MediaRecord } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

async function compressImage(file: File, maxDimension: number = 1920, quality: number = 0.8): Promise<File> {
  if (file.size < 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxDimension && img.height <= maxDimension && file.size < 3 * 1024 * 1024) {
        resolve(file);
        return;
      }

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

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          const compressed = new File([blob], file.name, { type: "image/jpeg" });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

type TabType = "upload" | "library";
type FolderFilter = "all" | "liked" | "unsorted";

const MAX_FILES = 250;

export default function MediaUpload() {
  const { t } = useI18n();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("upload");

  // Upload tab state
  const [temporaryFiles, setTemporaryFiles] = useState<File[]>([]);
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

  // Library tab state
  const [libraryFolder, setLibraryFolder] = useState<FolderFilter>("all");
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());

  // Fetch library media
  const { data: libraryMedia, isLoading: libraryLoading } = useQuery({
    queryKey: ["library-media", libraryFolder],
    queryFn: () => getMedia(libraryFolder === "all" ? undefined : libraryFolder, 200),
    enabled: activeTab === "library",
  });

  // Total selected count across both tabs
  const totalSelected = temporaryFiles.length + selectedLibraryIds.size;

  // Convert HEIC images to JPEG
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
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
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        setLoadingProgress(progress);

        const isHeic = file.name.toLowerCase().endsWith('.heic') ||
                       file.name.toLowerCase().endsWith('.heif') ||
                       file.type === 'image/heic' ||
                       file.type === 'image/heif';

        if (isHeic) {
          try {
            toast.loading(`Converting ${file.name}...`, { id: `convert-${i}` });
            file = await convertHeicToJpeg(file);
            toast.success(`Converted ${file.name}`, { id: `convert-${i}` });
          } catch {
            toast.error(`Failed to convert ${file.name}`, { id: `convert-${i}` });
            failCount++;
            failedFiles.push(file.name);
            continue;
          }
        }

        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          failCount++;
          failedFiles.push(file.name);
          continue;
        }

        const MAX_FILE_SIZE_MB = 50;
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          failCount++;
          failedFiles.push(`${file.name} (max ${MAX_FILE_SIZE_MB}MB)`);
          continue;
        }

        if (file.type.startsWith("image/")) {
          try { file = await compressImage(file, 1920, 0.8); } catch {}
        }

        if (temporaryFiles.length + newFiles.length >= MAX_FILES) {
          toast.error(t("upload.maxFiles"));
          break;
        }

        newFiles.push(file);
        successCount++;
      }

      setLoadingProgress(100);
      setTemporaryFiles(prev => [...prev, ...newFiles]);

      if (successCount > 0) {
        toast.success(`Added ${successCount} file${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed: ${failedFiles.slice(0, 2).join(', ')}${failedFiles.length > 2 ? '...' : ''}`, { duration: 5000 });
      }
    } catch (error) {
      console.error("Error processing media:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); };

  const handleDelete = async (index: number) => {
    setTemporaryFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedMedia(prev => { const n = new Set(prev); n.delete(index.toString()); return n; });
    toast.success(t("upload.removeSuccess"));
  };

  const handleDeleteSelected = async () => {
    const count = selectedMedia.size;
    const indicesToDelete = Array.from(selectedMedia).map(id => parseInt(id));
    setTemporaryFiles(prev => prev.filter((_, index) => !indicesToDelete.includes(index)));
    setSelectedMedia(new Set());
    setIsSelectionMode(false);
    toast.success(`Removed ${count} file${count > 1 ? 's' : ''}`);
  };

  const handleSelectAll = () => {
    if (selectedMedia.size === temporaryFiles.length) {
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedMedia(new Set(temporaryFiles.map((_, i) => i.toString())));
      setIsSelectionMode(true);
    }
  };

  const toggleSelection = (index: string) => {
    const newSelected = new Set(selectedMedia);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      if (newSelected.size === 0) setIsSelectionMode(false);
    } else {
      newSelected.add(index);
      setIsSelectionMode(true);
    }
    setSelectedMedia(newSelected);
  };

  const handleLongPressStart = (index: string) => {
    longPressTimerRef.current = setTimeout(() => { toggleSelection(index); }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const handleMediaClick = (file: File, index: number) => {
    if (isSelectionMode) {
      toggleSelection(index.toString());
    } else {
      const url = URL.createObjectURL(file);
      setFullscreenMedia({
        id: index.toString(),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        base64: '',
        mimeType: file.type,
        uploadedAt: Date.now(),
        tempUrl: url,
      });
    }
  };

  const handleClickOutside = () => {
    if (isSelectionMode) { setSelectedMedia(new Set()); setIsSelectionMode(false); }
  };

  // Library tab: toggle media selection
  const toggleLibraryItem = (media: MediaRecord) => {
    const newSelected = new Set(selectedLibraryIds);
    if (newSelected.has(media.id)) {
      newSelected.delete(media.id);
    } else {
      if (totalSelected >= MAX_FILES) {
        toast.error(t("upload.maxFiles"));
        return;
      }
      newSelected.add(media.id);
    }
    setSelectedLibraryIds(newSelected);
  };

  const handleContinue = async () => {
    if (totalSelected === 0) return;
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    setIsLoading(true);
    try {
      toast.loading(t("upload.preparing"), { id: "saving" });

      await clearAllMedia();

      // Save uploaded files to IndexedDB
      for (const file of temporaryFiles) {
        await saveMedia(file);
      }

      // Store selected library URLs in sessionStorage
      if (selectedLibraryIds.size > 0 && libraryMedia) {
        const selectedUrls = libraryMedia
          .filter((m: MediaRecord) => selectedLibraryIds.has(m.id))
          .map((m: MediaRecord) => m.url);
        sessionStorage.setItem("postagen-mediaUrls", JSON.stringify(selectedUrls));
      } else {
        sessionStorage.removeItem("postagen-mediaUrls");
      }

      toast.success(t("upload.ready"), { id: "saving", duration: 2000 });
      router.push("/context");
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
              <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium text-purple-600">{t("create.step2")}</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">{t("upload.title")}</h1>
            <p className="text-base text-gray-600">{t("upload.subtitle")}</p>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                activeTab === "upload"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("upload.tabUpload")}
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                activeTab === "library"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("upload.tabLibrary")}
            </button>
          </div>

          {/* ==================== UPLOAD TAB ==================== */}
          {activeTab === "upload" && (
            <>
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={(e) => e.stopPropagation()}
                className={`mb-8 rounded-[60px] border-[3px] border-dashed transition-all relative ${
                  isDragging ? "border-purple-400 bg-purple-50/50" : "border-purple-100 bg-white/40"
                } ${temporaryFiles.length > 0 || isLoading ? "p-6" : "flex min-h-[320px] flex-col items-center justify-center"}`}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[320px] px-8">
                    <div className="mb-6 relative">
                      <div className="h-24 w-24 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center animate-pulse">
                        <svg className="h-12 w-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">Processing media...</h2>
                    <p className="mb-6 text-lg text-gray-400">Converting and uploading your files</p>
                    <div className="w-full max-w-md">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-linear-to-r from-purple-500 to-purple-600 transition-all duration-300 ease-out shadow-lg shadow-purple-200" style={{ width: `${loadingProgress}%` }} />
                      </div>
                      <p className="mt-3 text-center text-sm font-bold tracking-widest text-gray-400 uppercase">{loadingProgress}% COMPLETE</p>
                    </div>
                  </div>
                ) : temporaryFiles.length === 0 ? (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-purple-400 to-purple-600 text-white shadow-2xl shadow-purple-200 transition-all hover:scale-110 active:scale-95"
                    >
                      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">{t("upload.dropzone")}</h2>
                    <p className="text-lg text-gray-400">{t("upload.dropzoneOr")}</p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">{t("upload.yourAssets")}</h2>
                      <div className="flex items-center gap-3">
                        {isSelectionMode && selectedMedia.size > 0 && (
                          <button onClick={handleDeleteSelected} className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
                            {t("upload.deleteSelected")} ({selectedMedia.size})
                          </button>
                        )}
                        <button onClick={handleSelectAll} className="text-sm text-purple-600 hover:text-purple-700 transition-colors">
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
                              isSelected ? "ring-4 ring-purple-500 scale-95" : "hover:shadow-md hover:-translate-y-1"
                            }`}
                            onClick={(e) => { e.stopPropagation(); handleMediaClick(file, index); }}
                            onTouchStart={() => handleLongPressStart(index.toString())}
                            onTouchEnd={handleLongPressEnd}
                            onMouseDown={() => handleLongPressStart(index.toString())}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                          >
                            {file.type.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={fileUrl} alt="Upload" className="h-full w-full object-cover" />
                            ) : (
                              <div className="relative h-full w-full">
                                <video src={fileUrl} className="h-full w-full object-cover" preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
                                    <svg className="h-6 w-6 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 shadow-lg z-10">
                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {!isSelectionMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex shadow-lg z-10"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            </>
          )}

          {/* ==================== LIBRARY TAB ==================== */}
          {activeTab === "library" && (
            <div onClick={(e) => e.stopPropagation()}>
              {/* Folder Filter */}
              <div className="mb-4 flex gap-2">
                {(["all", "liked", "unsorted"] as FolderFilter[]).map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setLibraryFolder(folder)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      libraryFolder === folder
                        ? "bg-purple-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t(`upload.folder_${folder}`)}
                  </button>
                ))}
              </div>

              {/* Media Grid */}
              {libraryLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
                  <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>
                </div>
              ) : !libraryMedia || libraryMedia.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
                      <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{t("media.noMedia")}</p>
                  <p className="mt-1 text-sm text-gray-500">{t("media.noMediaDesc")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {libraryMedia.map((media: MediaRecord) => {
                    const isSelected = selectedLibraryIds.has(media.id);
                    return (
                      <div
                        key={media.id}
                        onClick={() => toggleLibraryItem(media)}
                        className={`relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm cursor-pointer transition-all ${
                          isSelected ? "ring-4 ring-purple-500 scale-95" : "hover:shadow-md hover:-translate-y-1"
                        }`}
                      >
                        {media.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media.url} alt={media.filename} className="h-full w-full object-cover" />
                        ) : (
                          <div className="relative h-full w-full">
                            <video src={media.url} className="h-full w-full object-cover" preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
                                <svg className="h-4 w-4 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Selection checkmark */}
                        <div className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                          isSelected ? "bg-purple-500 border-purple-500" : "bg-white/80 border-white/80"
                        }`}>
                          {isSelected && (
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {/* Folder badge */}
                        {media.folder === "liked" && (
                          <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500">
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-mood-upload via-mood-upload to-transparent pt-6 pb-24 px-6 pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          {/* Counter Badge */}
          <div className="flex justify-end mb-3">
            <div className="px-4 py-2 rounded-full bg-white text-sm font-bold text-purple-600 shadow-lg">
              {totalSelected} / {MAX_FILES}
            </div>
          </div>

          <div className="space-y-3">
            {/* Add More Media Button (upload tab only, when media exists) */}
            {activeTab === "upload" && temporaryFiles.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-dashed border-purple-300 text-purple-600 font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all shadow-lg"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t("upload.addMore")}
              </button>
            )}

            {/* Continue Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleContinue(); }}
              disabled={totalSelected === 0 || isLoading}
              className="w-full rounded-2xl bg-gray-900 px-6 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{t("upload.continueBtn")}</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenMedia(null)}>
          <button onClick={() => setFullscreenMedia(null)} className="absolute top-6 right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-7xl max-h-full w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {fullscreenMedia.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fullscreenMedia.tempUrl || `data:${fullscreenMedia.mimeType};base64,${fullscreenMedia.base64}`} alt="Fullscreen view" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
              <video src={fullscreenMedia.tempUrl || `data:${fullscreenMedia.mimeType};base64,${fullscreenMedia.base64}`} controls autoPlay className="max-w-full max-h-full object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
