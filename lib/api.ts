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
  folder: "unsorted" | "custom";
  folder_id: string | null;
  status: "pending" | "liked" | "unliked";
  created_at: string;
  updated_at: string;
}

export interface FolderStats {
  total: number;
  pending: number;
  liked: number;
  unliked: number;
}

export interface MediaStats {
  total: number;
  unsorted: FolderStats;
  folders: Record<string, FolderStats>;
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

export async function getMedia(opts?: {
  folder?: string;
  folderId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MediaRecord[]> {
  const { folder, folderId, status, limit = 50, offset = 0 } = opts || {};
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (folder) params.set("folder", folder);
  if (folderId) params.set("folderId", folderId);
  if (status) params.set("status", status);

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
  folderId?: string
): Promise<MediaRecord> {
  const res = await fetch(`${API_BASE_URL}/api/media/${id}/folder`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId: folderId || null }),
  });
  if (!res.ok) throw new Error("Failed to update folder");
  return res.json();
}

export async function updateMediaStatus(
  id: string,
  status: "pending" | "liked" | "unliked"
): Promise<MediaRecord> {
  const res = await fetch(`${API_BASE_URL}/api/media/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
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

export async function deleteFolder(id: string, withMedia?: boolean): Promise<void> {
  const url = withMedia
    ? `${API_BASE_URL}/api/folders/${id}?withMedia=true`
    : `${API_BASE_URL}/api/folders/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

export async function getStorageUsage(): Promise<{ usedBytes: number; maxBytes: number }> {
  const res = await fetch(`${API_BASE_URL}/api/media/storage`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch storage usage");
  return res.json();
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

export async function addPostsToPlanApi(
  planId: string,
  posts: Array<Record<string, unknown>>
): Promise<{ posts: ApiPost[] }> {
  const res = await fetch(`${API_BASE_URL}/api/plans/${planId}/posts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posts }),
  });
  if (!res.ok) throw new Error("Failed to add posts to plan");
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

// Share
export async function shareFolder(folderId: string): Promise<{ share_token: string }> {
  const res = await fetch(`${API_BASE_URL}/api/share/folder/${folderId}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to share folder");
  return res.json();
}

export async function getShareStatus(folderId: string): Promise<{ share_token: string; is_active: boolean } | null> {
  const res = await fetch(`${API_BASE_URL}/api/share/folder/${folderId}`, {
    credentials: "include",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get share status");
  return res.json();
}

export async function updateShareFolder(folderId: string, isActive: boolean): Promise<{ share_token: string; is_active: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/share/folder/${folderId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error("Failed to update share");
  return res.json();
}

export async function getSharedFolder(token: string): Promise<{
  folder: { id: string; name: string; color: string };
  owner_name: string;
  media: MediaRecord[];
  shared_folder_id: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/share/public/${token}`);
  if (!res.ok) throw new Error("Share not found");
  return res.json();
}

export async function submitShareVote(
  token: string,
  data: { voter_name: string; media_id: string; vote: "liked" | "unliked" }
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/share/public/${token}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save vote");
}

export async function getShareVotes(
  token: string,
  voterName: string
): Promise<{ votes: Array<{ media_id: string; vote: string }> }> {
  const res = await fetch(
    `${API_BASE_URL}/api/share/public/${token}/votes/${encodeURIComponent(voterName)}`
  );
  if (!res.ok) throw new Error("Failed to get votes");
  return res.json();
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
