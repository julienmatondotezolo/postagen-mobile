import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * CRITICAL TEST: Verify /api/generate is called exactly ONCE.
 *
 * React 18 Strict Mode runs useEffect twice in development.
 * This test ensures the processing page only fires 1 API request.
 */

const TEST_MEDIA_DIR = "/Users/emji/.openclaw/workspace/test-media";
const TEST_IMG_DIR = "/Users/emji/.openclaw/workspace/test-images";
const INBOUND_DIR = "/Users/emji/.openclaw/media/inbound";
const BASE_URL = "http://localhost:3000";

function findTestImage(): string {
  const candidates = [
    path.join(TEST_MEDIA_DIR, "img-100kb-web.jpg"),
    path.join(TEST_MEDIA_DIR, "img-300kb-medium.jpg"),
    path.join(TEST_IMG_DIR, "small-800x600.jpg"),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) return f;
  }
  throw new Error("No test image found");
}

function findTestVideo(): string {
  const candidates = [
    path.join(TEST_MEDIA_DIR, "vid-500kb-clip.mp4"),
    path.join(TEST_MEDIA_DIR, "vid-2mb-medium.mp4"),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) return f;
  }
  if (fs.existsSync(INBOUND_DIR)) {
    const vids = fs.readdirSync(INBOUND_DIR).filter((f) => f.endsWith(".mp4"));
    if (vids.length > 0) return path.join(INBOUND_DIR, vids[0]);
  }
  throw new Error("No test video found");
}

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

test.describe("Single Request Guard", () => {
  test("Processing page fires /api/generate exactly ONCE", async ({ page }) => {
    test.setTimeout(180000);

    const testImage = findTestImage();
    const testVideo = findTestVideo();

    // Track all requests to /api/generate
    const generateRequests: { url: string; time: number }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/generate") && req.method() === "POST") {
        generateRequests.push({ url: req.url(), time: Date.now() });
        console.log(`🔵 /api/generate request #${generateRequests.length} at ${new Date().toISOString()}`);
      }
    });

    // Step 1: Clear IndexedDB
    await clearIndexedDB(page);

    // Step 2: Set up brand
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState("networkidle");
    const textarea = page.locator("textarea").first();
    await textarea.fill("Test restaurant for single-request validation");
    const continueBtn = page.locator("button").filter({ hasText: /continue/i }).first();
    await continueBtn.click();
    await page.waitForURL("**/upload", { timeout: 10000 });

    // Step 3: Upload 1 image + 1 video
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([testImage, testVideo]);
    await page.waitForTimeout(3000);
    await expect(page.locator("text=2 / 100")).toBeVisible({ timeout: 10000 });

    // Step 4: Click Generate
    const generateBtn = page.locator("button").filter({ hasText: /generate my plan/i }).first();
    await generateBtn.click();

    // Step 5: Wait for processing page
    await page.waitForURL("**/processing", { timeout: 10000 });
    console.log("✅ On processing page");

    // Step 6: Wait for redirect to plan (API completes)
    await page.waitForURL("**/plan/**", { timeout: 120000 });
    console.log(`✅ Redirected to: ${page.url()}`);

    // Step 7: Wait a bit more for any delayed duplicate requests
    await page.waitForTimeout(3000);

    // ASSERTION: Exactly 1 request to /api/generate
    console.log(`\n📊 Total /api/generate requests: ${generateRequests.length}`);
    generateRequests.forEach((req, i) => {
      console.log(`   Request ${i + 1}: ${new Date(req.time).toISOString()}`);
    });

    expect(generateRequests.length).toBe(1);
    console.log("✅ PASSED: /api/generate called exactly ONCE");
  });

  test("Processing page fires /api/generate exactly ONCE (image only)", async ({ page }) => {
    test.setTimeout(180000);

    const testImage = findTestImage();

    const generateRequests: { url: string; time: number }[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/generate") && req.method() === "POST") {
        generateRequests.push({ url: req.url(), time: Date.now() });
        console.log(`🔵 /api/generate request #${generateRequests.length}`);
      }
    });

    await clearIndexedDB(page);

    // Quick setup: brand → upload → generate
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState("networkidle");
    await page.locator("textarea").first().fill("Single image test brand");
    await page.locator("button").filter({ hasText: /continue/i }).first().click();
    await page.waitForURL("**/upload", { timeout: 10000 });

    await page.locator('input[type="file"]').setInputFiles([testImage]);
    await page.waitForTimeout(2000);

    await page.locator("button").filter({ hasText: /generate my plan/i }).first().click();
    await page.waitForURL("**/processing", { timeout: 10000 });
    await page.waitForURL("**/plan/**", { timeout: 120000 });
    await page.waitForTimeout(3000);

    console.log(`📊 Total /api/generate requests: ${generateRequests.length}`);
    expect(generateRequests.length).toBe(1);
    console.log("✅ PASSED: Single image — /api/generate called exactly ONCE");
  });
});
