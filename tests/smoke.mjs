import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173/");
  await page.waitForFunction(() => window.rangeDay?.state.modelLoaded);
  await page.screenshot({ path: "/private/tmp/range-day-home.png" });
  await page.locator('[data-range="standard"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay?.state.playing);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(100);
  let s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.shots, 1);
  assert(s.hits >= 1, `expected hit: ${JSON.stringify(s)}`);
  assert(s.points > 0);
  await page.keyboard.press("r");
  await page.waitForTimeout(1750);
  s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.ammo, 15);
  assert.equal(s.reloadState, "loaded");
  await page.screenshot({ path: "/private/tmp/range-day-standard.png" });
  await page.keyboard.press("Enter");
  await page.locator("#hub").click();
  await page.locator('[data-range="runthrough"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      window.rangeDay?.state.playing &&
      window.rangeDay?.state.range === "runthrough",
  );
  assert.equal((await page.evaluate(() => window.rangeDay.state)).targets, 15);
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await page.waitForTimeout(2600);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  assert.match(await page.locator("#extra").innerText(), /^1/);
  await page.screenshot({ path: "/private/tmp/range-day-course.png" });
  await page.keyboard.press("Escape");
  await page.locator("#hub").click();
  await page.locator('[data-range="warehouse"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      window.rangeDay?.state.playing &&
      window.rangeDay?.state.range === "warehouse",
  );
  await page.waitForTimeout(3500);
  s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.wave, 1);
  await page.screenshot({ path: "/private/tmp/range-day-warehouse.png" });
  assert(s.drawCalls < 100, `draw call budget: ${s.drawCalls}`);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: GLB scenes, firing and scoring, reload, result record, course station trigger, warehouse wave, draw-call budget.",
  );
  console.log(s);
} finally {
  await browser.close();
}
