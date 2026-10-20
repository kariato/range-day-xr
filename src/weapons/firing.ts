import * as T from "three";
import { WEAPONS } from "../game";
export function createCycleClip(index: number) {
  const w = WEAPONS[index],
    d = w.cycleSeconds,
    tracks: T.KeyframeTrack[] = [];
  const track = (name: string, times: number[], offsets: number[]) =>
    tracks.push(
      new T.VectorKeyframeTrack(
        `${name}.position`,
        times,
        offsets.flatMap((z) => [0, 0, z]),
      ),
    );
  if (w.reloadType === "tube") {
    track("Pump", [0, d * 0.18, d * 0.49, d * 0.72, d], [0, 0, 0.07, 0.07, 0]);
    track(
      "Bolt",
      [0, d * 0.18, d * 0.49, d * 0.72, d],
      [0, 0, 0.038, 0.038, 0],
    );
  } else
    track(
      index === 0 ? "Slide" : "Bolt",
      [0, d * 0.2, d * 0.65, d],
      [0, index === 0 ? 0.03 : 0.04, index === 0 ? 0.03 : 0.04, 0],
    );
  return new T.AnimationClip("FireCycle", d, tracks);
}
export class FiringTimeline {
  age = Infinity;
  index = 0;
  private ejected = false;
  start(index: number) {
    this.index = index;
    this.age = 0;
    this.ejected = false;
  }
  get duration() {
    return WEAPONS[this.index].cycleSeconds;
  }
  get ejectAt() {
    return this.index === 2 ? this.duration * 0.45 : this.duration * 0.24;
  }
  get active() {
    return this.age < this.duration;
  }
  advance(dt: number) {
    if (!Number.isFinite(this.age)) return false;
    this.age += dt;
    if (!this.ejected && this.age >= this.ejectAt) {
      this.ejected = true;
      return true;
    }
    return false;
  }
  reset() {
    this.age = Infinity;
    this.ejected = false;
  }
}
