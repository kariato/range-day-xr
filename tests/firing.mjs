import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.rangeDay?.state.weaponAnimationClips === 3,
  );
  await page.locator('[data-range="standard"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay.state.playing);
  await page.evaluate(() => {
    window.firingSamples = [];
    const sample = () => {
      window.firingSamples.push(
        structuredClone(window.rangeDay.state.firingEffects),
      );
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press(String(i + 1));
    await page.evaluate(() => (window.firingSamples = []));
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForFunction(
      (n) => window.rangeDay.state.firingEffects.ejectedCount === n,
      i + 1,
    );
    await page.waitForFunction(
      () => !window.rangeDay.state.firingEffects.cycleActive,
    );
    const samples = await page.evaluate(() => window.firingSamples);
    assert(
      samples.some((s) => s.flashVisible),
      `weapon ${i}: visible flash`,
    );
    assert(
      samples.some(
        (s) => s[["slideOffset", "boltOffset", "pumpOffset"][i]] > 0.015,
      ),
      `weapon ${i}: moving mechanism`,
    );
    if (i === 2)
      assert(
        samples
          .filter((s) => s.cycleAge < 0.2)
          .every((s) => s.ejectedCount === 2),
        "pump must delay ejection",
      );
    const before = await page.evaluate(
      () => window.rangeDay.state.firingEffects,
    );
    assert.equal(before.flashCount, i + 1);
    assert.equal(before.ejectedCount, i + 1);
    assert(before.casings.some((c) => c.weaponIndex === i));
    await page.waitForTimeout(150);
    const after = await page.evaluate(
      () => window.rangeDay.state.firingEffects,
    );
    const a = before.casings.find((c) => c.weaponIndex === i),
      b = after.casings.find((c) => c.weaponIndex === i);
    assert.notDeepEqual(a.position, b.position, "casing travels through world");
    assert.equal(after.flashVisible, false);
    await page.screenshot({ path: `/private/tmp/range-day-firing-${i}.png` });
  }
  await page.waitForFunction(
    () => window.rangeDay.state.firingEffects.activeCasings === 0,
    {},
    { timeout: 45000 },
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: three embedded model clips; visible muzzle flashes and slide/bolt/pump cycles; one moving casing per shot; delayed pump extraction; casing cleanup; no browser errors.",
  );
} finally {
  await browser.close();
}
