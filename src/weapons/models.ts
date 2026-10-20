import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WEAPONS } from "../game";
import { createCycleClip } from "./firing";
export class WeaponModels {
  private models = new Map<string, T.Group>();
  private clips = new Map<string, T.AnimationClip>();
  async load() {
    const loader = new GLTFLoader();
    await Promise.all(
      WEAPONS.map(async (w) => {
        const asset = await loader.loadAsync(
          `${import.meta.env.BASE_URL}models/weapons/${w.id}.glb`,
        );
        asset.scene.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.frustumCulled = false;
            const m = o.material as T.MeshStandardMaterial;
            m.envMapIntensity = 0.85;
          }
        });
        this.models.set(w.id, asset.scene);
        const clip = asset.animations.find((c) => c.name === "FireCycle");
        if (clip) this.clips.set(w.id, clip);
      }),
    );
  }
  clone(index: number) {
    const model = this.models.get(WEAPONS[index].id);
    if (!model) throw new Error("Weapon model has not loaded");
    return model.clone(true);
  }
  cycleClip(index: number) {
    return this.clips.get(WEAPONS[index].id) ?? createCycleClip(index);
  }
  get embeddedCycles() {
    return this.clips.size;
  }
  get loaded() {
    return this.models.size === WEAPONS.length;
  }
}
