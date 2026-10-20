import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FiringTimeline } from "./firing";
type Surface = { distance: number; normal: T.Vector3 } | null;
type Trace = (
  origin: T.Vector3,
  direction: T.Vector3,
  distance: number,
) => Surface;
type Casing = {
  position: T.Vector3;
  velocity: T.Vector3;
  rotation: T.Quaternion;
  spin: T.Vector3;
  age: number;
  active: boolean;
  settled: boolean;
  bounces: number;
};
const PORTS = [
  [0.016, 0.0204, -0.036],
  [0.026, 0.026, -0.015],
  [0.029, 0.021, -0.055],
];
const CAPACITY = 12,
  LIFETIME = 4.5;
function lathe(points: number[][]) {
  return new T.LatheGeometry(
    points.map(([x, y]) => new T.Vector2(x, y)),
    12,
  );
}
function casingGeometry(index: number) {
  const brass = new T.MeshStandardMaterial({
    color: 0xc99a48,
    metalness: 0.8,
    roughness: 0.3,
  });
  const dark = new T.MeshStandardMaterial({ color: 0x17130d, roughness: 1 });
  if (index === 2) {
    const hull = new T.CylinderGeometry(0.0095, 0.0095, 0.047, 12);
    hull.translate(0, 0.006, 0);
    const base = new T.CylinderGeometry(0.0108, 0.0108, 0.012, 12);
    base.translate(0, -0.0235, 0);
    const mouth = new T.CircleGeometry(0.0085, 12);
    mouth.rotateX(-Math.PI / 2);
    mouth.translate(0, 0.03, 0);
    return {
      geometry: mergeGeometries([hull, base, mouth], true)!,
      materials: [
        new T.MeshStandardMaterial({ color: 0xbc3529, roughness: 0.65 }),
        brass,
        dark,
      ],
    };
  }
  const h = index === 0 ? 0.019 : 0.045;
  const shape =
    index === 0
      ? [
          [0, -h / 2],
          [0.0053, -h / 2],
          [0.0053, -h / 2 + 0.001],
          [0.0048, -h / 2 + 0.002],
          [0.0048, h / 2],
          [0.0041, h / 2],
          [0.0041, h / 2 - 0.003],
        ]
      : [
          [0, -h / 2],
          [0.0052, -h / 2],
          [0.0052, -h / 2 + 0.0015],
          [0.0047, -h / 2 + 0.003],
          [0.0043, h / 2 - 0.011],
          [0.0031, h / 2 - 0.007],
          [0.0031, h / 2],
          [0.0025, h / 2],
          [0.0025, h / 2 - 0.003],
        ];
  const body = lathe(shape),
    mouth = new T.CircleGeometry(index === 0 ? 0.0041 : 0.0025, 12);
  mouth.rotateX(-Math.PI / 2);
  mouth.translate(0, h / 2 - 0.002, 0);
  return {
    geometry: mergeGeometries([body, mouth], true)!,
    materials: [brass, dark],
  };
}
function flashTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.translate(128, 128);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
  g.addColorStop(0, "rgba(255,255,245,1)");
  g.addColorStop(0.16, "rgba(255,240,160,1)");
  g.addColorStop(0.4, "rgba(255,170,45,.75)");
  g.addColorStop(1, "rgba(255,90,10,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12,
      r = i % 2 ? 25 : 112;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 85, 0, Math.PI * 2);
  ctx.fill();
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
export class WeaponEffects {
  readonly root = new T.Group();
  readonly timeline = new FiringTimeline();
  readonly flash = new T.Group();
  ejectedCount = 0;
  flashCount = 0;
  private rootWeapon?: T.Object3D;
  private index = 0;
  private mixer?: T.AnimationMixer;
  private action?: T.AnimationAction;
  private parts: Record<string, T.Object3D | undefined> = {};
  private pools: { mesh: T.InstancedMesh; items: Casing[]; cursor: number }[] =
    [];
  private burst: T.Sprite;
  private core: T.Sprite;
  private flame: T.Mesh;
  private transform = new T.Object3D();
  private direction = new T.Vector3();
  private delta = new T.Vector3();
  private rotation = new T.Quaternion();
  constructor(private trace: Trace) {
    this.root.name = "Weapon casing pool";
    for (let i = 0; i < 3; i++) {
      const { geometry, materials } = casingGeometry(i);
      const mesh = new T.InstancedMesh(geometry, materials, CAPACITY);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.name = [
        "9mm spent brass",
        "5.56 spent brass",
        "12 gauge spent shells",
      ][i];
      this.root.add(mesh);
      this.pools.push({
        mesh,
        cursor: 0,
        items: Array.from({ length: CAPACITY }, () => ({
          position: new T.Vector3(),
          velocity: new T.Vector3(),
          rotation: new T.Quaternion(),
          spin: new T.Vector3(),
          age: 0,
          active: false,
          settled: false,
          bounces: 0,
        })),
      });
    }
    const texture = flashTexture();
    this.burst = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        blending: T.AdditiveBlending,
        color: 0xffc070,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.core = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        blending: T.AdditiveBlending,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.flame = new T.Mesh(
      new T.ConeGeometry(0.24, 0.8, 6),
      new T.MeshBasicMaterial({
        color: 0xffd58e,
        transparent: true,
        opacity: 0.8,
        blending: T.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.flame.rotation.x = -Math.PI / 2;
    this.flash.name = "Animated muzzle flash";
    this.flash.add(this.burst, this.core, this.flame);
    this.flash.visible = false;
  }
  bind(
    root: T.Object3D,
    index: number,
    parts: Record<string, T.Object3D | undefined>,
    muzzle: T.Object3D | undefined,
    clip: T.AnimationClip,
  ) {
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.rootWeapon!);
    this.flash.removeFromParent();
    this.rootWeapon = root;
    this.index = index;
    this.parts = parts;
    this.timeline.reset();
    this.mixer = new T.AnimationMixer(root);
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(T.LoopOnce, 1);
    this.action.clampWhenFinished = true;
    (muzzle ?? root).add(this.flash);
    this.flash.position.set(0, 0, -0.025);
    this.flash.visible = false;
  }
  shot() {
    this.timeline.start(this.index);
    this.action?.reset().play();
    this.flashCount++;
    this.flash.visible = true;
    const size = [0.115, 0.17, 0.23][this.index];
    this.burst.scale.setScalar(size);
    this.core.scale.setScalar(size * 0.42);
    this.flame.scale.setScalar(size);
    this.flame.position.z = -size * 0.2;
    (this.burst.material as T.SpriteMaterial).rotation =
      Math.random() * Math.PI * 2;
  }
  private eject() {
    if (!this.rootWeapon) return;
    const pool = this.pools[this.index],
      item = pool.items[pool.cursor];
    pool.cursor = (pool.cursor + 1) % CAPACITY;
    this.rootWeapon.updateWorldMatrix(true, true);
    item.position.fromArray(PORTS[this.index]);
    this.rootWeapon.localToWorld(item.position);
    this.rootWeapon.getWorldQuaternion(this.rotation);
    item.velocity
      .set(
        1.9 + Math.random() * 0.8,
        1.0 + Math.random() * 0.7,
        0.25 + Math.random() * 0.6,
      )
      .applyQuaternion(this.rotation);
    item.rotation
      .copy(this.rotation)
      .multiply(new T.Quaternion().setFromEuler(new T.Euler(0.8, 0.3, 0.5)));
    item.spin.set(
      10 + Math.random() * 12,
      7 + Math.random() * 10,
      4 + Math.random() * 9,
    );
    item.age = 0;
    item.active = true;
    item.settled = false;
    item.bounces = 0;
    this.ejectedCount++;
  }
  update(dt: number, chambered: boolean) {
    if (dt > 0) {
      if (this.timeline.advance(dt)) this.eject();
      this.mixer?.update(dt);
    }
    if (!this.timeline.active) {
      const name = this.index === 0 ? "Slide" : "Bolt",
        part = this.parts[name];
      if (part)
        part.position.z =
          this.index !== 2 && !chambered ? (this.index === 0 ? 0.03 : 0.04) : 0;
      if (this.parts.Pump) this.parts.Pump.position.z = 0;
    }
    const age = this.timeline.age,
      duration = 0.085;
    this.flash.visible = age < duration;
    const intensity = Math.max(0, 1 - age / duration);
    (this.burst.material as T.SpriteMaterial).opacity = intensity;
    (this.core.material as T.SpriteMaterial).opacity = Math.min(
      1,
      intensity * 2,
    );
    (this.flame.material as T.MeshBasicMaterial).opacity = intensity * 0.75;
    for (const pool of this.pools) {
      let visible = false;
      for (let i = 0; i < pool.items.length; i++) {
        const p = pool.items[i];
        if (p.active && dt > 0) {
          p.age += dt;
          if (p.age >= LIFETIME) p.active = false;
          else if (!p.settled) {
            p.velocity.y -= 9.81 * dt;
            this.delta.copy(p.velocity).multiplyScalar(dt);
            const distance = this.delta.length();
            this.direction.copy(this.delta).normalize();
            const hit =
              distance > 0
                ? this.trace(p.position, this.direction, distance + 0.006)
                : null;
            if (hit) {
              p.position.addScaledVector(
                this.direction,
                Math.max(0, hit.distance - 0.006),
              );
              p.position.addScaledVector(hit.normal, 0.006);
              const dot = p.velocity.dot(hit.normal);
              if (dot < 0) p.velocity.addScaledVector(hit.normal, -1.35 * dot);
              p.velocity.multiplyScalar(0.65);
              p.spin.multiplyScalar(0.6);
              p.bounces++;
              if (p.bounces >= 3 || p.velocity.length() < 0.18)
                p.settled = true;
            } else p.position.add(this.delta);
            this.rotation.setFromEuler(
              new T.Euler(p.spin.x * dt, p.spin.y * dt, p.spin.z * dt),
            );
            p.rotation.multiply(this.rotation);
          }
        }
        if (p.active) {
          visible = true;
          this.transform.position.copy(p.position);
          this.transform.quaternion.copy(p.rotation);
          this.transform.scale.setScalar(Math.min(1, (LIFETIME - p.age) / 0.5));
        } else this.transform.scale.setScalar(0);
        this.transform.updateMatrix();
        pool.mesh.setMatrixAt(i, this.transform.matrix);
      }
      pool.mesh.visible = visible;
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  resetRun() {
    this.timeline.reset();
    this.flash.visible = false;
    this.ejectedCount = this.flashCount = 0;
    for (const pool of this.pools) {
      for (const p of pool.items) p.active = false;
      pool.mesh.visible = false;
    }
  }
  get state() {
    return {
      flashVisible: this.flash.visible,
      flashCount: this.flashCount,
      ejectedCount: this.ejectedCount,
      cycleAge: Number.isFinite(this.timeline.age) ? this.timeline.age : null,
      cycleActive: this.timeline.active,
      slideOffset: this.parts.Slide?.position.z ?? 0,
      boltOffset: this.parts.Bolt?.position.z ?? 0,
      pumpOffset: this.parts.Pump?.position.z ?? 0,
      activeCasings: this.pools.reduce(
        (n, p) => n + p.items.filter((i) => i.active).length,
        0,
      ),
      casings: this.pools.flatMap((p, index) =>
        p.items
          .filter((i) => i.active)
          .map((i) => ({
            weaponIndex: index,
            position: i.position.toArray(),
            age: i.age,
          })),
      ),
    };
  }
}
