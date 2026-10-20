export type RangeId = "standard" | "runthrough" | "warehouse";
export type ReloadState = "loaded" | "empty" | "mag-out" | "mag-in" | "cycling";
import configs from "./weapons/configs.json";
export const WEAPONS = configs;
interface WeaponSnapshot {
  magazine: number;
  chambered: boolean;
  reserve: number;
  state: ReloadState;
}
export class WeaponState {
  index = 0;
  magazine = WEAPONS[0].magazineCapacity;
  chambered = true;
  reserve = 6;
  state: ReloadState = "loaded";
  lastShot = -Infinity;
  cycleUntil = 0;
  unlimited = false;
  private loadouts = new Map<number, WeaponSnapshot>();
  get ammo() {
    return this.magazine + Number(this.chambered);
  }
  reset(index = this.index, unlimited = false) {
    this.loadouts.clear();
    this.unlimited = unlimited;
    this.index = index;
    this.fresh();
  }
  private fresh() {
    const w = WEAPONS[this.index];
    this.magazine = w.magazineCapacity;
    this.chambered = true;
    this.reserve = this.unlimited ? Infinity : w.reloadType === "tube" ? 36 : 6;
    this.state = "loaded";
    this.lastShot = -Infinity;
    this.cycleUntil = 0;
  }
  equip(index: number) {
    if (!WEAPONS[index]) throw new RangeError("Unknown weapon");
    if (index === this.index) return;
    this.loadouts.set(this.index, {
      magazine: this.magazine,
      chambered: this.chambered,
      reserve: this.reserve,
      state: this.state === "cycling" ? "loaded" : this.state,
    });
    this.index = index;
    const saved = this.loadouts.get(index);
    if (saved) Object.assign(this, saved);
    else this.fresh();
    this.lastShot = -Infinity;
    this.cycleUntil = 0;
    if (!this.chambered && this.magazine > 0 && this.state === "loaded") {
      this.magazine--;
      this.chambered = true;
    }
  }
  update(time: number) {
    if (this.state === "cycling" && time >= this.cycleUntil) {
      if (this.magazine > 0) {
        this.magazine--;
        this.chambered = true;
        this.state = "loaded";
      } else this.state = "empty";
    }
  }
  fire(time: number) {
    this.update(time);
    const w = WEAPONS[this.index];
    if (
      this.state !== "loaded" ||
      !this.chambered ||
      time - this.lastShot < w.interval
    )
      return false;
    this.lastShot = time;
    this.chambered = false;
    if (w.reloadType === "tube") {
      this.cycleUntil = time + w.cycleSeconds;
      this.state = this.magazine > 0 ? "cycling" : "empty";
    } else if (this.magazine > 0) {
      this.magazine--;
      this.chambered = true;
    } else this.state = "empty";
    return true;
  }
  eject() {
    if (this.state !== "loaded" && this.state !== "empty") return false;
    if (WEAPONS[this.index].reloadType === "magazine") this.magazine = 0;
    this.state = "mag-out";
    return true;
  }
  insert() {
    if (this.state !== "mag-out" || this.reserve === 0) return false;
    const w = WEAPONS[this.index];
    if (w.reloadType === "tube" && this.magazine >= w.magazineCapacity)
      return false;
    this.reserve--;
    this.magazine =
      w.reloadType === "tube" ? this.magazine + 1 : w.magazineCapacity;
    this.state = this.chambered ? "loaded" : "mag-in";
    return true;
  }
  charge() {
    if (this.state === "loaded") return true;
    if (this.state !== "mag-in") return false;
    if (!this.chambered && this.magazine > 0) {
      this.magazine--;
      this.chambered = true;
    }
    this.state = this.chambered ? "loaded" : "empty";
    return this.chambered;
  }
}
export function paperScore(x: number, y: number, radius = 0.55) {
  return Math.max(0, 10 - Math.floor((Math.hypot(x, y) / radius) * 10));
}
export function courseScore(time: number, missed: number, noShoot: number) {
  return time + missed * 5 + noShoot * 10;
}
export function accuracy(hits: number, shots: number) {
  return shots ? Math.min(100, Math.round((hits / shots) * 100)) : 0;
}
export type Hit = { x: number; y: number };
// Exact smallest enclosing circle: the minimum circle is supported by 2 or 3 hits.
export function groupSize(hits: Hit[]) {
  if (hits.length < 2) return 0;
  let best = Infinity;
  const check = (x: number, y: number, r: number) => {
    if (r < best && hits.every((p) => Math.hypot(p.x - x, p.y - y) <= r + 1e-7))
      best = r;
  };
  for (let i = 0; i < hits.length; i++)
    for (let j = i + 1; j < hits.length; j++) {
      const a = hits[i],
        b = hits[j];
      check(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        Math.hypot(a.x - b.x, a.y - b.y) / 2,
      );
      for (let k = j + 1; k < hits.length; k++) {
        const c = hits[k],
          d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        if (Math.abs(d) < 1e-10) continue;
        const aa = a.x * a.x + a.y * a.y,
          bb = b.x * b.x + b.y * b.y,
          cc = c.x * c.x + c.y * c.y;
        const x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d,
          y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;
        check(x, y, Math.hypot(a.x - x, a.y - y));
      }
    }
  return Number.isFinite(best) ? best * 200 : 0;
}
export interface Saved {
  scores: Record<RangeId, { score: number; accuracy: number; date: string }[]>;
  settings: {
    sound: boolean;
    snap: boolean;
    vignette: boolean;
    leftHand: boolean;
    simpleReload: boolean;
    seated: boolean;
    teleport: boolean;
  };
  unlocks: number;
  ghost: { t: number; x: number; z: number }[];
  ghostTime: number;
}
export const defaults: Saved = {
  scores: { standard: [], runthrough: [], warehouse: [] },
  settings: {
    sound: true,
    snap: true,
    vignette: true,
    leftHand: false,
    simpleReload: true,
    seated: false,
    teleport: false,
  },
  unlocks: 0,
  ghost: [],
  ghostTime: Infinity,
};
export function loadSave(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem("range-day-xr") || "null");
    if (!raw) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...raw,
      settings: { ...defaults.settings, ...raw.settings },
      scores: { ...defaults.scores, ...raw.scores },
    };
  } catch {
    return structuredClone(defaults);
  }
}
export function persist(save: Saved) {
  try {
    localStorage.setItem("range-day-xr", JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
