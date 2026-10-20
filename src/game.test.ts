import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WeaponState,
  paperScore,
  courseScore,
  groupSize,
  accuracy,
  WEAPONS,
} from "./game";
test("empty magazine requires insert and rack, firing respects rate", () => {
  const w = new WeaponState();
  assert(w.fire(0));
  assert(!w.fire(0.01));
  for (let i = 1; i < WEAPONS[0].capacity; i++) assert(w.fire(i));
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
  w.update(1.8);
  w.eject();
  assert(w.insert());
  assert.equal(w.ammo, 6);
  assert(w.charge());
  w.eject();
  assert(w.insert());
  assert.equal(w.ammo, 7);
});

test("weapon capacities include a separate chamber and switching preserves spent ammunition", () => {
  const w = new WeaponState();
  assert.equal(w.magazine, 15);
  assert.equal(w.ammo, 16);
  assert(w.fire(0));
  w.equip(1);
  assert.equal(w.ammo, 31);
  assert.equal(WEAPONS[1].auto, false);
  assert(w.fire(1));
  w.equip(0);
  assert.equal(w.ammo, 15);
  w.equip(1);
  assert.equal(w.ammo, 30);
});
test("empty reload chambers one round from the magazine; tactical reload retains the chamber", () => {
  const w = new WeaponState();
  for (let i = 0; i < 16; i++) assert(w.fire(i));
  w.eject();
  w.insert();
  assert.equal(w.ammo, 15);
  assert.equal(w.chambered, false);
  assert.equal(w.state, "mag-in");
  assert(!w.fire(20));
  w.charge();
  assert.equal(w.ammo, 15);
  assert.equal(w.magazine, 14);
  assert(w.chambered);
  w.eject();
  w.insert();
  assert.equal(w.ammo, 16);
  assert.equal(w.state, "loaded");
});
test("pump action cannot fire again until its cycle completes", () => {
  const w = new WeaponState();
  w.equip(2);
  assert.equal(w.ammo, 7);
  assert(w.fire(0));
  assert.equal(w.state, "cycling");
  assert(!w.fire(0.2));
  w.update(0.7);
  assert.equal(w.state, "loaded");
  assert(w.chambered);
  assert(!w.fire(0.7));
  assert(w.fire(0.9));
});
