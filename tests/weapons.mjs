import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const state = () => page.evaluate(() => window.rangeDay.state);
async function click() {
  await page.mouse.down();
  await page.mouse.up();
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(() => window.rangeDay?.state.weaponModelsLoaded);
  await page.locator("#armory-nav").click();
  for (let i = 0; i < 3; i++) {
    await page.locator(`[data-armory-index="${i}"]`).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/private/tmp/range-day-weapon-${i}.png` });
    assert(
      (await page.locator("#armory-stats").innerText()).includes(
        ["15 + 1", "30 + 1", "6 + 1"][i],
      ),
    );
  }
  await page.locator('[data-armory-index="0"]').click();
  await page.locator("#armory-equip").click();
  await page.locator('[data-range="standard"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay.state.playing);
  let s = await state();
  assert.equal(s.ammo, 16);
  assert.equal(s.magazine, 15);
  assert(s.chambered);
  await page.mouse.down();
  await page.waitForFunction(() => window.rangeDay.state.recoilPitch > 0.01);
  await page.waitForTimeout(450);
  await page.mouse.up();
  s = await state();
  assert.equal(s.shots, 1);
  assert.equal(s.ammo, 15);
  await page.screenshot({ path: "/private/tmp/range-day-glock-game.png" });
  await page.keyboard.press("2");
  assert.equal((await state()).ammo, 31);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  assert.equal((await state()).shots, 2, "civilian rifle must be semi-auto");
  assert.equal((await state()).ammo, 30);
  await page.screenshot({ path: "/private/tmp/range-day-rifle-game.png" });
  await page.keyboard.press("1");
  assert.equal(
    (await state()).ammo,
    15,
    "switching must preserve spent rounds",
  );
  await page.keyboard.press("r");
  await page.waitForFunction(
    () =>
      window.rangeDay.state.ammo === 16 &&
      window.rangeDay.state.reloadState === "loaded",
    {},
    { timeout: 7000 },
  );
  await page.keyboard.press("3");
  assert.equal((await state()).ammo, 7);
  await click();
  await page.waitForFunction(() => window.rangeDay.state.recoilPitch > 0.06);
  await page.screenshot({ path: "/private/tmp/range-day-shotgun-game.png" });
  await page.waitForFunction(
    () => window.rangeDay.state.reloadState === "loaded",
  );
  assert.equal((await state()).ammo, 6);
  await page.keyboard.press("r");
  await page.waitForFunction(
    () =>
      window.rangeDay.state.ammo === 7 &&
      window.rangeDay.state.reloadState === "loaded",
    {},
    { timeout: 7000 },
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: all Blender GLBs and armory, capacity/chamber counts, semi-auto trigger behavior, visible recoil, retained loadouts, magazine reload and shell-by-shell shotgun reload.",
  );
} finally {
  await browser.close();
}
