"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadSingleMedia } from "./api";

interface UploadFile {
  name: string;
  file: File | null;
  status: "pending" | "uploading" | "done" | "error";
}

interface UploadState {
  isUploading: boolean;
  files: UploadFile[];
  completedCount: number;
  totalCount: number;
  folderId: string | null;
  popupVisible: boolean;
  popupMinimized: boolean;
  showDoneMessage: boolean;
}

type UploadFileEvent = "done" | "error" | "allDone";

interface UploadContextValue extends UploadState {
  startUpload: (files: File[], folderId: string, onFileComplete?: (event: UploadFileEvent) => void) => void;
  dismissPopup: () => void;
  minimizePopup: () => void;
  expandPopup: () => void;
  percent: number;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
}

const initialState: UploadState = {
  isUploading: false,
  files: [],
  completedCount: 0,
  totalCount: 0,
  folderId: null,
  popupVisible: false,
  popupMinimized: false,
  showDoneMessage: false,
};

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const queryClient = useQueryClient();
  const uploadingRef = useRef(false);
  const onFileCompleteRef = useRef<((event: UploadFileEvent) => void) | undefined>(undefined);

  const startUpload = useCallback(
    (files: File[], folderId: string, onFileComplete?: (event: UploadFileEvent) => void) => {
      if (uploadingRef.current) return;
      uploadingRef.current = true;
      onFileCompleteRef.current = onFileComplete;

      const uploadFiles: UploadFile[] = files.map((f) => ({
        name: f.name,
        file: f,
        status: "pending" as const,
      }));

      setState({
        isUploading: true,
        files: uploadFiles,
        completedCount: 0,
        totalCount: files.length,
        folderId,
        popupVisible: true,
        popupMinimized: false,
        showDoneMessage: false,
      });

      // Run upload loop async
      (async () => {
        let completed = 0;

        for (let i = 0; i < uploadFiles.length; i++) {
          // Mark current as uploading
          setState((prev) => ({
            ...prev,
            files: prev.files.map((f, idx) =>
              idx === i ? { ...f, status: "uploading" } : f
            ),
          }));

          try {
            await uploadSingleMedia(
              uploadFiles[i].file!,
              folderId || undefined
            );
            completed++;
            setState((prev) => ({
              ...prev,
              completedCount: completed,
              files: prev.files.map((f, idx) =>
                idx === i ? { ...f, status: "done", file: null } : f
              ),
            }));
            onFileCompleteRef.current?.("done");
          } catch {
            completed++;
            setState((prev) => ({
              ...prev,
              completedCount: completed,
              files: prev.files.map((f, idx) =>
                idx === i ? { ...f, status: "error", file: null } : f
              ),
            }));
            onFileCompleteRef.current?.("error");
          }
        }

        // Done
        onFileCompleteRef.current?.("allDone");
        setState((prev) => ({
          ...prev,
          isUploading: false,
          showDoneMessage: true,
          popupVisible: true,
          popupMinimized: false,
        }));
        uploadingRef.current = false;
        onFileCompleteRef.current = undefined;

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["media-stats"] });
        queryClient.invalidateQueries({ queryKey: ["media-recent"] });
        queryClient.invalidateQueries({ queryKey: ["media"] });
        queryClient.invalidateQueries({ queryKey: ["folders"] });
      })();
    },
    [queryClient]
  );

  const dismissPopup = useCallback(() => {
    setState(initialState);
  }, []);

  const minimizePopup = useCallback(() => {
    setState((prev) => ({ ...prev, popupMinimized: true }));
  }, []);

  const expandPopup = useCallback(() => {
    setState((prev) => ({ ...prev, popupMinimized: false }));
  }, []);

  const percent =
    state.totalCount > 0
      ? Math.round((state.completedCount / state.totalCount) * 100)
      : 0;

  return (
    <UploadContext.Provider
      value={{ ...state, startUpload, dismissPopup, minimizePopup, expandPopup, percent }}
    >
      {children}
    </UploadContext.Provider>
  );
}
