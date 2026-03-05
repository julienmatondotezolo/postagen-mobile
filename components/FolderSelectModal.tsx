"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFolders, createFolder, type Folder } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";

interface FolderSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
}

const FOLDER_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444",
];

export default function FolderSelectModal({
  isOpen,
  onClose,
  onSelect,
}: FolderSelectModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const color = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
      const folder = await createFolder(newName.trim(), color);
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      setNewName("");
      setShowCreate(false);
      onSelect(folder.id);
    } catch {
      // stay open on error
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm backdrop-enter"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[32px] bg-white pb-8 shadow-2xl slide-up max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Title */}
        <h3 className="px-6 pb-4 text-lg font-bold text-gray-900">
          {t("upload.selectFolder")}
        </h3>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto px-6 space-y-2">
          {/* Unsorted option */}
          <button
            onClick={() => { haptics.tap(); onSelect(""); }}
            className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 text-left transition-all hover:bg-gray-100 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-200">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{t("upload.unsortedFolder")}</p>
            </div>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Custom folders */}
          {folders.map((folder: Folder) => (
            <button
              key={folder.id}
              onClick={() => { haptics.tap(); onSelect(folder.id); }}
              className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3.5 text-left transition-all hover:bg-gray-100 active:scale-[0.98]"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${folder.color}20` }}
              >
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{folder.name}</p>
                <p className="text-xs text-gray-500">{folder.media_count} media</p>
              </div>
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Create new folder */}
        <div className="px-6 pt-4">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                onFocus={() => haptics.tap()}
                placeholder={t("media.folderNamePlaceholder")}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:bg-purple-700"
              >
                {creating ? "..." : t("common.save")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-purple-200 py-3.5 text-sm font-semibold text-purple-600 transition-all hover:border-purple-400 hover:bg-purple-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t("upload.createNewFolder")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
