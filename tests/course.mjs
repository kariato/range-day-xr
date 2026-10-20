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
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173/");
  await page.waitForFunction(() => window.rangeDay?.state.modelLoaded);
  assert(
    await page
      .locator('[data-range="runthrough"][data-course="basic"]')
      .evaluate((el) => el.classList.contains("selected")),
  );
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay.state.playing);
  let s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.range, "runthrough");
  assert.equal(s.visiblePopups, 0);
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.rangeDay.state.cameraPosition[2] < 0.5,
  );
  await page.keyboard.up("w");
  s = await page.evaluate(() => window.rangeDay.state);
  assert.equal(s.stationsActivated, 0);
  assert.equal(s.visiblePopups, 0);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.rangeDay.state.stationsActivated === 1,
  );
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.waitForFunction(
    () =>
      window.rangeDay.state.visiblePopups === 3 &&
      window.rangeDay.state.popupHeights.every((y) => y > 1.5),
  );
  await page.screenshot({ path: "/private/tmp/range-day-popup-course.png" });
  // Aim through the actual input handler at the first blue target.
  s = await page.evaluate(() => window.rangeDay.state);
  const [x, y, z] = s.cameraPosition;
  const dx = -3 - x,
    dz = -13 - z,
    dy = 1.6 - y;
  const yaw = Math.atan2(-dx, -dz),
    pitch = Math.atan2(dy, Math.hypot(dx, dz));
  await page.evaluate(
    ({ yaw, pitch }) =>
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          movementX: -yaw / 0.002,
          movementY: -pitch / 0.002,
          buttons: 2,
          bubbles: true,
        }),
      ),
    { yaw, pitch },
  );
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => window.rangeDay.state.hits === 1);
  s = await page.evaluate(() => window.rangeDay.state);
  assert(s.points > 0);
  await page.waitForFunction(
    () => window.rangeDay.state.visiblePopups === 0,
    {},
    { timeout: 7000 },
  );
  // Restore the view and run to the finish, exercising every station trigger.
  await page.evaluate(
    ({ yaw, pitch }) =>
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          movementX: yaw / 0.002,
          movementY: pitch / 0.002,
          buttons: 2,
          bubbles: true,
        }),
      ),
    { yaw, pitch },
  );
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.rangeDay.state.stationsActivated === 5,
    {},
    { timeout: 25000 },
  );
  await page.waitForSelector("#retry", { timeout: 10000 });
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  s = await page.evaluate(() => window.rangeDay.state);
  assert(s.cameraPosition[2] <= -79);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: default course, walking, sprinting, sequential triggers, animated rise/drop, pop-up scoring, all five stations and finish results.",
  );
} finally {
  await browser.close();
}
