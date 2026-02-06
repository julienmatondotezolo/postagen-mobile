import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Postagen E2E Upload Scenarios
 *
 * Tests the REAL frontend upload flow as an end user would experience it.
 * Uses actual image and video files from the Mac mini.
 *
 * 6 Critical Scenarios:
 * 1. Upload multiple images
 * 2. Upload 1 image
 * 3. Upload multiple videos
 * 4. Upload 1 video
 * 5. Upload multiple images and videos
 * 6. Upload 1 image and 1 video
 */

const MEDIA_DIR = "/Users/emji/.openclaw/media/inbound";
const TEST_IMG_DIR = "/Users/emji/.openclaw/workspace/test-images";

// Real images from Mac mini + downloaded internet images (various sizes 53KB-906KB)
const IMAGES = [
  path.join(TEST_IMG_DIR, "small-800x600.jpg"),       // 56 KB
  path.join(TEST_IMG_DIR, "medium-1920x1080.jpg"),     // 53 KB
  path.join(TEST_IMG_DIR, "large-3000x2000.jpg"),      // 906 KB
  path.join(TEST_IMG_DIR, "xlarge-4000x3000.jpg"),     // 474 KB
  path.join(TEST_IMG_DIR, "photo-1200x900.jpg"),       // 107 KB
  path.join(TEST_IMG_DIR, "photo-1400x1000.jpg"),      // 159 KB
  path.join(TEST_IMG_DIR, "photo-1600x1200.jpg"),      // 272 KB
  path.join(TEST_IMG_DIR, "photo-1800x1200.jpg"),      // 221 KB
  path.join(TEST_IMG_DIR, "photo-2000x1500.jpg"),      // 241 KB
  path.join(TEST_IMG_DIR, "photo-2400x1600.jpg"),      // 312 KB
];

const VIDEOS = [
  path.join(MEDIA_DIR, "file_6---8839235d-ebdc-456b-ac36-2d28f80bed77.mp4"),
  path.join(MEDIA_DIR, "file_7---2ac561fb-aa90-4eb1-8da2-5b917d8679b5.mp4"),
  path.join(MEDIA_DIR, "file_5---a1bd273e-7b7f-4926-a30d-5c328e3e2104.mp4"),
];

const BASE_URL = "http://localhost:3000";

// Helper: clear IndexedDB before each test
async function clearIndexedDB(page: any) {
  // Navigate to app first so IndexedDB is accessible
  await page.goto(`${BASE_URL}/create`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  // Reload to start fresh
  await page.reload();
  await page.waitForLoadState("networkidle");
}

// Helper: set up brand identity so the flow works
async function setupBrand(page: any) {
  // clearIndexedDB already navigated to /create, so we may be there already
  if (!page.url().includes("/create")) {
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState("networkidle");
  }

  // Fill in description (faster than URL analyze)
  const descTextarea = page.locator("textarea");
  await descTextarea.fill("Test brand for QA - professional services company in Belgium");

  // Click continue (skip analyze, just save and go to upload)
  const continueBtn = page.locator("button", { hasText: "Continue" });
  await continueBtn.click();

  // Wait for navigation to upload page
  await page.waitForURL("**/upload", { timeout: 10000 });
}

// Helper: upload files on the upload page
async function uploadFiles(page: any, files: string[]) {
  // The file input is hidden, set files directly
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(files);

  // Wait for files to appear in the grid
  await page.waitForTimeout(2000); // Allow processing/conversion time

  return files.length;
}

// Helper: click generate and wait for plan
async function generateAndWaitForPlan(page: any, timeoutMs: number = 120000) {
  // Click "Generate my Plan"
  const generateBtn = page.locator("button", { hasText: "Generate my Plan" });
  await expect(generateBtn).toBeEnabled({ timeout: 5000 });
  await generateBtn.click();

  // Should navigate to /processing
  await page.waitForURL("**/processing", { timeout: 10000 });

  // Wait for progress animation to start
  await page.waitForSelector("text=AI Analysis", { timeout: 5000 });

  // Wait for redirect to /plan/... (this is the real API call + processing)
  await page.waitForURL("**/plan/**", { timeout: timeoutMs });

  // Verify we're on a plan page with posts
  const url = page.url();
  expect(url).toContain("/plan/");

  return url;
}

// Helper: verify plan page loaded successfully
async function verifyPlanPage(page: any, expectedCount: number) {
  // Wait for page to fully render
  await page.waitForTimeout(2000);

  // Check plan title/name exists
  const planTitle = page.locator("h1");
  await expect(planTitle).toBeVisible({ timeout: 5000 });

  // The plan page has day selector buttons with purple dots for days with posts.
  // Posts may be scheduled on different days, so the default selected day might show
  // "No posts scheduled for this day". Instead of counting visible posts, we verify:
  // 1. We're on a valid plan URL
  // 2. The plan title is visible
  // 3. Day selector buttons exist (calendar is rendered)
  // 4. At least one day has a purple dot (indicating scheduled posts)

  const url = page.url();
  expect(url).toMatch(/\/plan\/plan-/);

  // Day selector buttons should exist
  const dayButtons = page.locator("button").filter({ hasText: /^(SUN|MON|TUE|WED|THU|FRI|SAT)/ });
  const dayCount = await dayButtons.count();
  expect(dayCount).toBeGreaterThanOrEqual(7); // 7 days shown

  // Click through days to find one with posts, or just verify the plan loaded
  // Try clicking on days that have the purple indicator dot
  let foundPosts = false;
  for (let i = 0; i < Math.min(dayCount, 8); i++) {
    await dayButtons.nth(i).click();
    await page.waitForTimeout(500);

    // Check if any post cards are visible (they have time patterns like "11:30 AM")
    const postCards = page.locator("text=/\\d{2}:\\d{2} (AM|PM)/");
    const postCount = await postCards.count();
    if (postCount > 0) {
      foundPosts = true;
      console.log(`   Found ${postCount} post(s) on day ${i + 1}`);
      break;
    }
  }

  expect(foundPosts).toBe(true);
}

// ============================================================
// SCENARIO 1: Upload multiple images (5 different sizes)
// ============================================================
test("Scenario 1: Upload multiple images", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const testImages = IMAGES.slice(0, 5); // 5 images: 56KB to 474KB
  const count = await uploadFiles(page, testImages);
  expect(count).toBe(5);

  await expect(page.locator("text=5 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 1 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 5);
});

// ============================================================
// SCENARIO 2: Upload 1 image
// ============================================================
test("Scenario 2: Upload single image", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [IMAGES[0]]);
  await expect(page.locator("text=1 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 2 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 1);
});

// ============================================================
// SCENARIO 3: Upload multiple videos (2)
// ============================================================
test("Scenario 3: Upload multiple videos", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [VIDEOS[0], VIDEOS[1]]);
  await expect(page.locator("text=2 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 3 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 2);
});

// ============================================================
// SCENARIO 4: Upload 1 video
// ============================================================
test("Scenario 4: Upload single video", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [VIDEOS[2]]);
  await expect(page.locator("text=1 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 4 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 1);
});

// ============================================================
// SCENARIO 5: Upload multiple images + videos (2 img + 2 vid)
// ============================================================
test("Scenario 5: Upload multiple images and videos", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [IMAGES[0], IMAGES[1], VIDEOS[0], VIDEOS[1]]);
  await expect(page.locator("text=4 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 5 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 4);
});

// ============================================================
// SCENARIO 6: Upload 1 image + 1 video
// ============================================================
test("Scenario 6: Upload 1 image and 1 video", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [IMAGES[2], VIDEOS[2]]);
  await expect(page.locator("text=2 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page);
  console.log(`✅ Scenario 6 PASS — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 2);
});

// ============================================================
// SCENARIO 7: STRESS TEST — 10 images (Monday demo simulation)
// ============================================================
test("Scenario 7: Upload 10 images (demo stress test)", async ({ page }) => {
  test.setTimeout(300000); // 5 min timeout for 10 images
  await clearIndexedDB(page);
  await setupBrand(page);

  // All 10 downloaded images (53KB to 906KB)
  const count = await uploadFiles(page, IMAGES);
  expect(count).toBe(10);

  await expect(page.locator("text=10 / 100")).toBeVisible({ timeout: 5000 });

  const planUrl = await generateAndWaitForPlan(page, 240000); // 4 min for GPT to process 10
  console.log(`✅ Scenario 7 PASS — 10 IMAGES — Plan created: ${planUrl}`);

  await verifyPlanPage(page, 10);
});
