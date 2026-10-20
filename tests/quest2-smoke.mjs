import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(
    (process.env.TEST_URL || "http://127.0.0.1:5188/") + "?emulate=quest2",
  );
  await page.waitForFunction(() => window.rangeDay);
  await page.locator("#VRButton").click();
  await page.waitForFunction(
    () => window.rangeDay.state.xrProfile.frameRate === 72,
  );
  assert.match(await page.locator("#VRButton").innerText(), /EXIT VR/);
  const s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.xrProfile.framebufferScale, 0.9);
  assert.equal(s.xrProfile.foveation, 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: emulated Quest 2 enters immersive WebXR with 72 Hz request, 0.9 framebuffer scale and foveation. This does not measure device performance.",
  );
} finally {
  await browser.close();
}
