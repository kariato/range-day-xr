import { WEAPONS } from "../game";
function step(x: number, v: number, frequency: number, dt: number) {
  const decay = Math.exp(-frequency * dt),
    offset = (v + frequency * x) * dt;
  return [(x + offset) * decay, (v - frequency * offset) * decay];
}
export class RecoilSpring {
  pitch = 0;
  yaw = 0;
  back = 0;
  bloom = 0;
  private pitchVelocity = 0;
  private yawVelocity = 0;
  private backVelocity = 0;
  private count = 0;
  reset() {
    this.pitch =
      this.yaw =
      this.back =
      this.bloom =
      this.pitchVelocity =
      this.yawVelocity =
      this.backVelocity =
        0;
    this.count = 0;
  }
  shot(index: number, stability = 1) {
    const w = WEAPONS[index];
    this.pitchVelocity += w.kick * w.recovery * 2.7 * stability;
    this.yawVelocity +=
      (this.count++ % 2 ? 1 : -1) * w.recoilYaw * w.recovery * 2.7 * stability;
    this.backVelocity += w.recoilBack * w.recovery * 2.7;
    this.bloom = Math.min(0.025, this.bloom + w.spreadGrowth * stability);
  }
  update(dt: number, index: number) {
    const w = WEAPONS[index];
    [this.pitch, this.pitchVelocity] = step(
      this.pitch,
      this.pitchVelocity,
      w.recovery,
      dt,
    );
    [this.yaw, this.yawVelocity] = step(
      this.yaw,
      this.yawVelocity,
      w.recovery,
      dt,
    );
    [this.back, this.backVelocity] = step(
      this.back,
      this.backVelocity,
      w.recovery,
      dt,
    );
    this.bloom *= Math.exp(-dt * 10);
  }
}
