import { test } from "node:test";
import assert from "node:assert/strict";
import { stationReached, finishReached, waypoint } from "./course";
test("room triggers use both coordinates instead of a forward-only threshold", () => {
  assert(stationReached({ x: 10, z: -9 }, { x: 10, z: -9, radius: 2 }));
  assert(!stationReached({ x: 0, z: -9 }, { x: 10, z: -9, radius: 2 }));
  assert(!stationReached({ x: 20, z: -8 }, { z: -7 }));
});
test("finish gate requires the complete circuit and proximity in both axes", () => {
  const finish = { x: -10, z: 3, radius: 2 };
  assert(!finishReached({ x: -10, z: 3 }, finish, 5, 6));
  assert(!finishReached({ x: 10, z: 3 }, finish, 6, 6));
  assert(finishReached({ x: -10, z: 3 }, finish, 6, 6));
  assert(!finishReached({ x: 0, z: -80 }, -79, 4, 5));
});
test("waypoints wrap through 360 degrees and distinguish behind from ahead", () => {
  const position = { x: 0, z: 0 };
  assert.equal(waypoint(position, { z: -10 }, Math.PI * 2).distance, 10);
  assert(Math.abs(waypoint(position, { z: -10 }, Math.PI * 2).angle) < 1e-6);
  assert(Math.abs(waypoint(position, { z: 10 }, 0).angle) > 3);
});
