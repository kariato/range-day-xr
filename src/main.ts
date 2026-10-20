import { stationReached, finishReached, waypoint } from "./course";
import "./style.css";
import * as T from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { World, box, textBoard, paperTexture } from "./world";
import {
  WeaponState,
  WEAPONS,
  paperScore,
  courseScore,
  accuracy,
  groupSize,
  loadSave,
  persist,
  type RangeId,
  type Hit,
} from "./game";
const $ = <E extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<E>(s)!;
const app = $("#app");
const cross = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="13" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M20 0v11m0 18v11M0 20h11m18 0h11" stroke="currentColor" stroke-width="1.6"/></svg>`;
app.innerHTML = `<div class="loading" id="loading"><h2>RANGE DAY XR</h2><p>PREPARING THE RANGE</p></div><div class="shell" id="shell"><header><div class="brand">${cross}<div>RANGE DAY <span>XR</span></div></div><nav class="nav"><button class="active" id="ranges-nav">THE RANGES</button><button id="scores-nav">RECORDS</button><button id="settings-nav">SETTINGS</button></nav><div class="status"><i class="dot"></i> SYSTEMS READY</div></header><main class="landing"><div class="eyebrow">BROWSER BASED. RANGE READY.</div><h1>MOVE FAST.<br><em>SHOOT CLEAN.</em></h1><p class="intro">Explore every range with full 360° movement and looking.<br>Run the outdoor course or clear the new Qualification House.</p><div class="hero-meta">THE RUN-THROUGH COURSE<strong>MOVE. REACT. REPEAT.</strong>WEBXR · DESKTOP · META QUEST</div><div class="range-title">CHOOSE YOUR RANGE <span>01 — 04</span></div><div class="cards"><button class="card" data-range="standard"><span class="num">01</span><span class="tag">PRECISION</span><h2>STANDARD RANGE</h2><p>Slow down. Line up. Make it count.</p><span class="arrow">↗</span></button><button class="card selected" data-range="runthrough" data-course="basic"><span class="num">02</span><span class="tag">SPEED + ACCURACY</span><h2>RUN-THROUGH</h2><p>Stay moving. Shoot clean. Beat the clock.</p><span class="arrow">↗</span></button><button class="card" data-range="warehouse"><span class="num">03</span><span class="tag">SURVIVAL</span><h2>THE WAREHOUSE</h2><p>They’re closing in. Hold your ground.</p><span class="arrow">↗</span></button><button class="card" data-range="runthrough" data-course="qualification"><span class="num">04</span><span class="tag">NEW · 360° CQB</span><h2>QUALIFICATION HOUSE</h2><p>Clear six rooms. Turn every corner. Race the clock.</p><span class="arrow">↗</span></button></div><div class="launch-row"><button class="primary" id="play">RUN THE POP-UP COURSE <span>↗</span></button><button class="secondary" id="how">HOW TO PLAY</button><div class="launch-note"><b>No download. No waiting.</b><br>Play in your browser or step inside with Quest.</div></div><div class="mobile-warning">Desktop keyboard + mouse or a Quest headset recommended.</div><footer><div class="footer-left"><span>◎ &nbsp; BUILT FOR WEBXR</span><span>↗ &nbsp; META QUEST 2 / 3 / 3S</span><span>▣ &nbsp; DESKTOP READY</span></div><span>FOCUS. BREATHE. REPEAT. &nbsp; / &nbsp; EARLY ACCESS 0.1</span></footer></main><div class="live-pill">POP-UP COURSE PREVIEW &nbsp; ●</div></div><div class="hud hidden" id="hud"><div class="damage" id="damage"></div><div class="vignette" id="vignette"></div><div class="hud-top"><div><div class="hud-brand">RANGE DAY <span style="color:var(--accent)">XR</span></div><div class="hud-label" id="range-label"></div></div><div class="hud-stats"><div class="stat"><small>SCORE</small><strong id="score">0</strong></div><div class="stat"><small>ACCURACY</small><strong id="accuracy">—</strong></div><div class="stat"><small>TIME</small><strong id="timer">0.0</strong></div><div class="stat"><small id="extra-label">DISTANCE</small><strong id="extra">15m</strong></div></div></div><div class="range-controls" id="range-controls"></div><div class="crosshair" id="crosshair"></div><div class="hitmark" id="hitmark">×</div><div class="toast" id="toast"></div><div class="course-guide hidden" id="course-guide"></div><div class="look-hint" id="look-hint">MOUSE: LOOK 360° · CLICK TO CAPTURE · RIGHT-DRAG OR Q/E TO TURN</div><div class="hud-bottom"><div><div class="ammo"><b id="ammo">15</b> <span>/ <span id="capacity">15</span></span></div><div class="weapon-label" id="weapon-label">P15 · TRAINING PISTOL</div><div class="weapon-label" id="reload-label">R TO RELOAD</div></div><div class="controls-strip"><kbd>W A S D</kbd> WALK &nbsp; <kbd>SHIFT</kbd> RUN &nbsp; <kbd>Q / E</kbd> TURN &nbsp; <kbd>R</kbd> RELOAD &nbsp; <kbd>1–3</kbd> WEAPON &nbsp; <kbd>ESC</kbd> PAUSE</div></div><div class="debug hidden" id="debug"></div></div><div id="modal" class="modal-backdrop hidden"></div>`;
const save = loadSave(),
  world = new World();
let resultsSummary = "";
let hadPointerLock = false;
function captureMouse() {
  const request = renderer.domElement.requestPointerLock();
  request?.catch(() => {
    toast("CLICK TO FIRE · RIGHT-DRAG TO AIM", 3);
  });
}
let selected: RangeId = "runthrough",
  range: RangeId = "standard",
  playing = false,
  paused = false,
  loading = false,
  finished = false;
let time = 0,
  elapsed = 0,
  shots = 0,
  hits = 0,
  points = 0,
  noShoot = 0,
  stopped = 0,
  health = 100,
  lastDamage = -99,
  wave = 0,
  breakUntil = 0,
  nextAi = 0;
let distance = 15,
  targetType = "paper",
  drill = "free",
  courseName = "basic",
  warehouseMode = "survival",
  activated = new Set<number>(),
  course: any;
let flashUntil = 0,
  reloadUntil = 0,
  toastUntil = 0,
  hitUntil = 0,
  damageUntil = 0,
  fireHeld = false,
  recoil = 0,
  lastGhost = 0,
  ghostSamples: { t: number; x: number; z: number }[] = [],
  paperHits: Hit[] = [],
  splits: number[] = [],
  debug = false,
  freeFly = false;
const keys = new Set<string>(),
  weapon = new WeaponState();
const scene = new T.Scene();
scene.background = new T.Color("#384d65");
scene.fog = new T.Fog("#384d65", 20, 85);
const camera = new T.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 130);
camera.rotation.order = "YXZ";
const rig = new T.Group();
rig.add(camera);
scene.add(rig);
camera.position.set(0, 1.65, 0);
rig.position.set(0, 0, 3);
const renderer = new T.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFoveation(1);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.domElement.id = "world";
document.body.prepend(renderer.domElement);
scene.add(new T.HemisphereLight(0xe5efff, 0x27364b, 2.3));
const sun = new T.DirectionalLight(0xfff1dc, 2.8);
sun.position.set(-5, 12, 5);
scene.add(sun);
scene.add(world.root);
const dynamics = new T.Group();
scene.add(dynamics);
const ray = new T.Raycaster(),
  temp = new T.Vector3(),
  dir = new T.Vector3(),
  quat = new T.Quaternion(),
  aim = new T.Object3D();
const gun = new T.Group();
let flash: T.Mesh, gunBody: T.Group;
function makeGun() {
  gun.clear();
  gunBody = new T.Group();
  const w = weapon.index;
  gunBody.add(
    box(w === 0 ? 0.075 : 0.09, 0.1, w === 0 ? 0.25 : 0.55, 0x26332c),
  );
  const grip = box(0.065, 0.16, 0.08, 0x19251e);
  grip.position.set(0, -0.1, 0.06);
  grip.rotation.x = -0.2;
  gunBody.add(grip);
  const barrel = box(0.028, 0.028, 0.07, 0x78816e);
  barrel.position.set(0, 0.018, w === 0 ? -0.16 : -0.31);
  gunBody.add(barrel);
  for (const z of [w === 0 ? -0.08 : -0.23, 0.08]) {
    const sight = box(0.012, 0.025, 0.014, 0xc6e979);
    sight.position.set(0, 0.063, z);
    gunBody.add(sight);
  }
  if (w > 0) {
    const stock = box(0.06, 0.09, 0.2, 0x344839);
    stock.position.z = 0.27;
    gunBody.add(stock);
    const fore = box(0.07, 0.065, 0.22, 0x46563a);
    fore.position.set(0, -0.05, -0.15);
    gunBody.add(fore);
  }
  flash = new T.Mesh(
    new T.ConeGeometry(0.055, 0.18, 6),
    new T.MeshBasicMaterial({
      color: 0xffd988,
      transparent: true,
      opacity: 0.95,
    }),
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.z = w === 0 ? -0.24 : -0.4;
  flash.visible = false;
  gunBody.add(flash);
  gun.add(gunBody);
}
makeGun();
camera.add(gun);
gun.position.set(0.23, -0.21, -0.4);
const flashlight = new T.SpotLight(0xeaf4ff, 12, 32, 0.45, 0.6, 1);
camera.add(flashlight, flashlight.target);
flashlight.position.set(0.1, -0.1, -0.3);
flashlight.target.position.set(0, 0, -20);
flashlight.visible = false;
interface Target {
  motion?: string;
  group: T.Group;
  face: T.Mesh;
  type: string;
  noShoot: boolean;
  hits: number;
  down: boolean;
  station: number;
  activeUntil: number;
  activeFrom: number;
  raised: number;
  base: T.Vector3;
}
interface Dummy {
  group: T.Group;
  body: T.Mesh;
  head: T.Mesh;
  type: string;
  hp: number;
  lastAttack: number;
  path: T.Vector3[];
  stunned: number;
  state: string;
  shield?: T.Mesh;
}
const targets: Target[] = [],
  dummies: Dummy[] = [],
  decals: T.Mesh[] = [],
  balls: { mesh: T.Mesh; vel: T.Vector3 }[] = [];
const controllerSources: (XRInputSource | undefined)[] = [];
const controllers: T.Group[] = [],
  grips: T.Group[] = [];
const prevButtons = new Map<string, boolean>();
let snapReady = true,
  teleportPoint: T.Vector3 | null = null;
const wrist = textBoard("READY", 0.28, 0.075);
wrist.rotation.x = -0.65;
wrist.position.set(0, 0.09, 0.03);
const vrMenu = new T.Group();
scene.add(vrMenu);
vrMenu.visible = false;
const menuButtons: T.Mesh[] = [];
function buildVrMenu() {
  for (const child of [...vrMenu.children]) {
    child.removeFromParent();
    if (child instanceof T.Mesh) {
      child.geometry.dispose();
      const mat = child.material as T.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  }
  menuButtons.length = 0;
  const title = textBoard(
    finished ? resultsSummary : playing ? "RANGE CONTROL" : "RANGE DAY XR",
    2.6,
    0.3,
  );
  title.position.set(0, 2.25, -2.3);
  vrMenu.add(title);
  const choices: [string, string][] = [
    ["01 STANDARD", "range-standard"],
    ["02 RUN-THROUGH", "range-runthrough"],
    ["04 QUALIFICATION HOUSE", "qualification"],
    ["03 WAREHOUSE", "range-warehouse"],
    [finished ? "RETRY SESSION" : playing ? "RESUME" : "START RANGE", "resume"],
    ["RELOAD", "reload"],
    ["BACK TO HUB", "hub"],
  ];
  if (playing && range === "standard")
    choices.push(
      ["5 / 10 / 15 / 25 / 50m", "distance"],
      ["BRING TARGET BACK", "bring"],
      ["PAPER / ZONE / STEEL", "target"],
      ["NEXT DRILL", "drill"],
      ["RESET TARGETS", "reset"],
      ["FINISH STRING", "finish"],
    );
  if (playing && range === "runthrough")
    choices.push(["NEXT COURSE", "course"]);
  if (playing && range === "warehouse")
    choices.push(
      ["NEXT MODE", "mode"],
      ["SPAWN WALKER", "spawn-walker"],
      ["SPAWN RUSHER", "spawn-rusher"],
      ["SPAWN SHOOTER", "spawn-shooter"],
      ["SPAWN SHIELD", "spawn-shield"],
      ["TOGGLE ATTACKS", "attacks"],
    );
  choices.push(
    ["SNAP / SMOOTH TURN", "setting-snap"],
    ["SIMPLE / MANUAL RELOAD", "setting-simpleReload"],
    ["SWAP DOMINANT HAND", "setting-leftHand"],
    ["MOVE / TELEPORT", "setting-teleport"],
    ["VIGNETTE ON / OFF", "setting-vignette"],
    ["SOUND ON / OFF", "setting-sound"],
  );
  const columns = choices.length > 18 ? 3 : 2;
  for (const [i, [label, action]] of choices.entries()) {
    const button = textBoard(label, 1.35, 0.18);
    button.position.set(
      ((i % columns) - (columns - 1) / 2) * 1.46,
      1.94 - Math.floor(i / columns) * 0.215,
      -2.3,
    );
    button.userData.action = action;
    vrMenu.add(button);
    menuButtons.push(button);
  }
}
const menuLaser = new T.Line(
  new T.BufferGeometry().setFromPoints([
    new T.Vector3(),
    new T.Vector3(0, 0, -4),
  ]),
  new T.LineBasicMaterial({ color: 0x66c7ff }),
);
menuLaser.visible = false;
const teleportMarker = new T.Mesh(
  new T.RingGeometry(0.2, 0.25, 32),
  new T.MeshBasicMaterial({ color: 0x66c7ff, side: T.DoubleSide }),
);
teleportMarker.rotation.x = -Math.PI / 2;
teleportMarker.visible = false;
scene.add(teleportMarker);
const modelFactory = new XRControllerModelFactory();
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i),
    g = renderer.xr.getControllerGrip(i);
  c.addEventListener("connected", (e: any) => {
    controllerSources[i] = e.data;
    attachGun();
  });
  c.addEventListener("disconnected", () => {
    controllerSources[i] = undefined;
  });
  c.addEventListener("selectstart", () => {
    if (vrMenu.visible && isGun(i)) {
      ray.set(
        c.getWorldPosition(new T.Vector3()),
        new T.Vector3(0, 0, -1).applyQuaternion(
          c.getWorldQuaternion(new T.Quaternion()),
        ),
      );
      const hit = ray.intersectObjects(menuButtons)[0];
      if (hit) void menuAction(hit.object.userData.action);
    } else if (isGun(i)) {
      fireHeld = true;
      fire();
    }
  });
  c.addEventListener("selectend", () => {
    if (isGun(i)) fireHeld = false;
  });
  g.add(modelFactory.createControllerModel(g));
  rig.add(c, g);
  controllers.push(c);
  grips.push(g);
}
function isGun(i: number) {
  return (
    controllerSources[i]?.handedness ===
    (save.settings.leftHand ? "left" : "right")
  );
}
function attachGun() {
  if (renderer.xr.isPresenting) {
    const i = controllerSources.findIndex((_, i) => isGun(i));
    if (i >= 0) {
      grips[i].add(gun);
      gun.position.set(0, -0.015, -0.07);
      gun.rotation.set(0, 0, 0);
    }
    const si = controllerSources.findIndex(
      (s) => s?.handedness === (save.settings.leftHand ? "right" : "left"),
    );
    if (si >= 0) grips[si].add(wrist);
  } else {
    camera.add(gun);
    gun.position.set(0.23, -0.21, -0.4);
    gun.rotation.set(0, 0, 0);
  }
}
function haptic(strength = 0.35, duration = 35) {
  for (const s of controllerSources) {
    const pad = s?.gamepad as any;
    pad?.hapticActuators?.[0]?.pulse(strength, duration);
  }
}
let audio: AudioContext | undefined;
function tone(
  freq: number,
  duration = 0.08,
  volume = 0.08,
  type: OscillatorType = "sine",
) {
  if (!save.settings.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, freq * 0.25),
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + duration,
    );
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {}
}
function toast(message: string, seconds = 2) {
  $("#toast").textContent = message;
  toastUntil = time + seconds;
}
function addTarget(
  type: string,
  x: number,
  y: number,
  z: number,
  no = false,
  station = -1,
  yaw = 0,
) {
  const group = new T.Group();
  group.position.set(x, y, z);
  group.rotation.y = yaw;
  const steel = type === "steel";
  const face = new T.Mesh(
    steel ? new T.CircleGeometry(0.3, 24) : new T.PlaneGeometry(1.1, 1.1),
    steel
      ? new T.MeshStandardMaterial({
          color: 0xced7ba,
          metalness: 0.6,
          roughness: 0.4,
          side: T.DoubleSide,
        })
      : new T.MeshStandardMaterial({
          map: paperTexture(type, no),
          side: T.DoubleSide,
          roughness: 1,
        }),
  );
  group.add(face);
  const stand = box(0.05, 1.3, 0.05, 0x354333);
  stand.position.set(0, -1.1, -0.05);
  group.add(stand);
  dynamics.add(group);
  const target: Target = {
    group,
    face,
    type,
    noShoot: no,
    hits: 0,
    down: false,
    station,
    activeUntil: 0,
    activeFrom: Infinity,
    raised: 0,
    base: group.position.clone(),
  };
  face.userData.target = target;
  targets.push(target);
  if (station >= 0) {
    group.visible = false;
    const cover = box(1.45, 0.85, 0.25, 0x947d51);
    cover.position.set(x + Math.sin(yaw) * 0.3, 0.425, z + Math.cos(yaw) * 0.3);
    cover.rotation.y = yaw;
    dynamics.add(cover);
  }
  return target;
}
function clearDynamics() {
  dynamics.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if ("map" in m) (m as T.MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
    }
  });
  dynamics.clear();
  targets.length = dummies.length = decals.length = balls.length = 0;
}
function showModal(html: string) {
  $("#modal").innerHTML = `<section class="modal">${html}</section>`;
  $("#modal").classList.remove("hidden");
}
function closeModal() {
  $("#modal").classList.add("hidden");
}
function modalHead(title: string) {
  return `<div class="modal-head"><h2>${title}</h2><button class="close" aria-label="Close" id="close-modal">×</button></div>`;
}
function howTo() {
  showModal(
    `${modalHead("Welcome to the range")}<p>Click <b>Enter the range</b> to capture your mouse. Aim with the mouse and click to fire. Press <b>Esc</b> to pause and release the mouse.</p><table><tr><td>Move / Sprint / Crouch</td><td>W A S D / Shift / C</td></tr><tr><td>Look / turn 360°</td><td>Mouse or right-drag; Q/E or arrow keys</td></tr><tr><td>Reload / Change weapon</td><td>R / 1–3 or mouse wheel</td></tr><tr><td>Manual reload (simple reload off)</td><td>R eject → R insert → R charge</td></tr><tr><td>Finish a free-fire string</td><td>Enter</td></tr><tr><td>Debug / Free camera</td><td>F1 / F2 (Space up, C down)</td></tr></table><p><b>Quest:</b> Enter VR, point at a menu button and pull the trigger. Gun-hand trigger fires, A/X reloads, B/Y changes weapons, support stick moves, gun stick turns. Squeeze both grips for a stable two-hand hold. Support Y/B opens the wrist menu. Full reload: eject with A/X, grip near your belt to take a magazine, bring it to the gun, then grip near the slide and pull back.</p><p>Blue course targets are shoot targets. White crossed targets add 10 seconds. Course misses add 5 seconds. All three ranges are open in this early-access build.</p>`,
  );
}
function settings() {
  showModal(
    `${modalHead("Comfort & settings")}<div class="settings-grid">${Object.entries(
      {
        sound: "Sound effects",
        snap: "30° snap turning",
        vignette: "Movement vignette",
        leftHand: "Left-hand weapon",
        simpleReload: "Simple reload",
        seated: "Seated height assist",
        teleport: "Teleport locomotion (VR)",
      },
    )
      .map(
        ([k, v]) =>
          `<label><input type="checkbox" data-setting="${k}" ${save.settings[k as keyof typeof save.settings] ? "checked" : ""}>${v}</label>`,
      )
      .join(
        "",
      )}</div><p>Settings and personal records are saved on this browser. VR uses the wrist panel for session stats.</p>`,
  );
}
function records() {
  showModal(
    `${modalHead("Personal records")}${(
      ["standard", "runthrough", "warehouse"] as RangeId[]
    )
      .map(
        (id) =>
          `<p style="color:var(--accent);letter-spacing:2px">${id.toUpperCase()}</p><table><tr><th>#</th><th>${id === "runthrough" ? "TIME + PENALTIES" : "POINTS"}</th><th>ACCURACY</th><th>DATE</th></tr>${
            save.scores[id].length
              ? save.scores[id]
                  .slice(0, 5)
                  .map(
                    (r, i) =>
                      `<tr><td>0${i + 1}</td><td>${r.score.toFixed(id === "runthrough" ? 1 : 0)}${id === "runthrough" ? "s" : ""}</td><td>${r.accuracy}%</td><td>${r.date}</td></tr>`,
                  )
                  .join("")
              : '<tr><td colspan="4">Your first record is waiting.</td></tr>'
          }</table>`,
      )
      .join("")}`,
  );
}
function updateControls() {
  const el = $("#range-controls");
  if (range === "standard")
    el.innerHTML = `${[5, 10, 15, 25, 50].map((d) => `<button data-distance="${d}" class="${distance === d ? "active" : ""}">${d}m</button>`).join("")}<button id="bring">BRING BACK</button><select aria-label="Target type" id="target-select"><option value="paper">Bullseye paper</option><option value="steel">Steel plates</option><option value="zone">A / C / D zones</option></select><select aria-label="Drill" id="drill-select"><option value="free">Free fire</option><option value="group">5-shot group</option><option value="timed">6-shot timed string</option><option value="reaction">Reaction drill</option></select><button id="reset-targets">RESET</button><button id="finish-string">FINISH STRING</button>`;
  else if (range === "runthrough")
    el.innerHTML = `<select aria-label="Course" id="course-select"><option value="basic">Basic Lane</option><option value="cover">Cover Drill</option><option value="night">Night Run</option><option value="qualification">Qualification House · 360° CQB</option></select><button id="restart">RESTART</button>`;
  else
    el.innerHTML = `<select aria-label="Warehouse mode" id="mode-select"><option value="survival">Survival</option><option value="clear">Clear the building</option><option value="sandbox">Sandbox</option></select><button id="restart">RESTART</button>${warehouseMode === "sandbox" ? '<button id="spawn-dummy">SPAWN DUMMY</button><button id="attacks">ATTACKS: OFF</button>' : ""}`;
}
function standardTargets() {
  for (const t of targets) {
    t.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const m = o.material as T.MeshStandardMaterial;
        m.map?.dispose();
        m.dispose();
      }
    });
    dynamics.remove(t.group);
  }
  decals.length = 0;
  targets.length = 0;
  paperHits = [];
  if (targetType === "steel") {
    for (let i = 0; i < 5; i++)
      addTarget("steel", (i - 2) * 0.65, 1.65, -distance);
  } else {
    addTarget(targetType, 0, 1.8, -distance);
    for (let lane = -4; lane <= 5; lane++)
      if (lane) addTarget("paper", lane * 3, 1.8, -15 - Math.abs(lane) * 3);
  }
}
async function start(id: RangeId, flat = true) {
  if (loading) return;
  if (flat && !renderer.xr.isPresenting && !document.pointerLockElement)
    captureMouse();
  loading = true;
  $("#loading").classList.remove("hidden");
  closeModal();
  range = id;
  selected = id;
  playing = false;
  clearDynamics();
  try {
    if (id === "runthrough") {
      const response = await fetch(
        `${import.meta.env.BASE_URL}courses/${courseName}.json`,
      );
      if (!response.ok) throw new Error("Course file could not load");
      course = await response.json();
    }
    await world.load(id === "runthrough" ? (course.scene ?? "runthrough") : id);
    rig.position.set(
      id === "runthrough" ? (course.start?.[0] ?? 0) : 0,
      0,
      id === "standard"
        ? 5.5
        : id === "runthrough"
          ? (course.start?.[1] ?? 3)
          : 3,
    );
    camera.position.set(0, save.settings.seated ? 2.05 : 1.65, 0);
    camera.rotation.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    elapsed = shots = hits = points = noShoot = stopped = wave = 0;
    reactionReady = false;
    ghost.visible = false;
    health = 100;
    lastDamage = -99;
    activated.clear();
    finished = false;
    paused = false;
    weapon.equip(weapon.index);
    weapon.reserve = id === "standard" ? Infinity : 6;
    reloadUntil = 0;
    ghostSamples = [];
    lastGhost = 0;
    paperHits = [];
    splits = [];
    makeGun();
    flashlight.visible = false;
    scene.fog = new T.Fog(
      id === "runthrough" ? "#9aafc3" : "#34475e",
      id === "runthrough" ? 30 : 18,
      100,
    );
    scene.background = new T.Color(id === "runthrough" ? "#c8dff1" : "#34475e");
    if (id === "standard") {
      standardTargets();
      const sign = textBoard("01 / STANDARD RANGE", 4, 0.65);
      sign.position.set(0, 3.7, -6);
      dynamics.add(sign);
    } else if (id === "runthrough") {
      for (const [i, s] of course.stations.entries())
        for (const [x, z, no, motion, yaw] of s.targets) {
          const t = addTarget(
            motion === "activator" ? "steel" : "popup",
            x,
            1.6,
            z,
            no,
            i,
            yaw ?? 0,
          );
          t.motion = motion;
        }
      for (const [i, s] of course.stations.entries()) {
        const sign = textBoard(s.label ?? `STATION 0${i + 1}`, 2, 0.4);
        sign.position.set((s.x ?? 0) - 2.5, 2.8, s.z);
        const ring = new T.Mesh(
          new T.RingGeometry(s.radius ?? 1.2, (s.radius ?? 1.2) + 0.07, 32),
          new T.MeshBasicMaterial({ color: 0x66c7ff, side: T.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(s.x ?? 0, 0.025, s.z);
        dynamics.add(ring);
        dynamics.add(sign);
      }
      const finish = textBoard("FINISH", 5, 1);
      finish.position.set(
        typeof course.finish === "number" ? 0 : course.finish.x,
        2.5,
        typeof course.finish === "number" ? course.finish : course.finish.z,
      );
      if (course.indoors) {
        scene.background = new T.Color("#4d6178");
        scene.fog = new T.Fog("#4d6178", 25, 70);
        const title = textBoard("QUALIFICATION HOUSE · GO", 3.5, 0.5);
        title.position.set(0, 2.8, 1);
        dynamics.add(title);
      }
      dynamics.add(finish);
      flashlight.visible = course.night;
      sun.intensity = course.night ? 0.05 : 2.8;
      (
        scene.children.find(
          (c) => c instanceof T.HemisphereLight,
        ) as T.HemisphereLight
      ).intensity = course.night ? 0.15 : 2.3;
      if (course.night) {
        scene.background = new T.Color("#091424");
        scene.fog = new T.Fog("#091424", 5, 35);
      }
    } else {
      breakUntil = 3;
      const sign = textBoard("03 / WAREHOUSE", 5, 0.8);
      sign.position.set(0, 4, -24);
      dynamics.add(sign);
      if (warehouseMode === "clear") {
        wave = 3;
        for (let i = 0; i < 10; i++)
          spawnDummy(i % 3 === 0 ? "rusher" : "walker");
        breakUntil = Infinity;
      }
      if (warehouseMode === "sandbox") breakUntil = Infinity;
    }
    if (id !== "runthrough") {
      sun.intensity = 2.8;
      (
        scene.children.find(
          (c) => c instanceof T.HemisphereLight,
        ) as T.HemisphereLight
      ).intensity = 2.3;
    }
    updateControls();
    if (id === "standard") {
      ($("#target-select") as HTMLSelectElement).value = targetType;
      ($("#drill-select") as HTMLSelectElement).value = drill;
    }
    if (id === "runthrough")
      ($("#course-select") as HTMLSelectElement).value = courseName;
    if (id === "warehouse")
      ($("#mode-select") as HTMLSelectElement).value = warehouseMode;
    $("#shell").classList.add("hidden");
    $("#hud").classList.remove("hidden");
    $("#course-guide").classList.toggle("hidden", id !== "runthrough");
    $("#range-label").textContent =
      id === "standard"
        ? "01 / STANDARD RANGE"
        : id === "runthrough"
          ? "02 / RUN-THROUGH"
          : "03 / WAREHOUSE";
    if (id === "runthrough")
      $("#range-label").textContent =
        `${courseName === "qualification" ? "04" : "02"} / ${course.name.toUpperCase()} · 360° FREE MOVEMENT`;
    playing = true;
    vrMenu.visible = false;
    gun.visible = true;
    toast(
      id === "standard"
        ? "BREATHE. LINE UP. MAKE IT COUNT."
        : id === "runthrough"
          ? "CROSS THE STATIONS. BLUE TARGETS ONLY."
          : "STAY MOVING. WATCH THE AISLES.",
      3,
    );
    if (drill === "reaction" && id === "standard") {
      reactionAt = elapsed + 2 + Math.random() * 3;
      toast("WAIT FOR THE TONE", 5);
    }
  } catch (e) {
    showModal(
      `${modalHead("Unable to load range")}<p>${String(e)}</p><button class="secondary" id="hub">BACK TO HUB</button>`,
    );
  } finally {
    loading = false;
    $("#loading").classList.add("hidden");
  }
}
let reactionAt = 0,
  reactionReady = false,
  sandboxAttacks = false;
function spawnDummy(type?: string) {
  if (dummies.length >= 12) return;
  type ??=
    wave >= 5 && Math.random() < 0.2
      ? "shield"
      : wave >= 3 && Math.random() < 0.25
        ? "shooter"
        : wave >= 2 && Math.random() < 0.45
          ? "rusher"
          : "walker";
  const p =
    world.spawns[Math.floor(Math.random() * world.spawns.length)] ||
    new T.Vector3(0, 0, -22);
  const group = new T.Group();
  group.position.copy(p);
  group.position.x += (Math.random() - 0.5) * 1.5;
  const body = box(0.48, 0.78, 0.3, type === "rusher" ? 0xe79b43 : 0xd9793d);
  body.position.y = 1.05;
  group.add(body);
  const head = new T.Mesh(
    new T.SphereGeometry(0.18, 10, 8),
    new T.MeshStandardMaterial({ color: 0xdf995b }),
  );
  head.scale.y = 1.2;
  head.position.y = 1.65;
  group.add(head);
  for (let side of [-1, 1]) {
    const leg = box(0.14, 0.62, 0.17, 0xb96534);
    leg.position.set(side * 0.15, 0.32, 0);
    group.add(leg);
    const arm = box(0.12, 0.6, 0.14, 0xd58446);
    arm.position.set(side * 0.34, 1.05, 0);
    group.add(arm);
  }
  const target = new T.Mesh(
    new T.CircleGeometry(0.15, 16),
    new T.MeshBasicMaterial({ map: paperTexture("paper") }),
  );
  target.position.set(0, 1.12, 0.157);
  group.add(target);
  const dummy: Dummy = {
    group,
    body,
    head,
    type,
    hp: type === "shooter" ? 4 : type === "rusher" ? 2 : 3,
    lastAttack: -99,
    path: [],
    stunned: 0,
    state: "chase",
  };
  if (type === "shield") {
    const shield = box(0.75, 1.1, 0.08, 0x445d4e);
    shield.position.set(0, 1, 0.32);
    group.add(shield);
    dummy.shield = shield;
    shield.userData.dummy = dummy;
    shield.userData.zone = "shield";
  }
  body.userData.dummy = head.userData.dummy = dummy;
  body.userData.zone = "body";
  head.userData.zone = "head";
  for (const child of group.children) {
    if (child instanceof T.Mesh && !child.userData.dummy) {
      child.userData.dummy = dummy;
      child.userData.zone = "leg";
    }
  }
  dummies.push(dummy);
  dynamics.add(group);
}
function aimRay() {
  scene.updateMatrixWorld(true);
  if (renderer.xr.isPresenting) {
    gun.getWorldPosition(temp);
    gun.getWorldQuaternion(quat);
    dir.set(0, 0, -1).applyQuaternion(quat);
    ray.set(temp, dir);
  } else {
    ray.setFromCamera(new T.Vector2(0, 0), camera);
  }
}
function fire() {
  if (!playing || paused || finished || vrMenu.visible) return;
  if (range === "standard" && drill === "reaction" && !reactionReady) {
    toast("WAIT FOR GREEN");
    return;
  }
  if (!weapon.fire(elapsed)) {
    if (weapon.ammo === 0 && elapsed - weapon.lastShot > 0.3) {
      toast("EMPTY — RELOAD");
      tone(90, 0.03, 0.02, "square");
    }
    return;
  }
  shots++;
  splits.push(elapsed);
  recoil = WEAPONS[weapon.index].kick;
  flash.visible = true;
  flashUntil = time + 0.055;
  haptic(weapon.index === 2 ? 0.9 : 0.35);
  tone(weapon.index === 2 ? 100 : 180, 0.12, 0.11, "sawtooth");
  aimRay();
  const pellets = weapon.index === 2 ? 8 : 1;
  let shotHit = false;
  for (let p = 0; p < pellets; p++) {
    const spread =
      WEAPONS[weapon.index].spread * (weapon.index === 1 && fireHeld ? 1.7 : 1);
    const r = new T.Raycaster(
      ray.ray.origin.clone(),
      ray.ray.direction
        .clone()
        .add(
          new T.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            0,
          ),
        )
        .normalize(),
      0,
      100,
    );
    const objects: T.Object3D[] = [
      ...targets.filter((t) => t.group.visible && !t.down).map((t) => t.face),
      ...dummies.flatMap((d) => d.group.children),
    ];
    const hit = r.intersectObjects(objects, false)[0];
    if (
      !hit ||
      world.occluded(r.ray.origin, r.ray.direction, hit.distance - 0.03)
    )
      continue;
    if (hit.object.userData.target) {
      const t = hit.object.userData.target as Target;
      const local = t.group.worldToLocal(hit.point.clone());
      if (t.noShoot) {
        if (!t.down) noShoot++;
        t.down = true;
        toast("NO-SHOOT +10s");
        tone(100, 0.2, 0.06);
      } else {
        shotHit = true;
        t.hits++;
        const s =
          t.type === "steel"
            ? 10
            : t.type === "zone"
              ? Math.abs(local.x) < 0.18 && Math.abs(local.y) < 0.3
                ? 5
                : Math.abs(local.x) < 0.35 && Math.abs(local.y) < 0.45
                  ? 3
                  : 1
              : paperScore(local.x, local.y);
        points += s;
        if (
          (t.station >= 0 &&
            (Math.hypot(local.x, local.y) < 0.2 || t.hits >= 2)) ||
          t.type === "steel"
        )
          t.down = true;
        if (t.motion === "activator")
          for (const swinger of targets.filter(
            (s) => s.station === t.station && s.motion === "swinger",
          )) {
            swinger.activeFrom = elapsed;
            swinger.activeUntil = elapsed + course.upTime;
          }
        if (range === "standard" && t === targets[0])
          paperHits.push({ x: local.x, y: local.y });
        tone(t.type === "steel" ? 1800 : 600, 0.12, 0.03);
      }
      const mark = new T.Mesh(
        new T.CircleGeometry(0.014, 6),
        new T.MeshBasicMaterial({ color: 0x1b241c, side: T.DoubleSide }),
      );
      mark.position.set(local.x, local.y, 0.008);
      t.group.add(mark);
      decals.push(mark);
      if (decals.length > 48) {
        const old = decals.shift()!;
        old.removeFromParent();
        old.geometry.dispose();
        (old.material as T.Material).dispose();
      }
    } else if (hit.object.userData.dummy) {
      const d = hit.object.userData.dummy as Dummy;
      if (hit.object.userData.zone === "shield") {
        tone(1300, 0.12, 0.03);
        toast("SHIELD — FLANK OR AIM LOW", 0.6);
        continue;
      }
      shotHit = true;
      d.hp -= hit.object.userData.zone === "head" ? 10 : 1;
      d.stunned = elapsed + 0.25;
      d.state = "stunned";
      points += hit.object.userData.zone === "head" ? 25 : 10;
      if (d.hp <= 0) {
        stopped++;
        points += 50;
        dynamics.remove(d.group);
        dummies.splice(dummies.indexOf(d), 1);
      }
    }
  }
  if (shotHit) {
    hits++;
    $("#hitmark").style.opacity = "1";
    hitUntil = time + 0.14;
  }
  if (
    range === "standard" &&
    ((drill === "group" && shots >= 5) ||
      (drill === "timed" && shots >= 6) ||
      (drill === "reaction" && shots >= 1))
  )
    setTimeout(() => finish(), 250);
}
function reload() {
  if (!playing || paused || finished || reloadUntil) return;
  if (
    weapon.ammo === WEAPONS[weapon.index].capacity &&
    weapon.state === "loaded"
  )
    return;
  if (range === "standard") weapon.reserve = Infinity;
  if (save.settings.simpleReload) {
    weapon.eject();
    reloadUntil = elapsed + (weapon.index === 2 ? 0.55 : 1.5);
    toast("RELOADING", 1.5);
    tone(250, 0.12, 0.03);
  } else {
    if (weapon.state === "loaded" || weapon.state === "empty") {
      weapon.eject();
      toast("MAGAZINE OUT · R TO INSERT");
    } else if (weapon.state === "mag-out") {
      if (weapon.insert()) toast("MAGAZINE IN · R TO CHARGE");
      else toast("NO SPARE MAGAZINES");
    } else {
      weapon.charge();
      toast("READY", 0.7);
    }
    haptic(0.15, 20);
  }
}
function damage(amount: number) {
  health = Math.max(0, health - amount);
  lastDamage = elapsed;
  damageUntil = time + 0.4;
  haptic(0.7, 180);
  tone(70, 0.2, 0.1);
  if (!health) finish();
}
function finish() {
  if (finished || !playing) return;
  finished = true;
  paused = true;
  fireHeld = false;
  document.exitPointerLock();
  const acc = accuracy(hits, shots);
  const missed = targets.filter(
    (t) => t.station >= 0 && t.motion !== "activator" && !t.noShoot && !t.down,
  ).length;
  const score =
    range === "runthrough"
      ? courseScore(elapsed, missed, noShoot)
      : range === "warehouse"
        ? Math.round(stopped * (1 + acc / 100) * 100)
        : points;
  const gold =
    range === "standard"
      ? points >= Math.min(shots, 15) * 8 && shots >= 5
      : range === "runthrough"
        ? missed === 0 && noShoot === 0
        : wave >= 5;
  const medal = gold ? "GOLD" : acc >= 60 ? "SILVER" : "BRONZE";
  resultsSummary = `${medal} · ${score.toFixed(range === "runthrough" ? 1 : 0)}${range === "runthrough" ? "s" : " PTS"} · ${acc}%`;
  save.unlocks = Math.max(
    save.unlocks,
    range === "standard" && acc >= 60 ? 1 : range === "runthrough" ? 2 : 0,
  );
  save.scores[range].push({
    score,
    accuracy: acc,
    date: new Date().toLocaleDateString(),
  });
  save.scores[range].sort((a, b) =>
    range === "runthrough" ? a.score - b.score : b.score - a.score,
  );
  save.scores[range] = save.scores[range].slice(0, 10);
  if (
    range === "runthrough" &&
    courseName === "basic" &&
    score < (save.ghostTime ?? Infinity)
  ) {
    save.ghost = ghostSamples;
    save.ghostTime = score;
  }
  const saved = persist(save);
  showModal(
    `${modalHead("Session complete")}<div class="eyebrow">${medal} MEDAL · ${range.toUpperCase()}</div><div class="result-big">${score.toFixed(range === "runthrough" ? 1 : 0)}${range === "runthrough" ? "s" : " PTS"}</div><div class="result-stats"><div><small>ACCURACY</small>${acc}%</div><div><small>SHOTS / HITS</small>${shots} / ${hits}</div><div><small>TIME</small>${elapsed.toFixed(1)}s</div></div><p>${range === "standard" ? `Group diameter: ${groupSize(paperHits.slice(-30)).toFixed(1)} cm. ${splits.length > 1 ? `Last split: ${(splits.at(-1)! - splits.at(-2)!).toFixed(2)}s.` : ""}` : range === "runthrough" ? `${missed} missed targets (+${missed * 5}s), ${noShoot} no-shoots (+${noShoot * 10}s). Hit factor: ${(points / Math.max(1, elapsed)).toFixed(2)}.` : `Wave ${wave} reached. ${stopped} dummies stopped.`} ${saved ? "Personal record saved." : "Browser storage unavailable; record could not be saved."}</p><div class="modal-actions"><button class="primary" id="retry">TRY AGAIN ↗</button><button class="secondary" id="hub">BACK TO HUB</button></div>`,
  );
  if (renderer.xr.isPresenting) {
    toast(
      `${medal} · ${score.toFixed(0)} ${range === "runthrough" ? "SECONDS" : "POINTS"}`,
      60,
    );
    openVrMenu();
  }
}
function pause() {
  if (!playing || finished || loading) return;
  paused = true;
  fireHeld = false;
  if (renderer.xr.isPresenting) {
    openVrMenu();
    return;
  }
  showModal(
    `${modalHead("Range paused")}<p>Take a breath. Your session is waiting.</p><div class="modal-actions"><button class="primary" id="resume">RESUME ↗</button><button class="secondary" id="hub">BACK TO HUB</button></div>`,
  );
}
function resume() {
  closeModal();
  paused = false;
  if (!renderer.xr.isPresenting) captureMouse();
  vrMenu.visible = false;
}
async function coursePreview() {
  await world.load("runthrough");
  scene.background = new T.Color("#c8dff1");
  scene.fog = new T.Fog("#9aafc3", 30, 100);
  rig.position.set(3, 0, 4);
  camera.position.set(0, 2.2, 0);
  camera.lookAt(0, 1, -23);
  for (const [i, x] of [-3, 0, 3].entries()) {
    const t = addTarget("popup", x, 1.6, -13 - i * 2, i === 2, 0);
    t.group.visible = true;
    t.raised = 1;
  }
  const sign = textBoard("WALK / RUN · REACT · SHOOT", 6, 0.6);
  sign.position.set(0, 3, -7);
  dynamics.add(sign);
}
async function hub() {
  playing = false;
  paused = false;
  finished = false;
  closeModal();
  document.exitPointerLock();
  $("#shell").classList.remove("hidden");
  $("#hud").classList.add("hidden");
  vrMenu.visible = false;
  gun.visible = false;
  clearDynamics();
  await coursePreview();
  flashlight.visible = false;
  if (renderer.xr.isPresenting) openVrMenu();
}
function openVrMenu() {
  buildVrMenu();
  vrMenu.visible = true;
  vrMenu.position.copy(rig.position);
  vrMenu.rotation.y = rig.rotation.y;
  paused = true;
  const menuHand = controllerSources.findIndex((_, i) => isGun(i));
  controllers[Math.max(0, menuHand)].add(menuLaser);
  menuLaser.visible = true;
}
async function menuAction(action: string) {
  if (action === "qualification") {
    courseName = "qualification";
    await start("runthrough", false);
  } else if (action.startsWith("range-")) {
    await start(action.slice(6) as RangeId, false);
  } else if (action === "resume") {
    if (!playing || finished) await start(selected, false);
    else resume();
  } else if (action === "reload") {
    paused = false;
    vrMenu.visible = false;
    reload();
  } else if (action === "hub") await hub();
  else if (action.startsWith("setting-")) {
    const key = action.slice(8) as keyof typeof save.settings;
    save.settings[key] = !save.settings[key];
    persist(save);
    attachGun();
    haptic(0.15);
  } else if (action === "distance") {
    distance = [5, 10, 15, 25, 50][
      ([5, 10, 15, 25, 50].indexOf(distance) + 1) % 5
    ];
    standardTargets();
    toast(`${distance} METRES`, 2);
  } else if (action === "bring") {
    for (const t of targets)
      if (Math.abs(t.group.position.x) < 1) t.group.position.z = -1;
    toast("TARGET RETURNED", 2);
  } else if (action === "target") {
    targetType = ["paper", "zone", "steel"][
      (["paper", "zone", "steel"].indexOf(targetType) + 1) % 3
    ];
    standardTargets();
    toast(targetType.toUpperCase(), 2);
  } else if (action === "drill") {
    drill = ["free", "group", "timed", "reaction"][
      (["free", "group", "timed", "reaction"].indexOf(drill) + 1) % 4
    ];
    await start("standard", false);
  } else if (action === "reset") standardTargets();
  else if (action === "finish") finish();
  else if (action === "course") {
    courseName = ["basic", "cover", "night", "qualification"][
      (["basic", "cover", "night", "qualification"].indexOf(courseName) + 1) % 4
    ];
    await start("runthrough", false);
  } else if (action === "mode") {
    warehouseMode = ["survival", "clear", "sandbox"][
      (["survival", "clear", "sandbox"].indexOf(warehouseMode) + 1) % 3
    ];
    await start("warehouse", false);
  } else if (action.startsWith("spawn-") && warehouseMode === "sandbox")
    spawnDummy(action.slice(6));
  else if (action === "attacks") sandboxAttacks = !sandboxAttacks;
  menuLaser.visible = vrMenu.visible;
}
const ghost = new T.Mesh(
  new T.CapsuleGeometry(0.22, 0.9, 3, 6),
  new T.MeshBasicMaterial({
    color: 0x87cfff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }),
);
scene.add(ghost);
ghost.visible = false;
function updateXR(dt: number) {
  for (let i = 0; i < controllerSources.length; i++) {
    const source = controllerSources[i],
      gp = source?.gamepad;
    if (!gp) continue;
    const gunHand = isGun(i);
    const pressed = (n: number) => {
      const key = `${i}-${n}`,
        value = !!gp.buttons[n]?.pressed,
        edge = value && !prevButtons.get(key);
      prevButtons.set(key, value);
      return edge;
    };
    const a = pressed(4),
      b = pressed(5),
      grip = pressed(1);
    if (b && !gunHand) {
      if (vrMenu.visible) {
        vrMenu.visible = false;
        menuLaser.visible = false;
        paused = false;
      } else openVrMenu();
    }
    if (a && gunHand) reload();
    if (b && gunHand) {
      weapon.equip((weapon.index + 1) % 3);
      makeGun();
    }
    if (paused) continue;
    if (!gunHand) {
      const ax = gp.axes[2] ?? 0,
        ay = gp.axes[3] ?? 0;
      if (save.settings.teleport) {
        if (ay < -0.65) {
          const o = controllers[i].getWorldPosition(new T.Vector3()),
            d = new T.Vector3(0, 0, -1).applyQuaternion(
              controllers[i].getWorldQuaternion(new T.Quaternion()),
            );
          if (d.y < -0.1) {
            const p = o.addScaledVector(d, -o.y / d.y);
            if (p.distanceTo(rig.position) < 12 && !world.blocked(p.x, p.z)) {
              teleportPoint = p;
              teleportMarker.position.copy(p).setY(0.03);
              teleportMarker.visible = true;
            }
          }
        } else if (teleportPoint) {
          rig.position.x = teleportPoint.x;
          rig.position.z = teleportPoint.z;
          teleportPoint = null;
          teleportMarker.visible = false;
        }
      } else {
        const q = renderer.xr
            .getCamera()
            .getWorldQuaternion(new T.Quaternion()),
          forward = new T.Vector3(0, 0, -1)
            .applyQuaternion(q)
            .setY(0)
            .normalize(),
          right = new T.Vector3(1, 0, 0).applyQuaternion(q).setY(0).normalize();
        const speed = gp.buttons[3]?.pressed ? 5.5 : 3;
        const move = forward
          .multiplyScalar(-ay * dt * speed)
          .addScaledVector(right, ax * dt * speed);
        world.move(rig.position, move.x, move.z);
      }
      if (!save.settings.simpleReload && gp.buttons[1]?.pressed) {
        const hand = grips[i].getWorldPosition(new T.Vector3()),
          head = renderer.xr.getCamera().getWorldPosition(new T.Vector3()),
          gunPos = gun.getWorldPosition(new T.Vector3());
        const belt = head.clone().add(new T.Vector3(0, -0.8, 0));
        if (weapon.state === "mag-out" && hand.distanceTo(belt) < 0.5) {
          heldMag = true;
          toast("MAGAZINE GRABBED · MOVE TO WEAPON", 1);
        }
        if (heldMag && hand.distanceTo(gunPos) < 0.18 && weapon.insert()) {
          heldMag = false;
          haptic(0.2);
          toast("MAGAZINE SEATED · RACK SLIDE", 1);
        } else if (weapon.state === "mag-in") {
          if (hand.distanceTo(gunPos) < 0.2 && grip) slideStart = hand.clone();
          if (slideStart && hand.distanceTo(slideStart) > 0.08) {
            weapon.charge();
            slideStart = null;
            haptic(0.2);
            toast("READY", 1);
          }
        }
      }
    } else {
      const turn = gp.axes[2] ?? 0;
      if (save.settings.snap) {
        if (Math.abs(turn) > 0.7 && snapReady) {
          rig.rotation.y -= (Math.sign(turn) * Math.PI) / 6;
          snapReady = false;
        }
        if (Math.abs(turn) < 0.3) snapReady = true;
      } else rig.rotation.y -= turn * dt * 1.7;
    }
  }
  const support = controllerSources.findIndex((_, i) => !isGun(i));
  if (
    support >= 0 &&
    controllerSources[support]?.gamepad?.buttons[1]?.pressed &&
    weapon.state === "loaded"
  ) {
    const p = gun.getWorldPosition(new T.Vector3()),
      s = grips[support].getWorldPosition(new T.Vector3());
    if (p.distanceTo(s) < 0.6 && p.distanceTo(s) > 0.12) {
      aim.position.copy(p);
      aim.lookAt(s);
      aim.rotateY(Math.PI);
      const q = aim.quaternion.clone();
      gun.parent!.getWorldQuaternion(quat);
      gun.quaternion.copy(quat.invert().multiply(q));
    }
  } else gun.quaternion.slerp(new T.Quaternion(), 0.3);
}
let heldMag = false,
  slideStart: T.Vector3 | null = null;
function updateDummies(dt: number) {
  if (
    warehouseMode === "survival" &&
    !dummies.length &&
    elapsed >= breakUntil
  ) {
    wave++;
    for (let i = 0; i < Math.min(12, 3 + 2 * wave); i++) spawnDummy();
    breakUntil = Infinity;
    toast(`WAVE ${wave} · ${dummies.length} DUMMIES`, 3);
    tone(660, 0.25, 0.08);
  }
  if (
    warehouseMode === "survival" &&
    !dummies.length &&
    breakUntil === Infinity &&
    wave
  ) {
    breakUntil = elapsed + 15;
    weapon.reserve = Math.min(12, weapon.reserve + 3);
    health = Math.min(100, health + 25);
    toast("WAVE CLEAR · AMMO RESUPPLIED · 15s", 5);
  }
  if (warehouseMode === "clear" && !dummies.length) finish();
  const player = renderer.xr.isPresenting
    ? renderer.xr.getCamera().getWorldPosition(new T.Vector3())
    : camera.getWorldPosition(new T.Vector3());
  player.y = 0;
  if (elapsed >= nextAi) {
    nextAi = elapsed + 0.1;
    for (const d of dummies) {
      d.path = world.findPath(d.group.position, player);
      d.state =
        elapsed < d.stunned
          ? "stunned"
          : d.type === "shooter"
            ? "seek-cover"
            : "chase";
    }
  }
  for (const d of dummies) {
    if (elapsed < d.stunned) continue;
    const diff = player.clone().sub(d.group.position),
      dist = diff.length();
    d.group.rotation.y = Math.atan2(diff.x, diff.z);
    if (dist > (d.type === "shooter" ? 8 : 1)) {
      const waypoint = d.path[0];
      if (waypoint) {
        const toward = waypoint.clone().sub(d.group.position).setY(0);
        if (toward.length() < 0.25) d.path.shift();
        else {
          toward
            .normalize()
            .multiplyScalar(
              dt *
                (d.type === "rusher"
                  ? 4
                  : d.type === "shield"
                    ? 1
                    : d.type === "shooter"
                      ? 1.5
                      : 1.2),
            );
          world.move(d.group.position, toward.x, toward.z);
          d.group.position.y = Math.sin(elapsed * 10) * 0.025;
        }
      }
    } else if (
      elapsed - d.lastAttack > (d.type === "shooter" ? 2 : 1.2) &&
      (warehouseMode !== "sandbox" || sandboxAttacks)
    ) {
      const origin = d.group.position.clone().setY(1.35),
        end = camera.getWorldPosition(new T.Vector3()),
        direction = end.sub(origin).normalize();
      if (world.occluded(origin, direction, Math.max(0, dist - 0.3))) continue;
      d.lastAttack = elapsed;
      d.state = "attack";
      if (d.type === "shooter") {
        const ball = new T.Mesh(
          new T.SphereGeometry(0.07, 8, 6),
          new T.MeshBasicMaterial({ color: 0xddff6b }),
        );
        ball.position.copy(origin);
        dynamics.add(ball);
        balls.push({ mesh: ball, vel: direction.multiplyScalar(6) });
      } else damage(d.type === "rusher" ? 20 : 12);
    }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.mesh.position.addScaledVector(b.vel, dt);
    const p = camera.getWorldPosition(new T.Vector3());
    if (b.mesh.position.distanceTo(p) < 0.35) {
      damage(10);
      b.mesh.removeFromParent();
      balls.splice(i, 1);
    } else if (
      b.mesh.position.distanceTo(p) > 50 ||
      world.blocked(b.mesh.position.x, b.mesh.position.z)
    ) {
      b.mesh.removeFromParent();
      balls.splice(i, 1);
    }
  }
  if (elapsed - lastDamage > 5) health = Math.min(100, health + dt * 7);
}
let previous = performance.now(),
  fps = 72,
  hudTick = 0;
function frame(now: number) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  time += dt;
  fps = T.MathUtils.lerp(fps, 1 / Math.max(0.001, dt), 0.05);
  if (playing && !paused && !finished && !loading) {
    elapsed += dt;
    if (renderer.xr.isPresenting) updateXR(dt);
    else {
      const turn =
        Number(keys.has("KeyQ") || keys.has("ArrowLeft")) -
        Number(keys.has("KeyE") || keys.has("ArrowRight"));
      camera.rotation.y += turn * dt * 1.8;
      camera.rotation.x = T.MathUtils.clamp(
        camera.rotation.x +
          (Number(keys.has("ArrowUp")) - Number(keys.has("ArrowDown"))) *
            dt *
            1.2,
        -1.5,
        1.5,
      );
      const v = new T.Vector3(
        Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
        0,
        Number(keys.has("KeyS")) - Number(keys.has("KeyW")),
      );
      if (v.lengthSq())
        v.normalize().multiplyScalar(
          dt * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 5.5 : 3),
        );
      v.applyAxisAngle(
        new T.Vector3(0, 1, 0),
        camera.rotation.y + rig.rotation.y,
      );
      world.move(rig.position, v.x, v.z);

      if (freeFly)
        rig.position.y +=
          dt * 3 * (Number(keys.has("Space")) - Number(keys.has("KeyC")));
      else
        camera.position.y = T.MathUtils.lerp(
          camera.position.y,
          (save.settings.seated ? 2.05 : 1.65) - (keys.has("KeyC") ? 0.65 : 0),
          0.2,
        );
      $("#vignette").style.opacity =
        save.settings.vignette && v.lengthSq() ? "0.8" : "0";
    }
    if (fireHeld && WEAPONS[weapon.index].auto) fire();
    if (reloadUntil && elapsed >= reloadUntil) {
      reloadUntil = 0;
      if (weapon.insert()) {
        weapon.charge();
        haptic(0.15);
        if (weapon.index === 2 && weapon.ammo < 6 && weapon.reserve > 0) {
          weapon.eject();
          reloadUntil = elapsed + 0.55;
          toast("LOADING SHELLS", 0.6);
        } else toast("READY", 0.6);
      } else toast("NO SPARE MAGAZINES");
    }
    if (range === "runthrough") {
      for (const [i, s] of course.stations.entries()) {
        const playerPosition = renderer.xr.isPresenting
          ? camera.getWorldPosition(new T.Vector3())
          : rig.position;
        if (i === activated.size && stationReached(playerPosition, s)) {
          activated.add(i);
          toast(`STATION 0${i + 1}`, 1);
          tone(850, 0.12, 0.045);
          for (const [j, t] of targets
            .filter((t) => t.station === i)
            .entries()) {
            t.activeFrom =
              t.motion === "swinger" ? Infinity : elapsed + j * 0.12;
            t.activeUntil = t.activeFrom + course.upTime;
          }
        }
      }
      for (const t of targets) {
        const up =
          elapsed >= t.activeFrom && elapsed < t.activeUntil && !t.down;
        t.raised = T.MathUtils.clamp(
          t.raised + ((up ? 1 : -1) * dt) / 0.28,
          0,
          1,
        );
        t.group.visible = t.raised > 0.001;
        const eased = 1 - Math.pow(1 - t.raised, 3);
        t.group.position.y = -0.6 + (t.base.y + 0.6) * eased;
        if (t.motion === "mover")
          t.group.position.x = t.base.x + Math.sin(elapsed * 2) * 1.5;
        if (t.motion === "swinger") {
          t.group.position.x = t.base.x + Math.sin(elapsed * 3) * 0.8;
          t.group.rotation.z = Math.sin(elapsed * 3) * 0.35;
        }
      }
      const next = course.stations.find(
        (_: unknown, i: number) => !activated.has(i),
      );
      const finishPoint =
        typeof course.finish === "number"
          ? { x: 0, z: course.finish }
          : course.finish;
      const playerPosition = camera.getWorldPosition(new T.Vector3());
      const view = camera.getWorldDirection(new T.Vector3());
      const heading = waypoint(
        playerPosition,
        next ?? finishPoint,
        Math.atan2(-view.x, -view.z),
      );
      const bearing =
        Math.abs(heading.angle) < 0.35
          ? "↑ AHEAD"
          : Math.abs(heading.angle) > 2.6
            ? "↓ BEHIND"
            : heading.angle > 0
              ? "← LEFT"
              : "→ RIGHT";
      $("#course-guide").textContent =
        `${next ? (next.label ?? `STATION ${activated.size + 1}`) : "FINISH GATE"} · ${Math.ceil(heading.distance)}m ${bearing} / ${activated.size} OF ${course.stations.length} ${course.indoors ? "ROOMS" : "STATIONS"}`;
      if (
        finishReached(
          playerPosition,
          course.finish,
          activated.size,
          course.stations.length,
        )
      )
        finish();
      if (elapsed - lastGhost > 0.1) {
        ghostSamples.push({ t: elapsed, x: rig.position.x, z: rig.position.z });
        lastGhost = elapsed;
      }
      if (courseName === "basic" && save.ghost.length) {
        const s = save.ghost.find((s) => s.t >= elapsed);
        ghost.visible = !!s;
        if (s) ghost.position.set(s.x, 0.9, s.z);
      }
    }
    if (range === "warehouse") updateDummies(dt);
    if (
      range === "standard" &&
      drill === "reaction" &&
      !reactionReady &&
      elapsed >= reactionAt
    ) {
      reactionReady = true;
      toast("GREEN · FIRE", 3);
      tone(1000, 0.2, 0.1);
    }
    world.physics.timestep = dt;
    world.physics.step();
  }
  for (const t of targets) {
    if (t.down)
      t.group.rotation.x = T.MathUtils.lerp(
        t.group.rotation.x,
        -Math.PI / 2,
        0.18,
      );
  }
  recoil = T.MathUtils.lerp(recoil, 0, 0.18);
  gunBody.rotation.x = recoil * 2;
  gunBody.position.z = recoil;
  if (time > flashUntil) flash.visible = false;
  if (time > toastUntil) $("#toast").textContent = "";
  if (time > hitUntil) $("#hitmark").style.opacity = "0";
  $("#damage").style.opacity = time < damageUntil ? ".8" : "0";
  if (playing && time > hudTick) {
    hudTick = time + 0.1;
    $("#ammo").textContent = String(weapon.ammo);
    $("#capacity").textContent = String(WEAPONS[weapon.index].capacity);
    $("#score").textContent = String(points);
    $("#accuracy").textContent = shots ? `${accuracy(hits, shots)}%` : "—";
    $("#timer").textContent = elapsed.toFixed(1);
    $("#extra-label").textContent =
      range === "warehouse"
        ? "HEALTH / WAVE"
        : range === "runthrough"
          ? "STATION"
          : "DISTANCE";
    $("#extra").textContent =
      range === "warehouse"
        ? `${Math.ceil(health)} / ${wave}`
        : range === "runthrough"
          ? `${activated.size} / ${course.stations.length}`
          : `${distance}m`;
    $("#weapon-label").textContent =
      `${WEAPONS[weapon.index].short} · ${WEAPONS[weapon.index].name.toUpperCase()}`;
    $("#reload-label").textContent = reloadUntil
      ? "RELOADING…"
      : weapon.state === "mag-out"
        ? "MAG OUT · INSERT MAG"
        : weapon.state === "mag-in"
          ? "RACK SLIDE TO CHARGE"
          : `${Number.isFinite(weapon.reserve) ? weapon.reserve : "∞"} SPARE MAGS · R TO RELOAD`;
    if (renderer.xr.isPresenting) updateWrist();
    if (debug)
      $("#debug").textContent =
        `${fps.toFixed(0)} FPS\n${renderer.info.render.calls} draw calls\n${renderer.info.render.triangles.toLocaleString()} triangles\n${dummies.length} active dummies\n${dummies.map((d) => `${d.type}: ${d.state}`).join("\n")}`;
  }
  if (!playing) {
    const t = time * 0.04;
    camera.position.x = Math.sin(t) * 0.12;
  }
  $("#look-hint").classList.toggle(
    "hidden",
    !!document.pointerLockElement || renderer.xr.isPresenting,
  );
  $("#crosshair").classList.toggle("hidden", renderer.xr.isPresenting);
  ghost.visible = ghost.visible && playing && range === "runthrough";
  renderer.render(scene, camera);
}
function updateWrist() {
  const mesh = wrist,
    mat = mesh.material as T.MeshBasicMaterial;
  const canvas = mat.map!.image as HTMLCanvasElement,
    ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#152b45";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = "#66c7ff";
  ctx.font = "bold 65px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${weapon.ammo}/${WEAPONS[weapon.index].capacity}   ${points} PTS   ${elapsed.toFixed(1)}s`,
    512,
    100,
  );
  ctx.font = "45px sans-serif";
  ctx.fillText(
    range === "warehouse"
      ? `HP ${Math.ceil(health)} · WAVE ${wave}`
      : weapon.state.toUpperCase(),
    512,
    195,
  );
  mat.map!.needsUpdate = true;
}
function switchWeapon(i: number) {
  if (!playing || paused) return;
  weapon.equip(i);
  reloadUntil = 0;
  makeGun();
  tone(300, 0.05, 0.025);
}
document.addEventListener("keydown", (e) => {
  if (
    [
      "F1",
      "F2",
      "Space",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "Escape" && playing && !paused) pause();
  if (e.code === "KeyR") reload();
  if (["Digit1", "Digit2", "Digit3"].includes(e.code))
    switchWeapon(Number(e.code.at(-1)) - 1);
  if (e.code === "Enter" && playing && !paused && range === "standard")
    finish();
  if (e.code === "F1") {
    debug = !debug;
    $("#debug").classList.toggle("hidden", !debug);
  }
  if (e.code === "F2") {
    freeFly = !freeFly;
    toast(freeFly ? "FREE CAMERA ON" : "FREE CAMERA OFF");
  }
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  fireHeld = false;
  if (playing && !paused) pause();
});
document.addEventListener("mousemove", (e) => {
  if (playing && !paused && (document.pointerLockElement || e.buttons === 2)) {
    camera.rotation.y -= e.movementX * 0.002;
    camera.rotation.x = T.MathUtils.clamp(
      camera.rotation.x - e.movementY * 0.002,
      -1.5,
      1.5,
    );
  }
});
renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (playing && !paused && !document.pointerLockElement) captureMouse();
  fireHeld = true;
  fire();
});
document.addEventListener("mouseup", () => (fireHeld = false));
document.addEventListener("pointerlockchange", () => {
  if (
    !document.pointerLockElement &&
    hadPointerLock &&
    playing &&
    !paused &&
    !finished &&
    !renderer.xr.isPresenting
  )
    pause();
  hadPointerLock = !!document.pointerLockElement;
});
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
renderer.domElement.addEventListener("wheel", (e) => {
  switchWeapon((weapon.index + (e.deltaY > 0 ? 1 : 2)) % 3);
});
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.setting) {
    save.settings[el.dataset.setting as keyof typeof save.settings] =
      el.checked;
    persist(save);
    attachGun();
  }
  if (el.id === "target-select") {
    targetType = el.value;
    standardTargets();
  }
  if (el.id === "drill-select") {
    drill = el.value;
    reactionReady = false;
    void start("standard");
  }
  if (el.id === "course-select") {
    courseName = el.value;
    void start("runthrough");
  }
  if (el.id === "mode-select") {
    warehouseMode = el.value;
    sandboxAttacks = false;
    void start("warehouse");
  }
});
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest("button")!;
  if (!el) return;
  if (el.dataset.range) {
    selected = el.dataset.range as RangeId;
    if (el.dataset.course) courseName = el.dataset.course;
    $("#play").innerHTML =
      courseName === "qualification" && selected === "runthrough"
        ? "RUN QUALIFICATION HOUSE <span>↗</span>"
        : selected === "runthrough"
          ? "RUN THE POP-UP COURSE <span>↗</span>"
          : "ENTER THE RANGE <span>↗</span>";
    document
      .querySelectorAll(".card")
      .forEach((c) => c.classList.toggle("selected", c === el));
    return;
  }
  if (el.dataset.distance) {
    distance = Number(el.dataset.distance);
    standardTargets();
    document
      .querySelectorAll("[data-distance]")
      .forEach((c) =>
        c.classList.toggle(
          "active",
          Number((c as HTMLElement).dataset.distance) === distance,
        ),
      );
    return;
  }
  switch (el.id) {
    case "play":
      void start(selected);
      break;
    case "how":
      howTo();
      break;
    case "scores-nav":
      records();
      break;
    case "settings-nav":
      settings();
      break;
    case "close-modal":
      if (playing && paused && !finished) resume();
      else closeModal();
      break;
    case "bring":
      for (const t of targets)
        if (t.station < 0 && Math.abs(t.group.position.x) < 1)
          t.group.position.z = -1;
      toast("TARGET RETURNED · INSPECT YOUR GROUP");
      break;
    case "reset-targets":
      standardTargets();
      break;
    case "finish-string":
      finish();
      break;
    case "retry":
    case "restart":
      reactionReady = false;
      void start(range);
      break;
    case "hub":
      void hub();
      break;
    case "resume":
      resume();
      break;
    case "spawn-dummy":
      spawnDummy();
      break;
    case "attacks":
      sandboxAttacks = !sandboxAttacks;
      el.textContent = `ATTACKS: ${sandboxAttacks ? "ON" : "OFF"}`;
      break;
  }
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.xr.addEventListener("sessionstart", () => {
  document.exitPointerLock();
  attachGun();
  $("#shell").classList.add("hidden");
  $("#hud").classList.add("hidden");
  if (!playing) {
    rig.position.set(0, 0, 3);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    openVrMenu();
  } else {
    paused = false;
    camera.rotation.set(0, 0, 0);
  }
});
renderer.xr.addEventListener("sessionend", () => {
  attachGun();
  vrMenu.visible = false;
  menuLaser.visible = false;
  if (playing) {
    $("#hud").classList.remove("hidden");
    pause();
  } else void hub();
});
async function init() {
  try {
    await world.init(renderer);
    await coursePreview();
    gun.visible = false;
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).get("emulate") === "quest3"
    ) {
      const { XRDevice, metaQuest3 } = await import("iwer");
      const device = new XRDevice(metaQuest3);
      device.installRuntime({ forceInstall: true });
      const { DevUI } = await import("@iwer/devui");
      new DevUI(device);
    }
    const vr = VRButton.createButton(renderer, {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });
    vr.classList.add("lobby-vr");
    if (
      await navigator.xr?.isSessionSupported("immersive-vr").catch(() => false)
    )
      document.body.append(vr);
    $("#loading").classList.add("hidden");
    renderer.setAnimationLoop(frame);
    // Read-only status used by smoke tests and remote headset debugging.
    (window as any).rangeDay = {
      get state() {
        return {
          cameraPosition: camera.getWorldPosition(new T.Vector3()).toArray(),
          cameraDirection: camera.getWorldDirection(new T.Vector3()).toArray(),
          lookYaw: camera.rotation.y + rig.rotation.y,
          range,
          courseName,
          elapsed,
          finished,
          playing,
          paused,
          shots,
          hits,
          points,
          health,
          wave,
          targets: targets.length,
          stationsActivated: activated.size,
          visiblePopups: targets.filter(
            (t) => t.station >= 0 && t.group.visible,
          ).length,
          popupHeights: targets
            .filter((t) => t.station >= 0 && t.group.visible)
            .map((t) => t.group.position.y),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          modelLoaded: world.root.children.length > 0,
          ammo: weapon.ammo,
          reloadState: weapon.state,
        };
      },
    };
  } catch (e) {
    $("#loading").innerHTML =
      `<h2>Range unavailable</h2><p>${String(e)}</p><p>Please use a browser with WebGL 2 enabled.</p>`;
    console.error(e);
  }
}
void init();
