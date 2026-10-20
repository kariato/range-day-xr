import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(() => window.rangeDay?.state.weaponModelsLoaded);
  await page.locator('[data-range="standard"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay.state.playing);
  await page.screenshot({ path: "/private/tmp/range-day-indoor-entrance.png" });
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await page.waitForFunction(
    () => window.rangeDay.state.cameraPosition[2] < -0.6,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  let state = await page.evaluate(() => window.rangeDay.state);
  assert(state.cameraPosition[2] < -0.6, "central lane stays walkable");
  await page.screenshot({
    path: "/private/tmp/range-day-indoor-downrange.png",
  });
  // Walk sideways into a booth partition, which must stop the player.
  await page.keyboard.down("s");
  await page.waitForFunction(
    () => window.rangeDay.state.cameraPosition[2] > 1.9,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("s");
  await page.keyboard.down("a");
  await page.waitForTimeout(1300);
  await page.keyboard.up("a");
  state = await page.evaluate(() => window.rangeDay.state);
  assert(state.cameraPosition[0] > -0.7, "acoustic booth retains collision");
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => Math.abs(window.rangeDay.state.lookYaw) > 3,
    {},
    { timeout: 15000 },
  );
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: "/private/tmp/range-day-indoor-rear.png" });
  assert(state.drawCalls < 100, `draw budget: ${state.drawCalls}`);
  assert.deepEqual(errors, []);
  console.log(
    `PASS: Blender indoor scene renders without errors; central lane walkable; partitions block movement; rear view works; ${state.drawCalls} draw calls, ${state.triangles} triangles.`,
  );
} finally {
  await browser.close();
}
