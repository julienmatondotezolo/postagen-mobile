import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface MediaFile {
  id: string;
  base64: string; // Store as base64 instead of File/Blob
  type: "image" | "video";
  mimeType: string; // e.g., "image/jpeg", "video/mp4"
  uploadedAt: number;
}

export interface BrandIdentity {
  websiteUrl?: string;
  description?: string;
  analyzedAt?: number;
}

export interface Post {
  id: string;
  mediaId: string;
  caption: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  dayName?: string;
  sentiment: "Very Positive" | "Positive" | "Neutral" | "Negative";
  isOptimized: boolean;
  createdAt: number;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  brandIdentityId?: string;
  postIds: string[]; // Array of post IDs belonging to this plan
  mediaIds: string[]; // Array of media IDs used in this plan
  status: "Draft" | "Scheduled" | "Published"; // Plan status
  createdAt: number;
  updatedAt: number;
  isActive: boolean; // Mark the currently active plan
}

interface PostagenDB extends DBSchema {
  media: {
    key: string;
    value: MediaFile;
    indexes: { "by-uploadedAt": number };
  };
  brandIdentity: {
    key: string;
    value: BrandIdentity;
  };
  posts: {
    key: string;
    value: Post;
    indexes: { "by-scheduledDate": string; "by-createdAt": number };
  };
  plans: {
    key: string;
    value: Plan;
    indexes: { "by-createdAt": number; "by-isActive": number };
  };
}

let dbInstance: IDBPDatabase<PostagenDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PostagenDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<PostagenDB>("postagen-db", 2, {
    upgrade(db, oldVersion) {
      // Media store
      if (!db.objectStoreNames.contains("media")) {
        const mediaStore = db.createObjectStore("media", { keyPath: "id" });
        mediaStore.createIndex("by-uploadedAt", "uploadedAt");
      }

      // Brand identity store
      if (!db.objectStoreNames.contains("brandIdentity")) {
        db.createObjectStore("brandIdentity", { keyPath: "id" });
      }

      // Posts store
      if (!db.objectStoreNames.contains("posts")) {
        const postsStore = db.createObjectStore("posts", { keyPath: "id" });
        postsStore.createIndex("by-scheduledDate", "scheduledDate");
        postsStore.createIndex("by-createdAt", "createdAt");
      } else if (oldVersion < 2) {
        // Add new index for existing store
        const postsStore = db.transaction!.objectStore("posts");
        if (!postsStore.indexNames.contains("by-createdAt")) {
          postsStore.createIndex("by-createdAt", "createdAt");
        }
      }

      // Plans store (new in version 2)
      if (!db.objectStoreNames.contains("plans")) {
        const plansStore = db.createObjectStore("plans", { keyPath: "id" });
        plansStore.createIndex("by-createdAt", "createdAt");
        plansStore.createIndex("by-isActive", "isActive");
      }
    },
  });

  return dbInstance;
}

// Helper function to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to get data URL from base64
export function getMediaUrl(mediaFile: MediaFile): string {
  return mediaFile.base64;
}

// Media operations
export async function saveMedia(file: File): Promise<MediaFile> {
  const db = await getDB();
  const id = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const base64 = await fileToBase64(file);
  const type = file.type.startsWith("video/") ? "video" : "image";

  const mediaFile: MediaFile = {
    id,
    base64,
    type,
    mimeType: file.type,
    uploadedAt: Date.now(),
  };

  await db.put("media", mediaFile);
  return mediaFile;
}

export async function getAllMedia(): Promise<MediaFile[]> {
  const db = await getDB();
  return db.getAll("media");
}

export async function getMediaById(id: string): Promise<MediaFile | undefined> {
  const db = await getDB();
  return db.get("media", id);
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("media", id);
}

export async function clearAllMedia(): Promise<void> {
  const db = await getDB();
  await db.clear("media");
}

// Brand identity operations
export async function saveBrandIdentity(identity: BrandIdentity): Promise<void> {
  const db = await getDB();
  await db.put("brandIdentity", { id: "current", ...identity });
}

export async function getBrandIdentity(): Promise<BrandIdentity | undefined> {
  const db = await getDB();
  return db.get("brandIdentity", "current");
}

// Posts operations
export async function savePost(post: Post): Promise<void> {
  const db = await getDB();
  await db.put("posts", post);
}

export async function getAllPosts(): Promise<Post[]> {
  const db = await getDB();
  return db.getAll("posts");
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const db = await getDB();
  return db.get("posts", id);
}

export async function getPostsByDate(date: string): Promise<Post[]> {
  const db = await getDB();
  const index = db.transaction("posts").store.index("by-scheduledDate");
  return index.getAll(date);
}

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  const db = await getDB();
  const posts: Post[] = [];
  for (const id of ids) {
    const post = await db.get("posts", id);
    if (post) {
      posts.push(post);
    }
  }
  return posts;
}

export async function deletePost(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("posts", id);
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<void> {
  const db = await getDB();
  const post = await db.get("posts", id);
  if (post) {
    await db.put("posts", { ...post, ...updates });
  }
}

export async function clearAllPosts(): Promise<void> {
  const db = await getDB();
  await db.clear("posts");
}

// Plan operations
export async function createPlan(
  name: string,
  postIds: string[],
  mediaIds: string[],
  description?: string,
  status: "Draft" | "Scheduled" | "Published" = "Draft"
): Promise<Plan> {
  const db = await getDB();
  
  // Deactivate all other plans
  const allPlans = await db.getAll("plans");
  for (const plan of allPlans) {
    if (plan.isActive) {
      await db.put("plans", { ...plan, isActive: false, updatedAt: Date.now() });
    }
  }

  const plan: Plan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    postIds,
    mediaIds,
    status, // Default to "Draft"
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
  };

  await db.put("plans", plan);
  return plan;
}

export async function getAllPlans(): Promise<Plan[]> {
  const db = await getDB();
  const plans = await db.getAll("plans");
  // Sort by createdAt descending (newest first)
  return plans.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPlanById(id: string): Promise<Plan | undefined> {
  const db = await getDB();
  return db.get("plans", id);
}

export async function getActivePlan(): Promise<Plan | undefined> {
  const db = await getDB();
  const plans = await db.getAll("plans");
  return plans.find((plan) => plan.isActive);
}

export async function updatePlan(id: string, updates: Partial<Plan>): Promise<void> {
  const db = await getDB();
  const plan = await db.get("plans", id);
  if (plan) {
    await db.put("plans", { ...plan, ...updates, updatedAt: Date.now() });
  }
}

export async function setActivePlan(id: string): Promise<void> {
  const db = await getDB();
  
  // Deactivate all plans
  const allPlans = await db.getAll("plans");
  for (const plan of allPlans) {
    if (plan.isActive) {
      await db.put("plans", { ...plan, isActive: false, updatedAt: Date.now() });
    }
  }

  // Activate the selected plan
  const plan = await db.get("plans", id);
  if (plan) {
    await db.put("plans", { ...plan, isActive: true, updatedAt: Date.now() });
  }
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  const plan = await db.get("plans", id);
  
  if (plan) {
    // Delete all posts associated with this plan
    for (const postId of plan.postIds) {
      await db.delete("posts", postId);
    }
    
    // Delete the plan
    await db.delete("plans", id);
    
    // If this was the active plan, activate the most recent plan
    if (plan.isActive) {
      const remainingPlans = await getAllPlans();
      if (remainingPlans.length > 0) {
        await setActivePlan(remainingPlans[0].id);
      }
    }
  }
}

export async function clearAllPlans(): Promise<void> {
  const db = await getDB();
  await db.clear("plans");
}

// Helper function to get plan with full data (posts and media)
export async function getPlanWithData(planId: string): Promise<{
  plan: Plan;
  posts: (Post & { media?: MediaFile })[];
} | null> {
  const plan = await getPlanById(planId);
  if (!plan) return null;

  const posts = await getPostsByIds(plan.postIds);
  const mediaMap = new Map<string, MediaFile>();
  
  for (const mediaId of plan.mediaIds) {
    const media = await getMediaById(mediaId);
    if (media) {
      mediaMap.set(media.id, media);
    }
  }

  const postsWithMedia = posts.map((post) => ({
    ...post,
    media: mediaMap.get(post.mediaId),
  }));

  return {
    plan,
    posts: postsWithMedia,
  };
}
