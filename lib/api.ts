import { API_BASE_URL } from "./config";

export interface MediaRecord {
  id: string;
  user_id: string;
  url: string;
  storage_path: string;
  type: "image" | "video";
  filename: string;
  size: number;
  mime_type: string;
  folder: "unsorted" | "liked" | "unliked";
  created_at: string;
  updated_at: string;
}

export interface MediaStats {
  total: number;
  unsorted: number;
  liked: number;
  unliked: number;
  customFolders?: Record<string, number>;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  media_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "Draft" | "Scheduled" | "Published";
  is_active: boolean;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiPost {
  id: string;
  user_id: string;
  plan_id: string;
  media_id: string | null;
  caption: string;
  hashtags: string[];
  post_type: string;
  platform_tip: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  day_name: string | null;
  sentiment: string;
  is_optimized: boolean;
  thumbnail: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  updated_at: string;
}

export async function uploadMedia(
  formData: FormData
): Promise<{ media: MediaRecord[]; count: number }> {
  const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function uploadSingleMedia(
  file: File,
  folderId?: string
): Promise<{ media: MediaRecord[]; count: number }> {
  const formData = new FormData();
  formData.append("files", file);
  if (folderId) formData.append("folderId", folderId);
  const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function getMedia(
  folder?: string,
  limit = 50,
  offset = 0
): Promise<MediaRecord[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (folder) params.set("folder", folder);

  const res = await fetch(`${API_BASE_URL}/api/media?${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch media");
  const data = await res.json();
  return data.media;
}

export async function getMediaStats(): Promise<MediaStats> {
  const res = await fetch(`${API_BASE_URL}/api/media/stats`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function updateMediaFolder(
  id: string,
  folder: "liked" | "unliked" | "unsorted"
): Promise<MediaRecord> {
  const res = await fetch(`${API_BASE_URL}/api/media/${id}/folder`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) throw new Error("Failed to update folder");
  return res.json();
}

export async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/media/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete media");
}

// Bulk delete media
export async function bulkDeleteMedia(ids: string[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/media/bulk-delete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to bulk delete media");
}

// Folders
export async function getFolders(): Promise<Folder[]> {
  const res = await fetch(`${API_BASE_URL}/api/folders`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = await res.json();
  return data.folders;
}

export async function createFolder(name: string, color?: string): Promise<Folder> {
  const res = await fetch(`${API_BASE_URL}/api/folders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  return res.json();
}

export async function updateFolder(id: string, updates: { name?: string; color?: string }): Promise<Folder> {
  const res = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update folder");
  return res.json();
}

export async function deleteFolder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

// Plans
export async function getPlans(): Promise<ApiPlan[]> {
  const res = await fetch(`${API_BASE_URL}/api/plans`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  const data = await res.json();
  return data.plans;
}

export async function getPlan(id: string): Promise<{ plan: ApiPlan; posts: ApiPost[] }> {
  const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch plan");
  return res.json();
}

export async function createPlanApi(data: {
  name: string;
  description?: string;
  status?: string;
  posts?: Array<Record<string, unknown>>;
}): Promise<{ plan: ApiPlan; posts: ApiPost[] }> {
  const res = await fetch(`${API_BASE_URL}/api/plans`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create plan");
  return res.json();
}

export async function updatePlanApi(id: string, updates: Record<string, unknown>): Promise<ApiPlan> {
  const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update plan");
  return res.json();
}

export async function deletePlanApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete plan");
}

// Posts
export async function getPost(id: string): Promise<ApiPost> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

export async function updatePostApi(id: string, updates: Record<string, unknown>): Promise<ApiPost> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

export async function deletePostApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

// Auth
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to change password");
  }
}
