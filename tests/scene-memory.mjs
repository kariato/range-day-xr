import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 720 } }),
  errors = [],
  snapshots = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(() => window.rangeDay?.state.weaponModelsLoaded);
  for (let pass = 0; pass < 3; pass++)
    for (const id of ["standard", "warehouse", "runthrough"]) {
      await page
        .locator(
          id === "runthrough"
            ? '[data-range="runthrough"][data-course="basic"]'
            : `[data-range="${id}"]`,
        )
        .click();
      await page.locator("#play").click();
      await page.waitForFunction(
        (id) =>
          window.rangeDay.state.playing && window.rangeDay.state.range === id,
        id,
      );
      // Wait for two rendered frames so WebGL resource counters reflect this scene.
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      const s = await page.evaluate(
        () => window.rangeDay.state.environmentResources,
      );
      assert(s.cachedScenes <= 2);
      snapshots.push({ pass, id, ...s });
      await page.keyboard.press("Escape");
      await page.locator("#hub").click();
    }
  for (const id of ["standard", "warehouse", "runthrough"]) {
    const states = snapshots.filter((s) => s.id === id);
    assert(
      states[2].gpuGeometries <= states[1].gpuGeometries + 4,
      `${id}: geometry leak ${JSON.stringify(states)}`,
    );
    assert(
      states[2].gpuTextures <= states[1].gpuTextures + 4,
      `${id}: texture leak ${JSON.stringify(states)}`,
    );
  }
  assert.deepEqual(errors, []);
  console.table(snapshots);
  console.log(
    "PASS: repeated in-app scene switching keeps the source cache bounded and GPU resource counts stable.",
  );
} finally {
  await browser.close();
}
