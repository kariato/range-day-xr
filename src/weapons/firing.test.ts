import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCycleClip, FiringTimeline } from "./firing";
for (const index of [0, 1, 2]) {
  test(`weapon ${index} cycles moving parts and returns to battery`, () => {
    const root = new T.Group();
    for (const name of ["Slide", "Bolt", "Pump"]) {
      const part = new T.Group();
      part.name = name;
      root.add(part);
    }
    const clip = createCycleClip(index),
      mixer = new T.AnimationMixer(root);
    const action = mixer.clipAction(clip).setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.update(clip.duration * 0.5);
    assert(
      root.getObjectByName(
        index === 0 ? "Slide" : index === 1 ? "Bolt" : "Pump",
      )!.position.z > 0.02,
    );
    mixer.update(clip.duration);
    for (const part of root.children)
      assert(Math.abs(part.position.z) < 0.00001);
  });
}
test("each cycle emits exactly once, including a frame that crosses the whole cycle", () => {
  const timeline = new FiringTimeline();
  assert.equal(timeline.advance(1), false);
  for (const index of [0, 1, 2]) {
    timeline.start(index);
    assert.equal(timeline.advance(timeline.ejectAt / 2), false);
    assert.equal(timeline.advance(1), true);
    assert.equal(timeline.advance(1), false);
    assert.equal(timeline.active, false);
  }
  timeline.reset();
  assert.equal(timeline.advance(1), false);
});
test("pump shell waits for extraction stroke", () => {
  const timeline = new FiringTimeline();
  timeline.start(2);
  assert.equal(timeline.advance(0.2), false);
  assert.equal(timeline.advance(0.1), true);
  assert.equal(timeline.advance(0.1), false);
});
