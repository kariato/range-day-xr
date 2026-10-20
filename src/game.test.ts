import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WeaponState,
  paperScore,
  courseScore,
  groupSize,
  accuracy,
} from "./game";
test("empty magazine requires insert and rack, firing respects rate", () => {
  const w = new WeaponState();
  assert(w.fire(0));
  assert(!w.fire(0.01));
  for (let i = 1; i < 15; i++) assert(w.fire(i));
  assert.equal(w.state, "empty");
  assert(!w.fire(20));
  w.eject();
  assert(w.insert());
  assert(!w.fire(21));
  assert(w.charge());
  assert(w.fire(22));
  assert.equal(w.reserve, 5);
});
test("no magazines prevents insertion", () => {
  const w = new WeaponState();
  w.reserve = 0;
  w.eject();
  assert(!w.insert());
  assert.equal(w.state, "mag-out");
});
test("rings and penalties", () => {
  assert.equal(paperScore(0, 0), 10);
  assert.equal(paperScore(0.55, 0), 0);
  assert.equal(courseScore(30, 2, 1), 50);
  assert.equal(accuracy(3, 4), 75);
});
test("smallest enclosing circle is a diameter, including triangular groups", () => {
  assert.equal(groupSize([]), 0);
  assert.equal(
    groupSize([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]),
    100,
  );
  assert(
    Math.abs(
      groupSize([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
      ]) -
        200 / Math.sqrt(3),
    ) < 1e-6,
  );
});
test("shotgun inserts one shell per reload step", () => {
  const w = new WeaponState();
  w.equip(2);
  assert(w.fire(0));
  assert(w.fire(1));
  w.eject();
  assert(w.insert());
  assert.equal(w.ammo, 5);
  assert(w.charge());
  w.eject();
  assert(w.insert());
  assert.equal(w.ammo, 6);
});
