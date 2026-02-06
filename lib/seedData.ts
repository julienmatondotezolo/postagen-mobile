import { saveMedia, savePost, saveBrandIdentity, createPlan, type MediaFile, type Post } from "./db";

// Unsplash images - using direct image URLs that work with CORS
// Using images.unsplash.com which allows cross-origin requests
const UNSPLASH_IMAGES = [
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=800&fit=crop&q=80", // workspace
  "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&h=800&fit=crop&q=80", // coffee
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop&q=80", // plant
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=800&fit=crop&q=80", // technology
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=800&fit=crop&q=80", // business
  "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800&h=800&fit=crop&q=80", // creative
  "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=800&fit=crop&q=80", // productivity
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=800&fit=crop&q=80", // minimal
];

const CAPTIONS = [
  "Transforming your workflow with AI that actually understands your brand. #Postagene empowers creatives to focus on what matters. ✨",
  "The Golden Hour Strategy. Timing isn't everything, It's the only thing when it comes to engaging your audience.",
  "Elevating your digital presence through AI. In a world of noise, stand out with content that speaks your brand's true language.",
  "Work smarter, not harder. Let AI handle the heavy lifting while you focus on what you do best.",
  "Your brand story deserves to be told. We help you craft narratives that resonate and convert.",
  "From concept to content in seconds. Experience the future of social media management.",
  "Quality over quantity. Every post is crafted with intention and optimized for maximum impact.",
  "Join the AI revolution. Transform how you create, schedule, and publish content.",
];

const HASHTAGS_SETS = [
  ["#AIBranding", "#ContentStrategy", "#FutureOfWork", "#Productivity"],
  ["#SocialMedia", "#Marketing", "#DigitalStrategy", "#Growth"],
  ["#ContentCreation", "#Automation", "#Innovation", "#Tech"],
  ["#BrandIdentity", "#Creative", "#Design", "#Business"],
  ["#MarketingTips", "#SocialMediaMarketing", "#ContentMarketing", "#DigitalMarketing"],
  ["#ProductivityHacks", "#Workflow", "#Efficiency", "#Tools"],
  ["#CreativeWork", "#Inspiration", "#DesignThinking", "#Innovation"],
  ["#BusinessGrowth", "#Entrepreneurship", "#Startup", "#Success"],
];

const SENTIMENTS: Post["sentiment"][] = [
  "Very Positive",
  "Positive",
  "Very Positive",
  "Positive",
  "Very Positive",
  "Positive",
  "Very Positive",
  "Positive",
];

const TIMES = ["09:00 AM", "12:00 PM", "03:00 PM", "06:30 PM", "09:00 PM"];

/**
 * Fetches an image from Unsplash and converts it to a File object
 */
async function fetchImageAsFile(url: string, filename: string): Promise<File> {
  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    // Ensure we have a valid image type
    const type = blob.type || "image/jpeg";
    return new File([blob], filename, { type });
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    throw error;
  }
}

/**
 * Seeds the database with dummy data, using existing uploaded images first,
 * then filling with Unsplash images if needed
 */
export async function seedDummyData(): Promise<{
  mediaCount: number;
  postsCount: number;
  existingMedia: number;
  newMedia: number;
}> {
  try {
    const { getAllMedia } = await import("./db");
    
    // 1. Check for existing uploaded images
    const existingMedia = await getAllMedia();
    const mediaFiles: MediaFile[] = [...existingMedia];
    
    console.log(`Found ${existingMedia.length} existing media files`);

    // 2. Save brand identity if not exists
    await saveBrandIdentity({
      websiteUrl: "https://example.com",
      description: "A modern brand focused on AI-powered content creation and social media management. We help businesses establish their digital presence with intelligent automation.",
      analyzedAt: Date.now(),
    });

    // 3. If we need more images, fetch from Unsplash
    const targetImageCount = 8;
    const neededImages = Math.max(0, targetImageCount - existingMedia.length);
    let newMediaCount = 0;

    if (neededImages > 0) {
      console.log(`Fetching ${neededImages} images from Unsplash...`);
      
      for (let i = 0; i < neededImages && i < UNSPLASH_IMAGES.length; i++) {
        try {
          const filename = `unsplash-image-${i + 1}.jpg`;
          const file = await fetchImageAsFile(UNSPLASH_IMAGES[i], filename);
          const mediaFile = await saveMedia(file);
          mediaFiles.push(mediaFile);
          newMediaCount++;
          
          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to fetch image ${i + 1}:`, error);
          // Continue with next image
        }
      }
    }

    // CRITICAL: Never create posts without media files
    if (mediaFiles.length === 0) {
      throw new Error("No images available. Please upload some images first or check your internet connection.");
    }

    console.log(`Total media files available: ${mediaFiles.length} (${existingMedia.length} existing + ${newMediaCount} new)`);

    // 3. Create posts for the next 5 days
    // IMPORTANT: We only create as many posts as we have media files (1:1 relationship)
    const posts: Post[] = [];
    const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const today = new Date();
    let postCount = 0;
    
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayIndex);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = days[dayIndex];

      // Create 1-2 posts per day, but ONLY if we have enough media files
      const postsPerDay = dayIndex < 2 ? 2 : 1;
      
      for (let postIndex = 0; postIndex < postsPerDay; postIndex++) {
        // Stop if we've used all available media files
        if (postCount >= mediaFiles.length) {
          break;
        }
        
        const media = mediaFiles[postCount];
        const captionIndex = postCount % CAPTIONS.length;

        const post: Post = {
          id: `post-${Date.now()}-${dayIndex}-${postIndex}`,
          mediaId: media.id,
          caption: CAPTIONS[captionIndex],
          hashtags: HASHTAGS_SETS[captionIndex % HASHTAGS_SETS.length],
          scheduledDate: dateStr,
          scheduledTime: TIMES[postIndex % TIMES.length],
          dayName,
          sentiment: SENTIMENTS[captionIndex % SENTIMENTS.length],
          isOptimized: true,
          createdAt: Date.now() - (dayIndex * 24 * 60 * 60 * 1000),
        };

        await savePost(post);
        posts.push(post);
        postCount++;
      }
      
      // Break outer loop if we've used all media files
      if (postCount >= mediaFiles.length) {
        break;
      }
    }

    // 4. Create a plan for these posts (with Draft status)
    const postIds = posts.map(post => post.id);
    const mediaIds = mediaFiles.map(media => media.id);
    
    await createPlan(
      "Weekly Strategy - " + today.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      postIds,
      mediaIds,
      "AI-generated content plan for the week. Optimized for maximum engagement.",
      "Draft"
    );

    return {
      mediaCount: mediaFiles.length,
      postsCount: posts.length,
      existingMedia: existingMedia.length,
      newMedia: newMediaCount,
    };
  } catch (error) {
    console.error("Error seeding dummy data:", error);
    throw error;
  }
}

/**
 * Clears all data from the database
 */
export async function clearAllData(): Promise<void> {
  try {
    const { getDB, getAllMedia } = await import("./db");
    const db = await getDB();
    
    // Clear media
    const allMedia = await getAllMedia();
    for (const media of allMedia) {
      URL.revokeObjectURL(media.url);
    }
    await db.clear("media");

    // Clear posts
    await db.clear("posts");

    // Clear brand identity
    await db.clear("brandIdentity");
    
    // Clear plans
    await db.clear("plans");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}
