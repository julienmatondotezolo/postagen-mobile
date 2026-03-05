import { createPlanApi } from "./api";
import { getAllPlans, getPostsByIds, type Plan, type Post } from "./db";

const MIGRATION_KEY = "postagen-idb-migrated";

export async function migrateIndexedDBToSupabase(): Promise<void> {
  // Skip if already migrated
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "true") return;

  try {
    const plans = await getAllPlans();

    if (plans.length === 0) {
      // Nothing to migrate
      localStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    console.log(`🔄 Migrating ${plans.length} plans from IndexedDB to Supabase...`);

    for (const plan of plans) {
      try {
        // Get posts for this plan
        const posts: Post[] = await getPostsByIds(plan.postIds);

        const postData = posts.map((p) => ({
          caption: p.caption,
          hashtags: p.hashtags,
          scheduled_date: p.scheduledDate,
          scheduled_time: p.scheduledTime,
          day_name: p.dayName || null,
          sentiment: p.sentiment,
          is_optimized: p.isOptimized,
          thumbnail: p.thumbnail || null,
          // media_id is null because IDB media IDs don't match Supabase UUIDs
          media_id: null,
        }));

        await createPlanApi({
          name: plan.name,
          description: plan.description,
          status: plan.status,
          posts: postData,
        });

        console.log(`✅ Migrated plan: ${plan.name}`);
      } catch (err) {
        console.error(`❌ Failed to migrate plan ${plan.name}:`, err);
      }
    }

    localStorage.setItem(MIGRATION_KEY, "true");
    console.log("✅ Migration complete");
  } catch (err) {
    console.error("Migration error:", err);
  }
}
