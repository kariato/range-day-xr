import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  for (const [name, selector] of [
    ["outdoor", '[data-range="runthrough"][data-course="basic"]'],
    ["qualification", '[data-course="qualification"]'],
    ["warehouse", '[data-range="warehouse"]'],
  ]) {
    await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
    await page.waitForFunction(() => window.rangeDay?.state.modelLoaded);
    await page.locator(selector).click();
    await page.locator("#play").click();
    await page.waitForFunction(() => window.rangeDay.state.playing);
    if (name === "outdoor") {
      await page.keyboard.down("w");
      await page.keyboard.down("Shift");
      await page.waitForFunction(
        () => window.rangeDay.state.stationsActivated === 1,
        {},
        { timeout: 20000 },
      );
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      await page.waitForFunction(
        () => window.rangeDay.state.visiblePopups === 3,
        {},
        { timeout: 15000 },
      );
    }
    if (name === "warehouse") {
      await page.locator("#mode-select").selectOption("sandbox");
      await page.waitForSelector("#spawn-dummy");
      for (let i = 0; i < 12; i++) await page.locator("#spawn-dummy").click();
      await page.waitForFunction(() => window.rangeDay.state.dummyCount === 12);
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
    }
    const s = await page.evaluate(() => window.rangeDay.state);
    assert(s.drawCalls < 100, `${name} draw calls ${s.drawCalls}`);
    assert(s.triangles > 10000, `${name} authored geometry missing`);
    await page.screenshot({ path: `/private/tmp/range-day-art-${name}.png` });
    console.log(`${name}: ${s.drawCalls} draw calls, ${s.triangles} triangles`);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all training art passes load with textures, no render errors, outdoor pop-ups, and draw-call budgets.",
  );
} finally {
  await browser.close();
}
