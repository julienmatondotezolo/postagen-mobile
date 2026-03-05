"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMedia,
  getMediaStats,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  bulkDeleteMedia,
  updateMediaFolder,
  shareFolder,
  type MediaRecord,
  type Folder,
  type FolderStats,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";

type ActiveFolder = { type: "unsorted" } | { type: "custom"; folderId: string };
type StatusFilter = "all" | "pending" | "liked" | "unliked";

const FOLDER_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444"];

export default function MediaPage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolder] = useState<ActiveFolder>({ type: "unsorted" });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Folder modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Folder delete confirmation
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Fullscreen viewer
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaRecord | null>(null);

  // Drag to folder
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  // Current folder ID for queries
  const currentFolderId = activeFolder.type === "custom" ? activeFolder.folderId : undefined;

  const { data: media, isLoading } = useQuery({
    queryKey: ["media", activeFolder, statusFilter],
    queryFn: () =>
      getMedia({
        folder: activeFolder.type === "unsorted" ? "unsorted" : undefined,
        folderId: currentFolderId,
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 200,
      }),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
  });

  // Get stats for current folder
  const currentStats: FolderStats | undefined =
    stats && activeFolder.type === "unsorted"
      ? stats.unsorted
      : stats && activeFolder.type === "custom"
      ? stats.folders?.[activeFolder.folderId]
      : undefined;

  // Long press handling
  const handlePointerDown = useCallback(
    (id: string) => {
      longPressTimerRef.current = setTimeout(() => {
        if (!isSelectionMode) {
          setIsSelectionMode(true);
          setSelectedIds(new Set([id]));
        }
      }, 500);
    },
    [isSelectionMode]
  );

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleItemClick = useCallback(
    (id: string) => {
      if (isSelectionMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else {
        const item = media?.find((m) => m.id === id);
        if (item) setFullscreenMedia(item);
      }
    },
    [isSelectionMode, media]
  );

  const handleSelectAll = () => {
    if (!media) return;
    if (selectedIds.size === media.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(media.map((m) => m.id)));
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await bulkDeleteMedia(Array.from(selectedIds));
      toast.success(`${selectedIds.size} ${t("media.deleted")}`);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    } catch {
      toast.error(t("media.deleteError"));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folder = await createFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName("");
      setNewFolderColor(FOLDER_COLORS[0]);
      setShowCreateFolder(false);
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success(t("media.folderCreated"));
      setActiveFolder({ type: "custom", folderId: folder.id });
    } catch {
      toast.error(t("media.folderError"));
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renameValue.trim()) return;
    try {
      await updateFolder(renamingFolder.id, { name: renameValue.trim() });
      setRenamingFolder(null);
      setRenameValue("");
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success(t("media.folderRenamed"));
    } catch {
      toast.error(t("media.folderError"));
    }
  };

  const handleDeleteFolder = async (withMedia: boolean) => {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    try {
      await deleteFolder(folderToDelete, withMedia);
      if (activeFolder.type === "custom" && activeFolder.folderId === folderToDelete) {
        setActiveFolder({ type: "unsorted" });
      }
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      toast.success(t("media.folderDeleted"));
    } catch {
      toast.error(t("media.folderError"));
    } finally {
      setIsDeletingFolder(false);
      setFolderToDelete(null);
    }
  };

  const handleShareFolder = async (folderId: string) => {
    try {
      const { share_token } = await shareFolder(folderId);
      const url = `${window.location.origin}/share/${share_token}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("media.shareLinkCopied"));
    } catch {
      toast.error(t("media.shareError"));
    }
  };

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetFolder(folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetFolder(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDropTargetFolder(null);
    setDraggingId(null);
    const mediaId = e.dataTransfer.getData("text/plain");
    if (!mediaId) return;

    try {
      await updateMediaFolder(mediaId, folderId || undefined);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success(t("media.movedToFolder"));
    } catch {
      toast.error(t("media.folderError"));
    }
  }, [queryClient, t]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetFolder(null);
  }, []);

  // Swipe navigation
  const handleSwipeNav = () => {
    if (activeFolder.type === "custom") {
      router.push(`/media/swipe?folderId=${activeFolder.folderId}`);
    } else {
      router.push("/media/swipe?folder=unsorted");
    }
  };

  const isFolderActive = (f: ActiveFolder) => {
    if (f.type === "unsorted" && activeFolder.type === "unsorted") return true;
    if (f.type === "custom" && activeFolder.type === "custom") return f.folderId === activeFolder.folderId;
    return false;
  };

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "all", label: t("media.all"), count: currentStats?.total },
    { key: "pending", label: t("media.pending"), count: currentStats?.pending },
    { key: "liked", label: t("media.liked"), count: currentStats?.liked },
    { key: "unliked", label: t("media.unliked"), count: currentStats?.unliked },
  ];

  return (
    <div className="min-h-screen bg-mood-plan pb-28">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header / Selection Bar */}
        {isSelectionMode ? (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelSelection}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
              >
                <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-lg font-bold text-gray-900">
                {selectedIds.size} {t("upload.selected")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {selectedIds.size === media?.length ? t("upload.deselectAll") : t("upload.selectAll")}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={selectedIds.size === 0}
                className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{t("media.title")}</h1>
          </div>
        )}

        {/* Folder Cards */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Unsorted folder card */}
            <div
              onClick={() => { setActiveFolder({ type: "unsorted" }); setStatusFilter("all"); }}
              onDragOver={(e) => handleDragOver(e, "")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "")}
              className={`flex-shrink-0 w-28 rounded-2xl p-3 cursor-pointer transition-all border-2 ${
                dropTargetFolder === ""
                  ? "border-purple-500 scale-105 shadow-lg"
                  : isFolderActive({ type: "unsorted" })
                  ? "border-purple-300 bg-white shadow-md"
                  : "border-transparent bg-white/70"
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-900 truncate">{t("media.unsorted")}</p>
              <p className="text-[10px] text-gray-400">{stats?.unsorted?.total ?? 0}</p>
            </div>

            {/* Custom folder cards */}
            {folders.map((folder) => {
              const fStats = stats?.folders?.[folder.id];
              const isActive = isFolderActive({ type: "custom", folderId: folder.id });
              return (
                <div
                  key={folder.id}
                  onClick={() => { setActiveFolder({ type: "custom", folderId: folder.id }); setStatusFilter("all"); }}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`relative flex-shrink-0 w-28 rounded-2xl p-3 cursor-pointer transition-all border-2 ${
                    dropTargetFolder === folder.id
                      ? "border-purple-500 scale-105 shadow-lg"
                      : isActive
                      ? "border-purple-300 bg-white shadow-md"
                      : "border-transparent bg-white/70"
                  }`}
                >
                  {/* ⋯ menu button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute top-1 right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="18" r="1.5" />
                    </svg>
                  </button>

                  <div
                    className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={folder.color}>
                      <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">{folder.name}</p>
                  <p className="text-[10px] text-gray-400">{fStats?.total ?? 0}</p>

                  {/* Active folder accent bar */}
                  {isActive && (
                    <div
                      className="absolute bottom-1 left-3 right-3 h-1 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                  )}

                  {/* Dropdown menu */}
                  {showFolderMenu === folder.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowFolderMenu(null); }} />
                      <div className="absolute top-full right-0 mt-1 z-50 w-40 rounded-xl bg-white shadow-xl border border-gray-100 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFolder(folder);
                            setRenameValue(folder.name);
                            setShowFolderMenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {t("media.renameFolder")}
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareFolder(folder.id);
                            setShowFolderMenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          {t("media.shareFolder")}
                        </button>
                        <div className="border-t border-gray-100" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder.id);
                            setShowFolderMenu(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {t("common.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Create folder card */}
            <div
              onClick={() => setShowCreateFolder(true)}
              className="flex-shrink-0 w-28 rounded-2xl border-2 border-dashed border-gray-200 p-3 cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50/30"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500 truncate">{t("media.newFolder")}</p>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs (per-folder) */}
        <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.key
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.label} {tab.count !== undefined ? `(${tab.count})` : ""}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">{t("common.loading")}</p>
          </div>
        ) : !media || media.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
                <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-900">{t("media.noMedia")}</h3>
            <p className="text-sm text-gray-500">{t("media.noMediaDesc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {media.map((item: MediaRecord) => (
              <div
                key={item.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all cursor-grab active:cursor-grabbing ${
                  isSelectionMode && selectedIds.has(item.id) ? "ring-3 ring-purple-500 scale-95" : ""
                } ${draggingId === item.id ? "opacity-40 scale-95" : ""}`}
                onPointerDown={() => handlePointerDown(item.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onClick={() => handleItemClick(item.id)}
              >
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.filename} className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="relative h-full w-full">
                    <video src={item.url} className="h-full w-full object-cover" preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                        <svg className="h-5 w-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selection checkmark */}
                {isSelectionMode && (
                  <div className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selectedIds.has(item.id) ? "bg-purple-500 border-purple-500" : "bg-white/80 border-gray-300"
                  }`}>
                    {selectedIds.has(item.id) && (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Status badge */}
                {!isSelectionMode && item.status === "liked" && (
                  <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 shadow">
                    <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                )}
                {!isSelectionMode && item.status === "unliked" && (
                  <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 shadow">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — go to swipe (within current folder) */}
      {!isSelectionMode && (
        <button
          onClick={handleSwipeNav}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl shadow-purple-300/50 transition-all hover:scale-110 active:scale-95"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      )}

      {/* Bulk Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{t("media.deleteTitle")}</h3>
            <p className="mb-8 text-center text-sm text-gray-500">{t("media.deleteConfirm").replace("{count}", String(selectedIds.size))}</p>
            <div className="space-y-3">
              <button onClick={handleBulkDelete} disabled={isDeleting} className="w-full rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-100 disabled:opacity-50">
                {isDeleting ? t("common.loading") : `${t("common.delete")} (${selectedIds.size})`}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="w-full rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 disabled:opacity-50">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setShowCreateFolder(false)}>
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-xl font-bold text-gray-900">{t("media.newFolder")}</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t("media.folderNamePlaceholder")}
              className="mb-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <div className="mb-6 flex gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`h-8 w-8 rounded-full transition-all ${newFolderColor === color ? "ring-2 ring-offset-2 ring-purple-500 scale-110" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreateFolder(false)} className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-700">{t("common.cancel")}</button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex-1 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50">{t("common.confirm")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => !isDeletingFolder && setFolderToDelete(null)}>
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              {t("media.deleteFolderTitle")} &ldquo;{folders.find((f) => f.id === folderToDelete)?.name}&rdquo;
            </h3>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleDeleteFolder(false)}
                disabled={isDeletingFolder}
                className="w-full rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 disabled:opacity-50"
              >
                <span className="block">{t("media.deleteFolderKeep")}</span>
                <span className="block mt-0.5 text-xs font-normal text-gray-400">{t("media.deleteFolderKeepDesc")}</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(true)}
                disabled={isDeletingFolder}
                className="w-full rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-100 disabled:opacity-50"
              >
                <span className="block">{t("media.deleteFolderAll")}</span>
                <span className="block mt-0.5 text-xs font-normal text-red-200">{t("media.deleteFolderAllDesc")}</span>
              </button>
              <button
                onClick={() => setFolderToDelete(null)}
                disabled={isDeletingFolder}
                className="w-full rounded-2xl bg-gray-50 py-3 text-sm font-bold text-gray-500 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setRenamingFolder(null)}>
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-xl font-bold text-gray-900">{t("media.renameFolder")}</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mb-6 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            />
            <div className="flex gap-3">
              <button onClick={() => setRenamingFolder(null)} className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-700">{t("common.cancel")}</button>
              <button onClick={handleRenameFolder} disabled={!renameValue.trim()} className="flex-1 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50">{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
          onClick={() => setFullscreenMedia(null)}
        >
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {fullscreenMedia.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullscreenMedia.url}
              alt={fullscreenMedia.filename}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={fullscreenMedia.url}
              className="max-h-full max-w-full object-contain"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
