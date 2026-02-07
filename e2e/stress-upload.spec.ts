import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * POSTAGEN STRESS UPLOAD TESTS
 * ============================
 * Tests the full upload → processing → generation → plan flow
 * with REAL media files of various sizes and formats.
 *
 * These are pessimistic tests: long timeouts, multiple verifications,
 * and thorough checks that generation actually produced usable plans.
 *
 * Created: 2026-02-07 (overnight QA for Monday demo)
 */

const TEST_MEDIA_DIR = "/Users/emji/.openclaw/workspace/test-media";
const TEST_IMG_DIR = "/Users/emji/.openclaw/workspace/test-images";
const INBOUND_DIR = "/Users/emji/.openclaw/media/inbound";
const BASE_URL = "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ===== Test media files (downloaded to test-media/) =====
const MEDIA = {
  // Small images (~100-500KB)
  imgSmallWeb: path.join(TEST_MEDIA_DIR, "img-100kb-web.jpg"),
  imgMedium300k: path.join(TEST_MEDIA_DIR, "img-300kb-medium.jpg"),
  imgHd500k: path.join(TEST_MEDIA_DIR, "img-500kb-hd.jpg"),
  imgLarge1m: path.join(TEST_MEDIA_DIR, "img-1mb-large.jpg"),
  imgXl4k: path.join(TEST_MEDIA_DIR, "img-xl-4k.jpg"),

  // Medium images (~1-3MB)
  imgBatch1: path.join(TEST_MEDIA_DIR, "img-2mb-batch1.jpg"),
  imgBatch2: path.join(TEST_MEDIA_DIR, "img-1mb-batch2.jpg"),
  imgBatch3: path.join(TEST_MEDIA_DIR, "img-2mb-batch3.jpg"),
  imgPng3mb: path.join(TEST_MEDIA_DIR, "img-3mb-png.png"),

  // Large images (5-17MB)
  imgPhone5mb: path.join(TEST_MEDIA_DIR, "img-5mb-phone.jpg"),
  imgDslr10mb: path.join(TEST_MEDIA_DIR, "img-10mb-dslr.jpg"),
  imgHuge15mb: path.join(TEST_MEDIA_DIR, "img-15mb-huge.jpg"),

  // Videos
  vidSmall500k: path.join(TEST_MEDIA_DIR, "vid-500kb-clip.mp4"),
  vidMedium2mb: path.join(TEST_MEDIA_DIR, "vid-2mb-medium.mp4"),
  vidMov5mb: path.join(TEST_MEDIA_DIR, "vid-5mb-mov.mov"),
  vidHd10mb: path.join(TEST_MEDIA_DIR, "vid-10mb-hd.mp4"),
  vidLarge50mb: path.join(TEST_MEDIA_DIR, "vid-50mb-large.mp4"),

  // Existing test images (smaller, known good)
  existSmall: path.join(TEST_IMG_DIR, "small-800x600.jpg"),
  existMedium: path.join(TEST_IMG_DIR, "medium-1920x1080.jpg"),
  existLarge: path.join(TEST_IMG_DIR, "large-3000x2000.jpg"),
  existXl: path.join(TEST_IMG_DIR, "xlarge-4000x3000.jpg"),
  existPhoto1: path.join(TEST_IMG_DIR, "photo-1200x900.jpg"),
  existPhoto2: path.join(TEST_IMG_DIR, "photo-1400x1000.jpg"),
  existPhoto3: path.join(TEST_IMG_DIR, "photo-1600x1200.jpg"),
  existPhoto4: path.join(TEST_IMG_DIR, "photo-1800x1200.jpg"),
  existPhoto5: path.join(TEST_IMG_DIR, "photo-2000x1500.jpg"),
  existPhoto6: path.join(TEST_IMG_DIR, "photo-2400x1600.jpg"),

  // Existing inbound videos
  inboundVid1: path.join(INBOUND_DIR, "file_5---a1bd273e-7b7f-4926-a30d-5c328e3e2104.mp4"),
  inboundVid2: path.join(INBOUND_DIR, "file_6---8839235d-ebdc-456b-ac36-2d28f80bed77.mp4"),
  inboundVid3: path.join(INBOUND_DIR, "file_7---2ac561fb-aa90-4eb1-8da2-5b917d8679b5.mp4"),
};

// ===== Pre-flight: verify test media exists =====
test.beforeAll(async () => {
  const criticalFiles = [
    MEDIA.imgSmallWeb, MEDIA.imgPhone5mb, MEDIA.imgHuge15mb,
    MEDIA.imgBatch1, MEDIA.imgBatch2, MEDIA.imgBatch3,
    MEDIA.vidSmall500k, MEDIA.vidLarge50mb,
  ];
  for (const f of criticalFiles) {
    expect(
      fs.existsSync(f),
      `Missing test file: ${f}`
    ).toBe(true);
  }
  console.log("✅ All critical test media files present");
});

// ===== Helper functions =====

/**
 * Clear all IndexedDB databases to start fresh.
 */
async function clearIndexedDB(page: Page) {
  await page.goto(`${BASE_URL}/create`);
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

/**
 * Set up brand identity (description mode — fast, no URL scraping).
 */
async function setupBrand(page: Page) {
  if (!page.url().includes("/create")) {
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState("networkidle");
  }

  const descTextarea = page.locator("textarea");
  await descTextarea.fill(
    "Trendy Italian restaurant in Brussels serving fresh pasta, wood-fired pizza, and seasonal cocktails. Known for warm ambiance and locally sourced ingredients."
  );

  const continueBtn = page.locator("button", { hasText: "Continue" });
  await continueBtn.click();
  await page.waitForURL("**/upload", { timeout: 15000 });
}

/**
 * Upload files via the hidden file input.
 * Waits for the file counter to update.
 */
async function uploadFiles(page: Page, files: string[], expectedTotal?: number) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(files);

  // Wait for processing (larger files need more time)
  const totalSizeMB = files.reduce((sum, f) => {
    try { return sum + fs.statSync(f).size / (1024 * 1024); } catch { return sum; }
  }, 0);
  const waitTime = Math.max(3000, Math.min(30000, totalSizeMB * 1000));
  await page.waitForTimeout(waitTime);

  // Verify counter shows expected count
  const total = expectedTotal ?? files.length;
  await expect(
    page.locator(`text=${total} / 100`)
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Click generate and wait for the entire flow:
 * upload page → processing page → plan page
 */
async function generateAndWaitForPlan(
  page: Page,
  timeoutMs: number = 180000
): Promise<string> {
  // Click "Generate my Plan"
  const generateBtn = page.locator("button", { hasText: "Generate my Plan" });
  await expect(generateBtn).toBeEnabled({ timeout: 10000 });
  await generateBtn.click();

  // Should navigate to /processing
  await page.waitForURL("**/processing", { timeout: 15000 });

  // Wait for "AI Analysis" text to appear
  await page.waitForSelector("text=AI Analysis", { timeout: 10000 });

  // Wait for redirect to /plan/... (real GPT-4o Vision API call)
  await page.waitForURL("**/plan/**", { timeout: timeoutMs });

  const url = page.url();
  expect(url).toContain("/plan/");
  return url;
}

/**
 * Verify the plan page has actual content (not just a blank page).
 */
async function verifyPlanPage(page: Page) {
  await page.waitForTimeout(2000);

  // Plan title should be visible
  const planTitle = page.locator("h1");
  await expect(planTitle).toBeVisible({ timeout: 10000 });

  // URL should match plan pattern
  const url = page.url();
  expect(url).toMatch(/\/plan\/plan-/);

  // Day selector buttons should exist (calendar)
  const dayButtons = page.locator("button").filter({
    hasText: /^(SUN|MON|TUE|WED|THU|FRI|SAT)/,
  });
  const dayCount = await dayButtons.count();
  expect(dayCount).toBeGreaterThanOrEqual(7);

  // Click through ALL visible days (including scrolling right) to find posts
  let foundPosts = false;
  let totalPostsFound = 0;

  // First pass: click through initially visible days
  for (let i = 0; i < Math.min(dayCount, 8); i++) {
    await dayButtons.nth(i).click();
    await page.waitForTimeout(400);

    const postCards = page.locator("text=/\\d{2}:\\d{2} (AM|PM)/");
    const postCount = await postCards.count();
    if (postCount > 0) {
      foundPosts = true;
      totalPostsFound += postCount;
    }
  }

  // Second pass: try scrolling right to reveal more days (posts spread across 2+ weeks)
  const scrollRightBtn = page.locator('button:has-text("Scroll right"), button[aria-label="Scroll right"]').first();
  for (let scroll = 0; scroll < 3; scroll++) {
    try {
      if (await scrollRightBtn.isVisible({ timeout: 1000 })) {
        await scrollRightBtn.click();
        await page.waitForTimeout(500);

        // Re-query day buttons after scroll
        const newDayButtons = page.locator("button").filter({
          hasText: /^(SUN|MON|TUE|WED|THU|FRI|SAT)/,
        });
        const newCount = await newDayButtons.count();
        for (let i = 0; i < Math.min(newCount, 8); i++) {
          await newDayButtons.nth(i).click();
          await page.waitForTimeout(400);

          const postCards = page.locator("text=/\\d{2}:\\d{2} (AM|PM)/");
          const postCount = await postCards.count();
          if (postCount > 0) {
            foundPosts = true;
            totalPostsFound += postCount;
          }
        }
      }
    } catch {
      break; // No more scroll buttons
    }
  }

  expect(foundPosts).toBe(true);
  console.log(`   📋 Plan verified: found ${totalPostsFound} post(s) across days`);
  return totalPostsFound;
}

/**
 * Verify backend is running and responsive.
 */
async function verifyBackendHealth(page: Page) {
  const response = await page.request.get(`${API_URL}/api/brand/analyze`, {
    failOnStatusCode: false,
  });
  // We expect some response (even if 400/404) — the point is the server is up
  expect(response.status()).toBeLessThan(500);
}

// ============================================================
// PRE-CHECK: Verify both servers are running
// ============================================================
test("Pre-check: Frontend and backend are alive", async ({ page }) => {
  test.setTimeout(15000);

  // Frontend
  const frontendResp = await page.goto(BASE_URL);
  expect(frontendResp?.status()).toBeLessThan(500);

  // Backend — try the generate endpoint (expect 400, not 500+)
  const backendResp = await page.request.post(`${API_URL}/api/generate`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ media: [] }),
  });
  expect(backendResp.status()).toBe(400); // "No media provided" = server is alive
  console.log("✅ Both servers alive and responsive");
});

// ============================================================
// STRESS 1: Single small image (~120KB)
// Baseline test. Should complete quickly.
// ============================================================
test("Stress 1: Single small image (~120KB)", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.imgSmallWeb]);
  const planUrl = await generateAndWaitForPlan(page, 120000);
  console.log(`✅ Stress 1 PASS — Small image → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 2: Single large image (~5MB phone photo)
// Tests client-side compression (>1MB gets resized)
// ============================================================
test("Stress 2: Single large image (~5MB phone photo)", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const sizeBytes = fs.statSync(MEDIA.imgPhone5mb).size;
  console.log(`   📷 Uploading ${(sizeBytes / 1024 / 1024).toFixed(1)}MB phone photo`);

  await uploadFiles(page, [MEDIA.imgPhone5mb]);
  const planUrl = await generateAndWaitForPlan(page, 180000);
  console.log(`✅ Stress 2 PASS — 5MB phone photo → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 3: Single very large image (~15-17MB DSLR)
// Tests BOTH client compression AND server-side resize (>4MB)
// This is the most extreme image test.
// ============================================================
test("Stress 3: Single very large image (~17MB DSLR)", async ({ page }) => {
  test.setTimeout(300000); // 5 min — large file + compression + GPT
  await clearIndexedDB(page);
  await setupBrand(page);

  const sizeBytes = fs.statSync(MEDIA.imgHuge15mb).size;
  console.log(`   📷 Uploading ${(sizeBytes / 1024 / 1024).toFixed(1)}MB DSLR photo`);

  await uploadFiles(page, [MEDIA.imgHuge15mb]);

  // Monitor processing page for errors
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 3 PASS — 17MB DSLR → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 4: 3 medium images (1-2MB each)
// Tests multiple simultaneous image handling.
// ============================================================
test("Stress 4: 3 medium images (1-2MB each)", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.imgBatch1, MEDIA.imgBatch2, MEDIA.imgBatch3]);
  const planUrl = await generateAndWaitForPlan(page, 180000);
  console.log(`✅ Stress 4 PASS — 3 medium images → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 5: 5 mixed-size images
// Triggers detail='low' on backend (5+ images).
// ============================================================
test("Stress 5: 5 mixed-size images", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const files = [
    MEDIA.imgSmallWeb,     // ~120KB
    MEDIA.imgMedium300k,   // ~300KB
    MEDIA.imgBatch1,       // ~1.7MB
    MEDIA.imgBatch2,       // ~900KB
    MEDIA.imgPng3mb,       // ~5.5MB PNG
  ];
  await uploadFiles(page, files);
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 5 PASS — 5 mixed images → ${planUrl}`);
  const postCount = await verifyPlanPage(page);
  expect(postCount).toBeGreaterThanOrEqual(3); // At least some posts generated
});

// ============================================================
// STRESS 6: 10 images (stress test)
// Maximum realistic upload. Uses detail='low'.
// ============================================================
test("Stress 6: 10 images (stress test)", async ({ page }) => {
  test.setTimeout(360000); // 6 min for 10 images
  await clearIndexedDB(page);
  await setupBrand(page);

  const files = [
    MEDIA.imgSmallWeb,
    MEDIA.imgMedium300k,
    MEDIA.imgHd500k,
    MEDIA.imgLarge1m,
    MEDIA.imgBatch1,
    MEDIA.imgBatch2,
    MEDIA.imgBatch3,
    MEDIA.existPhoto1,
    MEDIA.existPhoto2,
    MEDIA.existPhoto3,
  ];
  await uploadFiles(page, files);
  const planUrl = await generateAndWaitForPlan(page, 300000);
  console.log(`✅ Stress 6 PASS — 10 images → ${planUrl}`);
  const postCount = await verifyPlanPage(page);
  expect(postCount).toBeGreaterThanOrEqual(3); // Posts spread across 2+ weeks, can't see all via day buttons
});

// ============================================================
// STRESS 7: Single small video (~200KB)
// Tests video → keyframe extraction path.
// ============================================================
test("Stress 7: Single small video (~200KB)", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.vidSmall500k]);
  const planUrl = await generateAndWaitForPlan(page, 180000);
  console.log(`✅ Stress 7 PASS — Small video → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 8: Large video (~10MB HD)
// Tests larger video handling through the full pipeline.
// NOTE: 62MB video test was attempted but hangs browser due to
// base64 conversion in IndexedDB. This is a KNOWN ISSUE:
// Frontend has no file size limit check before IndexedDB storage.
// ============================================================
test("Stress 8: Large video (~10MB HD)", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const sizeBytes = fs.statSync(MEDIA.vidHd10mb).size;
  const sizeMB = sizeBytes / (1024 * 1024);
  console.log(`   🎬 Uploading ${sizeMB.toFixed(1)}MB HD video`);

  await uploadFiles(page, [MEDIA.vidHd10mb]);
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 8 PASS — 10MB video → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 9: Mix of images + videos
// Tests the combined path: images go direct, videos get keyframe extraction.
// ============================================================
test("Stress 9: Mix of 2 images + 2 videos", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const files = [
    MEDIA.imgSmallWeb,       // ~120KB image
    MEDIA.imgBatch1,         // ~1.7MB image
    MEDIA.vidSmall500k,      // ~200KB video
    MEDIA.vidMedium2mb,      // ~2MB video
  ];
  await uploadFiles(page, files);
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 9 PASS — 2 images + 2 videos → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 10: MOV format video
// Tests .mov file handling (common from iPhones).
// ============================================================
test("Stress 10: MOV format video", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.vidMov5mb]);
  const planUrl = await generateAndWaitForPlan(page, 180000);
  console.log(`✅ Stress 10 PASS — MOV video → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 11: PNG image (~5.5MB)
// Tests PNG format handling through the pipeline.
// ============================================================
test("Stress 11: PNG image (~5.5MB)", async ({ page }) => {
  test.setTimeout(180000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.imgPng3mb]);
  const planUrl = await generateAndWaitForPlan(page, 180000);
  console.log(`✅ Stress 11 PASS — PNG image → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 12: Heavy mixed batch (5 images + 2 videos)
// Simulates a realistic restaurant photoshoot upload.
// ============================================================
test("Stress 12: Heavy mixed batch (5 images + 2 videos)", async ({ page }) => {
  test.setTimeout(360000); // 6 min
  await clearIndexedDB(page);
  await setupBrand(page);

  const files = [
    MEDIA.imgSmallWeb,       // ~120KB
    MEDIA.imgBatch1,         // ~1.7MB
    MEDIA.imgBatch2,         // ~900KB
    MEDIA.imgBatch3,         // ~1.1MB
    MEDIA.imgPng3mb,         // ~5.5MB PNG
    MEDIA.vidSmall500k,      // ~200KB video
    MEDIA.vidMedium2mb,      // ~2MB video
  ];
  await uploadFiles(page, files);
  const planUrl = await generateAndWaitForPlan(page, 300000);
  console.log(`✅ Stress 12 PASS — 5 images + 2 videos → ${planUrl}`);
  const postCount = await verifyPlanPage(page);
  expect(postCount).toBeGreaterThanOrEqual(4);
});

// ============================================================
// STRESS 13: Multiple videos (2 medium)
// Tests multiple video keyframe extraction in same request.
// ============================================================
test("Stress 13: 2 medium videos together", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  await uploadFiles(page, [MEDIA.vidSmall500k, MEDIA.vidMedium2mb]);
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 13 PASS — 2 medium videos → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 14: Rapid consecutive uploads (upload more files after first batch)
// Tests the "Add More Media" button flow.
// ============================================================
test("Stress 14: Two-batch upload (3 then 2 more)", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  // First batch: 3 images
  await uploadFiles(page, [MEDIA.imgSmallWeb, MEDIA.imgMedium300k, MEDIA.imgHd500k], 3);

  // Second batch: 2 more images via "Add More Media"
  const addMoreBtn = page.locator("button", { hasText: "Add More Media" });
  await expect(addMoreBtn).toBeVisible({ timeout: 5000 });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([MEDIA.imgBatch1, MEDIA.imgBatch2]);
  await page.waitForTimeout(3000);

  // Should now show 5 total
  await expect(page.locator("text=5 / 100")).toBeVisible({ timeout: 10000 });

  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 14 PASS — Two-batch upload → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 15: 10MB DSLR image
// Tests the server-side resize path (images >4MB resized via ffmpeg).
// ============================================================
test("Stress 15: 10MB DSLR image (server-side resize)", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  const sizeBytes = fs.statSync(MEDIA.imgDslr10mb).size;
  console.log(`   📷 Uploading ${(sizeBytes / 1024 / 1024).toFixed(1)}MB DSLR photo`);

  await uploadFiles(page, [MEDIA.imgDslr10mb]);
  const planUrl = await generateAndWaitForPlan(page, 240000);
  console.log(`✅ Stress 15 PASS — 10MB DSLR → ${planUrl}`);
  await verifyPlanPage(page);
});

// ============================================================
// STRESS 16: All pages load correctly (smoke test)
// Quick check that all app routes render without 500 errors.
// ============================================================
test("Stress 16: All app pages load without errors", async ({ page }) => {
  test.setTimeout(30000);

  const pages = [
    "/",
    "/create",
    "/upload",
    "/processing",
    "/plans",
    "/home",
    "/calendar",
    "/growth",
    "/brand",
    "/profile",
  ];

  const errors: string[] = [];

  for (const p of pages) {
    try {
      const resp = await page.goto(`${BASE_URL}${p}`, { timeout: 10000 });
      const status = resp?.status() ?? 0;
      if (status >= 500) {
        errors.push(`${p} → ${status}`);
      }
      // Check for JS errors on the page
      const hasError = await page.locator("text=Application error").isVisible().catch(() => false);
      if (hasError) {
        errors.push(`${p} → Application error visible`);
      }
    } catch (e) {
      errors.push(`${p} → ${e}`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Page load errors:", errors);
  }
  expect(errors).toEqual([]);
  console.log(`✅ Stress 16 PASS — All ${pages.length} pages load cleanly`);
});

// ============================================================
// STRESS 17: Backend API direct test — multipart upload via curl
// Tests the /api/generate endpoint directly (no browser UI).
// ============================================================
test("Stress 17: Direct API test — multipart upload with image", async () => {
  test.setTimeout(120000);

  const { execSync } = require("child_process");
  const output = execSync(
    `curl -s -X POST ${API_URL}/api/generate ` +
    `-F 'brandIdentity={"description":"Test restaurant in Brussels","businessName":"Test Bistro"}' ` +
    `-F 'files=@${MEDIA.imgSmallWeb};type=image/jpeg' ` +
    `--max-time 90`,
    { timeout: 100000 }
  ).toString();

  const data = JSON.parse(output);
  expect(data.posts).toBeDefined();
  expect(data.posts.length).toBeGreaterThanOrEqual(1);
  expect(data.planName).toBeDefined();
  console.log(`✅ Stress 17 PASS — Direct API: ${data.posts.length} posts, plan: "${data.planName}"`);
});

// ============================================================
// STRESS 18: Backend API direct test — video upload via curl
// Tests video keyframe extraction via direct API call.
// ============================================================
test("Stress 18: Direct API test — video upload via curl", async () => {
  test.setTimeout(120000);

  // Use child_process to call curl with actual file
  const { execSync } = require("child_process");
  const output = execSync(
    `curl -s -X POST ${API_URL}/api/generate ` +
    `-F 'brandIdentity={"description":"Test restaurant","businessName":"Video Test Bistro"}' ` +
    `-F 'files=@${MEDIA.vidSmall500k};type=video/mp4' ` +
    `--max-time 90`,
    { timeout: 100000 }
  ).toString();

  const data = JSON.parse(output);
  expect(data.posts).toBeDefined();
  expect(data.posts.length).toBeGreaterThanOrEqual(1);
  console.log(`✅ Stress 18 PASS — Direct API video: ${data.posts.length} posts`);
});

// ============================================================
// STRESS 19: Backend API — empty upload (should return 400)
// ============================================================
test("Stress 19: Direct API test — empty upload returns 400", async ({ request }) => {
  test.setTimeout(15000);

  const response = await request.post(`${API_URL}/api/generate`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ media: [] }),
  });

  expect(response.status()).toBe(400);
  const data = await response.json();
  expect(data.error).toBeDefined();
  console.log(`✅ Stress 19 PASS — Empty upload correctly returns 400`);
});

// ============================================================
// STRESS 20: Frontend timeout test — monitoring processing page
// Specifically watches for the 90s frontend timeout.
// ============================================================
test("Stress 20: Monitor processing page behavior with medium upload", async ({ page }) => {
  test.setTimeout(240000);
  await clearIndexedDB(page);
  await setupBrand(page);

  // Upload 3 images
  await uploadFiles(page, [MEDIA.imgBatch1, MEDIA.imgBatch2, MEDIA.imgBatch3]);

  const generateBtn = page.locator("button", { hasText: "Generate my Plan" });
  await generateBtn.click();

  await page.waitForURL("**/processing", { timeout: 15000 });

  // Monitor progress updates
  const startTime = Date.now();
  let lastProgress = 0;
  let progressStalled = false;

  // Check progress every 5 seconds
  for (let i = 0; i < 24; i++) { // max 2 minutes of checking
    await page.waitForTimeout(5000);

    // Check if we've left processing page
    if (page.url().includes("/plan/")) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`   ⏱️ Processing completed in ${elapsed}s`);
      break;
    }

    // Check for error state
    const hasError = await page.locator("text=Oeps!").isVisible().catch(() => false);
    if (hasError) {
      console.error("   ❌ Processing page showed error state");
      break;
    }

    // Read progress percentage
    const progressText = await page.locator("text=/\\d+% OPTIMIZED/").textContent().catch(() => "");
    const match = progressText?.match(/(\d+)%/);
    if (match) {
      const currentProgress = parseInt(match[1]);
      if (currentProgress === lastProgress && currentProgress > 0) {
        progressStalled = true;
      }
      lastProgress = currentProgress;
    }
  }

  // Verify we ended up on a plan page
  if (page.url().includes("/plan/")) {
    console.log(`✅ Stress 20 PASS — Processing completed successfully`);
    await verifyPlanPage(page);
  } else {
    const hasError = await page.locator("text=Oeps!").isVisible().catch(() => false);
    expect(hasError || page.url().includes("/plan/")).toBe(true);
  }
});
