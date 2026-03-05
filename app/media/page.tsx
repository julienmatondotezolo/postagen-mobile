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
  type MediaRecord,
  type Folder,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";

type SystemFolder = "all" | "unsorted" | "liked" | "unliked";
type ActiveTab = { type: "system"; key: SystemFolder } | { type: "custom"; folderId: string };

const FOLDER_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444"];

export default function MediaPage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>({ type: "system", key: "all" });

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

  // Drag to folder
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  // Build query key based on active tab
  const queryFolder = activeTab.type === "system" ? activeTab.key : undefined;
  const queryFolderId = activeTab.type === "custom" ? activeTab.folderId : undefined;

  const { data: media, isLoading } = useQuery({
    queryKey: ["media", queryFolder, queryFolderId],
    queryFn: () => {
      if (queryFolderId) {
        return getMedia(undefined, 200, 0).then((all) =>
          all.filter((m) => (m as MediaRecord & { folder_id?: string }).folder_id === queryFolderId)
        );
      }
      return getMedia(queryFolder, 200);
    },
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const { data: stats } = useQuery({
    queryKey: ["media-stats"],
    queryFn: getMediaStats,
  });

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
      if (!isSelectionMode) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [isSelectionMode]
  );

  const handleSelectAll = () => {
    if (!media) return;
    if (selectedIds.size === media.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(media.map((m) => m.id)));
    }
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
      await createFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName("");
      setNewFolderColor(FOLDER_COLORS[0]);
      setShowCreateFolder(false);
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success(t("media.folderCreated"));
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

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      if (activeTab.type === "custom" && activeTab.folderId === folderId) {
        setActiveTab({ type: "system", key: "all" });
      }
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["media-stats"] });
      toast.success(t("media.folderDeleted"));
    } catch {
      toast.error(t("media.folderError"));
    }
    setShowFolderMenu(null);
  };

  // Drag to folder handlers
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

  const handleDrop = useCallback(async (e: React.DragEvent, folderId: string, folderType?: "system") => {
    e.preventDefault();
    setDropTargetFolder(null);
    setDraggingId(null);
    const mediaId = e.dataTransfer.getData("text/plain");
    if (!mediaId) return;

    try {
      if (folderType === "system") {
        await updateMediaFolder(mediaId, folderId as "liked" | "unliked" | "unsorted");
      } else {
        await updateMediaFolder(mediaId, undefined, folderId);
      }
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

  // Swipe navigation — pass current folder context
  const handleSwipeNav = () => {
    if (activeTab.type === "custom") {
      router.push(`/media/swipe?folderId=${activeTab.folderId}`);
    } else if (activeTab.type === "system" && activeTab.key !== "all") {
      router.push(`/media/swipe?folder=${activeTab.key}`);
    } else {
      router.push("/media/swipe?folder=unsorted");
    }
  };

  const systemTabs: { key: SystemFolder; label: string; count: number }[] = [
    { key: "all", label: t("media.all"), count: stats?.total ?? 0 },
    { key: "unsorted", label: t("media.unsorted"), count: stats?.unsorted ?? 0 },
    { key: "liked", label: t("media.liked"), count: stats?.liked ?? 0 },
    { key: "unliked", label: t("media.unliked"), count: stats?.unliked ?? 0 },
  ];

  const isTabActive = (tab: ActiveTab) => {
    if (tab.type === "system" && activeTab.type === "system") return tab.key === activeTab.key;
    if (tab.type === "custom" && activeTab.type === "custom") return tab.folderId === activeTab.folderId;
    return false;
  };

  // System folder icons for the card section
  const systemFolderCards: { key: SystemFolder; icon: React.ReactNode; color: string; bg: string }[] = [
    {
      key: "unsorted",
      color: "text-gray-500",
      bg: "bg-gray-100",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    {
      key: "liked",
      color: "text-pink-500",
      bg: "bg-pink-50",
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      key: "unliked",
      color: "text-gray-400",
      bg: "bg-gray-50",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
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

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {systemTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab({ type: "system", key: tab.key })}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isTabActive({ type: "system", key: tab.key })
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Folder Cards — drag targets */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* System folder cards */}
            {systemFolderCards.map((sf) => {
              const count = sf.key === "unsorted" ? stats?.unsorted : sf.key === "liked" ? stats?.liked : stats?.unliked;
              return (
                <div
                  key={sf.key}
                  onClick={() => setActiveTab({ type: "system", key: sf.key })}
                  onDragOver={(e) => handleDragOver(e, sf.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sf.key, "system")}
                  className={`flex-shrink-0 w-24 rounded-2xl p-3 cursor-pointer transition-all border-2 ${
                    dropTargetFolder === sf.key
                      ? "border-purple-500 scale-105 shadow-lg"
                      : isTabActive({ type: "system", key: sf.key })
                      ? "border-purple-300 bg-white shadow-md"
                      : "border-transparent bg-white/70"
                  }`}
                >
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${sf.bg} ${sf.color}`}>
                    {sf.icon}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {t(`media.${sf.key}`)}
                  </p>
                  <p className="text-[10px] text-gray-400">{count ?? 0}</p>
                </div>
              );
            })}

            {/* Custom folder cards */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setActiveTab({ type: "custom", folderId: folder.id })}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                }}
                className={`relative flex-shrink-0 w-24 rounded-2xl p-3 cursor-pointer transition-all border-2 ${
                  dropTargetFolder === folder.id
                    ? "border-purple-500 scale-105 shadow-lg"
                    : isTabActive({ type: "custom", folderId: folder.id })
                    ? "border-purple-300 bg-white shadow-md"
                    : "border-transparent bg-white/70"
                }`}
              >
                <div
                  className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${folder.color}20` }}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                </div>
                <p className="text-xs font-semibold text-gray-900 truncate">{folder.name}</p>
                <p className="text-[10px] text-gray-400">{folder.media_count}</p>

                {/* Folder context menu */}
                {showFolderMenu === folder.id && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-36 rounded-xl bg-white shadow-xl border border-gray-100 py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingFolder(folder);
                        setRenameValue(folder.name);
                        setShowFolderMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {t("media.renameFolder")}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Create folder card */}
            <div
              onClick={() => setShowCreateFolder(true)}
              className="flex-shrink-0 w-24 rounded-2xl border-2 border-dashed border-gray-200 p-3 cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50/30"
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500 truncate">
                {t("media.newFolder")}
              </p>
            </div>
          </div>
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
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                    />
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
                    selectedIds.has(item.id)
                      ? "bg-purple-500 border-purple-500"
                      : "bg-white/80 border-gray-300"
                  }`}>
                    {selectedIds.has(item.id) && (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Folder badge */}
                {!isSelectionMode && item.folder === "liked" && (
                  <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 shadow">
                    <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                )}
                {!isSelectionMode && item.folder === "unliked" && (
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

      {/* FAB — go to swipe (passes current folder) */}
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

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              {t("media.deleteTitle")}
            </h3>
            <p className="mb-8 text-center text-sm text-gray-500">
              {t("media.deleteConfirm").replace("{count}", String(selectedIds.size))}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="w-full rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? t("common.loading") : `${t("common.delete")} (${selectedIds.size})`}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setShowCreateFolder(false)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up"
            onClick={(e) => e.stopPropagation()}
          >
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
            {/* Color picker */}
            <div className="mb-6 flex gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    newFolderColor === color ? "ring-2 ring-offset-2 ring-purple-500 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-700"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setRenamingFolder(null)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-white p-8 shadow-2xl slide-up"
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={() => setRenamingFolder(null)}
                className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-700"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRenameFolder}
                disabled={!renameValue.trim()}
                className="flex-1 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
