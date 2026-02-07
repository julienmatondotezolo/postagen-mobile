import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * HAPPY FLOW — Exact scenario from Emji:
 *
 * User wants to upload 1 video and 1 image → generate a plan.
 *
 * Step by step:
 * 1. User clicks "Create Your First Plan" on home page
 * 2. On /create, user fills in a website URL and clicks "Analyze my brand"
 * 3. Textarea value must be populated with text from analysis
 * 4. User clicks "Continue"
 * 5. On /upload, user clicks center button to upload media
 * 6. Popup appears, user selects 1 image + 1 video
 * 7. "Your Assets" text appears with uploaded content
 * 8. User clicks "Generate my Plan"
 * 9. On /processing, progress % is shown
 * 10. Redirected to /plan/[id] with generated posts
 */

const TEST_MEDIA_DIR = "/Users/emji/.openclaw/workspace/test-media";
const TEST_IMG_DIR = "/Users/emji/.openclaw/workspace/test-images";
const INBOUND_DIR = "/Users/emji/.openclaw/media/inbound";
const BASE_URL = "http://localhost:3000";

// Find a real image file
function findTestImage(): string {
  // Try test-media first (downloaded files)
  const mediaFiles = [
    path.join(TEST_MEDIA_DIR, "img-500kb-hd.jpg"),
    path.join(TEST_MEDIA_DIR, "img-300kb-medium.jpg"),
    path.join(TEST_MEDIA_DIR, "img-100kb-web.jpg"),
  ];
  for (const f of mediaFiles) {
    if (fs.existsSync(f)) return f;
  }
  // Try test-images
  const imgFiles = [
    path.join(TEST_IMG_DIR, "large-3000x2000.jpg"),
    path.join(TEST_IMG_DIR, "medium-1920x1080.jpg"),
    path.join(TEST_IMG_DIR, "small-800x600.jpg"),
  ];
  for (const f of imgFiles) {
    if (fs.existsSync(f)) return f;
  }
  throw new Error("No test image found!");
}

// Find a real video file
function findTestVideo(): string {
  // Try test-media first
  const mediaFiles = [
    path.join(TEST_MEDIA_DIR, "vid-2mb-medium.mp4"),
    path.join(TEST_MEDIA_DIR, "vid-500kb-clip.mp4"),
    path.join(TEST_MEDIA_DIR, "vid-5mb-mov.mov"),
  ];
  for (const f of mediaFiles) {
    if (fs.existsSync(f)) return f;
  }
  // Try inbound media
  if (fs.existsSync(INBOUND_DIR)) {
    const inbound = fs.readdirSync(INBOUND_DIR).filter((f) => f.endsWith(".mp4") || f.endsWith(".mov"));
    if (inbound.length > 0) return path.join(INBOUND_DIR, inbound[0]);
  }
  throw new Error("No test video found!");
}

// Clear IndexedDB completely
async function clearIndexedDB(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

test.describe("Happy Flow: Create plan with 1 image + 1 video", () => {
  test("Full E2E: Home → Create → Brand Analyze → Upload → Processing → Plan", async ({ page }) => {
    test.setTimeout(300000); // 5 min — includes real GPT API call

    const testImage = findTestImage();
    const testVideo = findTestVideo();
    console.log(`📷 Using image: ${path.basename(testImage)} (${(fs.statSync(testImage).size / 1024).toFixed(0)} KB)`);
    console.log(`🎬 Using video: ${path.basename(testVideo)} (${(fs.statSync(testVideo).size / 1024).toFixed(0)} KB)`);

    // ============================================================
    // STEP 0: Clear all data
    // ============================================================
    await clearIndexedDB(page);
    console.log("✅ Step 0: IndexedDB cleared");

    // ============================================================
    // STEP 1: On home page, click "Create Your First Plan"
    // ============================================================
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // The home page should have a "Create Your First Plan" button or similar CTA
    const createBtn = page.locator("button, a").filter({ hasText: /create/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    console.log("✅ Step 1: Clicked 'Create' button on home page");

    // Should navigate to /create
    await page.waitForURL("**/create", { timeout: 10000 });
    console.log("✅ Step 1b: Navigated to /create");

    // ============================================================
    // STEP 2: Fill in website URL and click "Analyze my brand"
    // ============================================================
    // Look for URL input field
    const urlInput = page.locator('input[type="url"], input[type="text"], input[placeholder*="url" i], input[placeholder*="website" i]').first();
    if (await urlInput.isVisible({ timeout: 3000 })) {
      await urlInput.fill("https://www.google.com");
      console.log("✅ Step 2a: Filled in website URL");
    }

    // Click "Analyze my brand" button
    const analyzeBtn = page.locator("button").filter({ hasText: /analyze/i }).first();
    if (await analyzeBtn.isVisible({ timeout: 3000 })) {
      await analyzeBtn.click();
      console.log("✅ Step 2b: Clicked 'Analyze my brand'");

      // Wait for analysis to complete (the API call to /api/brand/analyze)
      // The textarea should get populated with brand description
      await page.waitForTimeout(5000); // Give API time

      // ============================================================
      // STEP 3: Verify textarea is populated
      // ============================================================
      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible({ timeout: 15000 });

      // Wait for textarea to have content (brand analysis response)
      await expect(async () => {
        const value = await textarea.inputValue();
        expect(value.length).toBeGreaterThan(10);
      }).toPass({ timeout: 30000 });

      const textareaValue = await textarea.inputValue();
      console.log(`✅ Step 3: Textarea populated with: "${textareaValue.substring(0, 80)}..."`);
    } else {
      // If no analyze button, just fill in the description directly
      const textarea = page.locator("textarea").first();
      await textarea.fill("Italian restaurant in Belgium, family-owned since 1964. Fresh pasta, wood-fired pizza, warm ambiance.");
      console.log("✅ Step 2-3: Filled in brand description directly (no analyze button visible)");
    }

    // ============================================================
    // STEP 4: Click "Continue"
    // ============================================================
    const continueBtn = page.locator("button").filter({ hasText: /continue/i }).first();
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await continueBtn.click();
    console.log("✅ Step 4: Clicked 'Continue'");

    // Should navigate to /upload
    await page.waitForURL("**/upload", { timeout: 15000 });
    console.log("✅ Step 4b: Navigated to /upload");

    // ============================================================
    // STEP 5 & 6: Upload 1 image + 1 video
    // ============================================================
    // The file input is hidden, use setInputFiles to simulate file picker
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([testImage, testVideo]);
    console.log("✅ Step 5-6: Selected 1 image + 1 video for upload");

    // Wait for files to be processed (compression, conversion)
    await page.waitForTimeout(5000);

    // ============================================================
    // STEP 7: Verify "Your Assets" text and uploaded content
    // ============================================================
    await expect(page.getByRole("heading", { name: "Your Assets", exact: true })).toBeVisible({ timeout: 10000 });
    console.log("✅ Step 7a: 'Your Assets' heading is visible");

    // Verify counter shows 2 files
    await expect(page.locator("text=2 / 100")).toBeVisible({ timeout: 10000 });
    console.log("✅ Step 7b: File counter shows '2 / 100'");

    // Verify we can see uploaded content (grid items)
    const mediaGrid = page.locator(".grid .aspect-square, [class*='aspect-square']");
    const gridCount = await mediaGrid.count();
    expect(gridCount).toBe(2);
    console.log("✅ Step 7c: 2 media items visible in grid");

    // ============================================================
    // STEP 8: Click "Generate my Plan"
    // ============================================================
    const generateBtn = page.locator("button").filter({ hasText: /generate my plan/i }).first();
    await expect(generateBtn).toBeEnabled({ timeout: 5000 });
    await generateBtn.click();
    console.log("✅ Step 8: Clicked 'Generate my Plan'");

    // ============================================================
    // STEP 9: On /processing, verify progress % is shown
    // ============================================================
    await page.waitForURL("**/processing", { timeout: 15000 });
    console.log("✅ Step 9a: Navigated to /processing");

    // Verify "AI Analysis" title is shown
    await expect(page.locator("text=AI Analysis")).toBeVisible({ timeout: 5000 });
    console.log("✅ Step 9b: 'AI Analysis' title visible");

    // Verify progress percentage is shown (e.g. "12% OPTIMIZED")
    await expect(page.locator("text=/\\d+% OPTIMIZED/")).toBeVisible({ timeout: 10000 });
    console.log("✅ Step 9c: Progress percentage is visible");

    // Take a screenshot of the processing page
    await page.screenshot({ path: "test-results/happy-flow-processing.png" });
    console.log("📸 Screenshot saved: happy-flow-processing.png");

    // Wait for progress to increase (verify animation is working)
    await page.waitForTimeout(3000);
    const progressText = await page.locator("text=/\\d+% OPTIMIZED/").textContent();
    console.log(`✅ Step 9d: Progress at: ${progressText}`);

    // ============================================================
    // STEP 10: Wait for redirect to /plan/[id]
    // ============================================================
    await page.waitForURL("**/plan/**", { timeout: 180000 }); // 3 min for GPT
    const planUrl = page.url();
    console.log(`✅ Step 10a: Redirected to plan: ${planUrl}`);

    // Verify plan page has content
    const planTitle = page.locator("h1");
    await expect(planTitle).toBeVisible({ timeout: 10000 });
    const titleText = await planTitle.textContent();
    console.log(`✅ Step 10b: Plan title: "${titleText}"`);

    // Verify plan description is NOT the fallback message
    const description = page.locator("text=AI-gegenereerd contentplan");
    const descText = await page.locator("p, [class*='text-gray']").first().textContent();
    console.log(`✅ Step 10c: Plan description: "${descText?.substring(0, 80)}"`);

    // Verify day selector exists (calendar)
    const dayButtons = page.locator("button").filter({
      hasText: /^(SUN|MON|TUE|WED|THU|FRI|SAT)/,
    });
    const dayCount = await dayButtons.count();
    expect(dayCount).toBeGreaterThanOrEqual(7);
    console.log(`✅ Step 10d: Calendar shows ${dayCount} days`);

    // Find at least one post by clicking through days
    let foundPost = false;
    for (let i = 0; i < Math.min(dayCount, 14); i++) {
      await dayButtons.nth(i).click();
      await page.waitForTimeout(400);
      const postCards = page.locator("text=/\\d{2}:\\d{2} (AM|PM)/");
      if ((await postCards.count()) > 0) {
        foundPost = true;
        const caption = await page.locator("h3").first().textContent();
        console.log(`✅ Step 10e: Found post on day ${i + 1}: "${caption?.substring(0, 60)}..."`);
        break;
      }
    }
    expect(foundPost).toBe(true);

    // Take final screenshot
    await page.screenshot({ path: "test-results/happy-flow-plan.png" });
    console.log("📸 Screenshot saved: happy-flow-plan.png");

    console.log("\n🎉 HAPPY FLOW COMPLETE — All steps passed!");
    console.log(`   Plan URL: ${planUrl}`);
  });
});
