import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WEAPONS } from "../game";
export class WeaponModels {
  private models = new Map<string, T.Group>();
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
      }),
    );
  }
  clone(index: number) {
    const model = this.models.get(WEAPONS[index].id);
    if (!model) throw new Error("Weapon model has not loaded");
    return model.clone(true);
  }
  get loaded() {
    return this.models.size === WEAPONS.length;
  }
}
