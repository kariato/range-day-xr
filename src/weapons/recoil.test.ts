import { test } from "node:test";
import assert from "node:assert/strict";
import { RecoilSpring } from "./recoil";
function peak(index: number, dt = 1 / 120) {
  const r = new RecoilSpring();
  r.shot(index);
  let pitch = 0,
    back = 0;
  for (let t = 0; t < 0.5; t += dt) {
    r.update(dt, index);
    pitch = Math.max(pitch, r.pitch);
    back = Math.max(back, r.back);
  }
  return { pitch, back };
}
test("shotgun recoil is strongest; rifle recoil is lightest", () => {
  const p = peak(0),
    r = peak(1),
    s = peak(2);
  assert(s.pitch > p.pitch && p.pitch > r.pitch);
  assert(s.back > p.back && p.back > r.back);
});
test("recoil recovery is frame-rate independent and settles without changing player pose", () => {
  const a = peak(0, 1 / 60),
    b = peak(0, 1 / 120);
  assert(Math.abs(a.pitch - b.pitch) < 0.002);
  const r = new RecoilSpring();
  r.shot(2);
  for (let i = 0; i < 240; i++) r.update(1 / 120, 2);
  assert(Math.abs(r.pitch) < 0.00001);
  assert(r.bloom < 0.00001);
});
