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
async function face(x, z) {
  const s = await state();
  const [px, , pz] = s.cameraPosition,
    [dx, , dz] = s.cameraDirection;
  const current = Math.atan2(-dx, -dz),
    desired = Math.atan2(-(x - px), -(z - pz));
  const delta = Math.atan2(
    Math.sin(desired - current),
    Math.cos(desired - current),
  );
  await page.evaluate(
    (delta) =>
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          movementX: -delta / 0.002,
          movementY: 0,
          buttons: 2,
          bubbles: true,
        }),
      ),
    delta,
  );
}
async function travel(x, z) {
  await face(x, z);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  try {
    await page.waitForFunction(
      ({ x, z }) => {
        const p = window.rangeDay.state.cameraPosition;
        return Math.hypot(p[0] - x, p[2] - z) < 0.3;
      },
      { x, z },
      { timeout: 9000 },
    );
  } finally {
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
  }
}
try {
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(() => window.rangeDay?.state.modelLoaded);
  // Standard range must allow leaving the original booth and walking forward past the bench.
  await page.locator('[data-range="standard"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.rangeDay.state.playing);
  await travel(0.8, 5.5);
  await travel(0.8, -3);
  assert((await state()).cameraPosition[2] < -2);
  // An actual keyboard 360-degree turn must work even without browser mouse capture.
  const initialYaw = (await state()).lookYaw;
  await page.keyboard.down("KeyE");
  await page.waitForFunction(
    (initial) =>
      Math.abs(window.rangeDay.state.lookYaw - initial) > 2 * Math.PI,
    initialYaw,
    { timeout: 12000 },
  );
  await page.keyboard.up("KeyE");
  assert.equal((await state()).paused, false);
  await page.keyboard.press("Escape");
  await page.locator("#hub").click();
  await page.locator('[data-course="qualification"]').click();
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      window.rangeDay.state.playing &&
      window.rangeDay.state.courseName === "qualification",
  );
  assert.equal((await state()).targets, 18);
  // A wall must stop a direct shortcut; use the side door instead.
  await travel(0, -9);
  await page.keyboard.down("w");
  await page.waitForTimeout(1700);
  await page.keyboard.up("w");
  assert((await state()).cameraPosition[2] > -15);
  await travel(0, -9);
  await travel(10, -9);
  assert.equal((await state()).stationsActivated, 2);
  await page.screenshot({ path: "/private/tmp/range-day-qualification.png" });
  await face(15, -11);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => window.rangeDay.state.hits > 0);
  assert((await state()).points > 0);
  await travel(10, -21);
  await travel(0, -21);
  await travel(-10, -21);
  await travel(-10, -9);
  assert.equal((await state()).stationsActivated, 6);
  await travel(-10, 0.9);
  await page.keyboard.down("w");
  await page.waitForSelector("#retry", { timeout: 4000 });
  await page.keyboard.up("w");
  assert((await state()).finished);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: free movement beyond booth, keyboard 360-degree turning, qualification model, wall collision, six spatial room triggers, turns in every direction, return route and timed finish.",
  );
} finally {
  await browser.close();
}
