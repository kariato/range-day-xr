Range Day XR — Game Design
Oct 20, 2026 · @Mark Davey
Overview
Range Day XR is a browser-based WebXR shooting simulator, built with Vite and three.js, that runs in the Meta Quest Browser with no install. It offers three ranges of rising intensity: a static marksmanship lane, a timed run-through course with pop-up targets, and a warehouse where training dummies hunt the player.
Platform. Meta Quest 2, 3 and 3S in the Quest Browser (primary); desktop Chrome/Edge with mouse and keyboard (development and fallback). Hosted as a static site, e.g. GitHub Pages.
Design pillars
• Feels physical. Two-handed grip, real reloads, recoil you can feel through haptics.
• Instant to play. Open a URL, tap Enter VR, shoot within 10 seconds.
• Readable feedback. Every shot shows where it hit and what it scored.
• Clean training aesthetic. Paper targets, steel plates, foam dummies; no gore, no human likenesses.
Session length. 2–10 minutes per run, suited to repeat attempts and leaderboard chasing.
Tech stack
Vite builds a plain TypeScript + three.js app; WebXR comes from three.js's built-in WebXRManager, so no game engine is needed.
Layer
Choice
Notes
Build
Vite + TypeScript
Fast HMR; vite build emits static files; base set for GitHub Pages
Rendering
three.js
renderer.xr.enabled = true; VRButton / XRControllerModelFactory / XRHandModelFactory
Physics
Rapier (@dimforge/rapier3d-compat)
Player capsule, dummy colliders, falling steel plates, raycasts
Hit detection
Raycast per shot
Hitscan from muzzle; Rapier ray for world, three.js ray for target zones
AI pathing
three-pathfinding navmesh
Baked from the warehouse floor mesh
Audio
Web Audio via three.js PositionalAudio
Gunshots, steel ping, dummy footsteps
Assets
Blender → glTF/GLB, Draco + KTX2 compressed
Each range is a Blender scene exported as a loadable GLB; props, targets and dummies are separate GLBs (see Blender pipeline)
State
Small ECS-style systems or a simple scene manager
One scene per range, shared player rig
Local HTTPS
@vitejs/plugin-basic-ssl
WebXR needs a secure context; test on Quest over LAN with vite --host
Hosting
GitHub Pages via Actions
Static deploy on push to main
Debugging on headset: Quest Browser remote inspection through chrome://inspect over USB, plus an in-world FPS / draw-call overlay toggled by a controller button.
Blender scene pipeline
Every range is authored in Blender as a complete scene and loaded at runtime as GLB files; the code places nothing by hand except dynamic objects it spawns.
What Blender owns
• Range scenes: hub.blend, standard.blend, runthrough.blend, warehouse.blend. Each exports one GLB with geometry, baked lighting, colliders and gameplay markers.
• Loadable objects: weapons, magazines, each target type, each dummy type (rigged, with walk/run/attack/hit/down actions), crates and props. One GLB each, loaded on demand and cloned for reuse.
Naming conventions read by the loader
Object name prefix
Loader action
COL_
Becomes a Rapier collider (box/convex from the mesh), hidden at runtime
NAV_
Navmesh source for the warehouse dummies, hidden
SPAWN_player
Player start position and facing
SPAWN_dummy_*
Dummy spawn points (warehouse waves)
TGT_<type>_<id>
Empty where a target GLB is instanced, e.g. TGT_popup_s3_02
TRIG_<id>
Trigger volume (pop-up stations, door to next range)
LIGHT_rt
The one allowed real-time light
Custom properties on empties (Blender Object Properties → Custom Properties) export as glTF extras, so a pop-up target can carry { "delay": 0.5, "upTime": 3, "noShoot": false } and the course JSON shrinks to overrides.
Export and optimisation
1. Model and bake lighting to a lightmap UV in Blender (Cycles bake).
2. Export with the built-in glTF 2.0 exporter: selected collections only, +Y up, apply modifiers, include custom properties and animations.
3. Run gltf-transform optimize (Draco geometry, KTX2 textures, dedupe, instance) via an npm script.
4. Output lands in public/models/; Vite serves it in dev and copies it on build.
A headless export script (blender -b file.blend -P tools/export.py) lets npm run assets rebuild every GLB in one step, so the .blend files are the source of truth and the GLBs are build output.
Runtime loading. GLTFLoader with DRACOLoader and KTX2Loader; a loading screen per range shows progress. Shared GLBs (weapons, targets) are cached so returning to a range is instant.
Browser testing without a headset
The whole game runs and is testable in a desktop browser, both as a flat mouse-and-keyboard game and as an emulated XR session, so most development needs no Quest.
Two desktop modes
• Flat mode (no XR): first-person camera with pointer lock; mouse aims, WASD moves, left click fires, R reloads (full table in Quest controls). Weapon is held at a fixed offset in front of the camera. Good for level design, AI and scoring work.
• Emulated XR mode: Meta's Immersive Web Emulation Runtime (iwer with @iwer/devui) is loaded only in dev builds. It fakes a Quest 3 headset and two Touch controllers, so the real Enter VR path, controller poses, buttons, thumbsticks and two-hand grip all run in Chrome. The Immersive Web Emulator browser extension is an alternative.
How the mode is chosen
• navigator.xr.isSessionSupported('immersive-vr') true → show Enter VR.
• Dev build or ?emulate=quest3 in the URL → inject IWER, then show Enter VR.
• No XR → show "Play in browser" and start flat mode.
All gameplay code reads one input abstraction (aimRay, fire, reload, move, turn), fed by either the XR controllers or the mouse and keyboard, so both paths exercise the same weapon, target and AI systems.
Testing tools
• Debug overlay (F1 / controller button): FPS, draw calls, collider wireframes, navmesh, trigger volumes, dummy AI state labels.
• Free-fly camera (F2) to inspect Blender scenes in place.
• Playwright smoke tests in headless Chromium: load each range, confirm GLBs load, script a few shots and check the score changes.
• Final checks still happen on a real Quest for comfort, scale and performance.
Quest controls
Controls read the WebXR Gamepad API (xr-standard mapping) on Touch controllers, with the gun hand set by the player (right by default).
Action
Gun hand
Support hand
Desktop fallback
Fire
Trigger (button 0)
—
Left mouse
Grab / hold weapon
Grip (button 1)
Grip on foregrip for two-hand hold
Auto-equipped
Eject magazine
A / X (button 4)
—
R (starts reload)
Insert magazine
—
Grip at belt pouch, push mag into well
R
Rack slide / charge
—
Grip slide, pull back and release
— (part of R)
Switch fire mode / weapon
B / Y (button 5)
—
1–3 / mouse wheel
Move (smooth locomotion)
—
Thumbstick
WASD
Sprint
—
Thumbstick click
Shift
Turn
Thumbstick L/R (snap 30° or smooth)
—
Mouse look
Crouch
Physical crouch, or thumbstick down + hold
—
C
Teleport (comfort mode)
—
Thumbstick forward, release to land
—
Pause menu
Menu button
—
Esc
Aiming. The weapon is posed from the gun controller's gripSpace; with a two-hand hold, the barrel points from gun hand toward support hand for stable long shots. Iron sights and a red-dot option are real geometry the player lines up with their eye, so no aim cursor in VR.
Haptics. gamepad.hapticActuators[0].pulse() on fire (strength by weapon), a lighter tick on magazine seat and slide release, and a long pulse when a dummy lands a hit.
Hand tracking. Optional stretch goal: pinch to fire is unreliable for shooting, so hands are used only for menus.
Physical-run note (Range 2). Players can walk in room-scale or use thumbstick locomotion; the course is designed so both finish in comparable times.
Weapons and handling
Three generic, unbranded training weapons cover the ranges; each is data-driven from a JSON config so new ones need no code.
Weapon
Fire modes
Magazine
Fire rate
Recoil feel
Best range
Training pistol
Semi
15
300 rpm cap
Sharp muzzle flip, fast recovery
Ranges 1–3
Carbine
Semi / auto
30
700 rpm
Steady push, mild climb
Ranges 2–3
Pump shotgun
Pump
6 (tube, load one at a time)
Pump-limited
Heavy kick
Range 3
Handling model
• Hitscan bullets with per-weapon spread; carbine spread grows during auto fire and recovers over ~0.3 s.
• Recoil is a visual offset applied to the weapon model that springs back, plus haptics; the controller pose itself is never moved.
• Reload states: loaded → empty → mag out → mag in → charged. Skipping the rack on an empty gun leaves it unable to fire.
• Ammo pouches on the player's belt (positioned relative to head height) hold spare mags; Range 1 has unlimited mags, Ranges 2–3 have a fixed count.
• Impact effects: paper holes as decals on targets, sparks and a ping on steel, foam puffs on dummies.
• Accessibility: "simple reload" setting turns the full sequence into one button press.
Range 1: Standard range
An indoor 10-lane range where the player stands at a bench and shoots stationary targets at chosen distances; it is the tutorial and the precision mode.
Layout. Concrete booth with a bench, a weapon rack, and a target carrier on an overhead rail. Lane is 50 m deep, lit by overhead fixtures with a dark backstop.
Target types
• Bullseye paper (scored 10 to 1 by ring).
• Silhouette-style paper with A/C/D zones (abstract shape, no face).
• Steel plates and a plate rack: plates fall with a ping and reset on a button.
• Spinners and a dueling tree for fun.
Interactions
• A wall control panel sets distance (5, 10, 15, 25, 50 m) and sends the carrier out on the rail.
• "Bring back" reels the paper in so the player can inspect real bullet holes up close.
• Drills from a menu: free fire, 5 shots/5 rings group, Bill-drill style timed strings, and a reaction drill where a light turns green.
• A shot timer on the bench beeps to start and shows split times.
Scoring. Per string: total points, group size (cm, smallest circle covering all hits), and time. Results go to a local high-score board.
Tutorial flow. 1) Pick up pistol, 2) fire at 5 m, 3) reload with the full sequence, 4) try a two-hand hold at 15 m, 5) unlock the other ranges.
Range 2: Run-through course
An outdoor pop-up course where the player moves along a marked lane and targets spring up from cover; the goal is the fastest clean run.
Layout. About 80 m of dirt lane with plywood walls, barrels, windows and a low wall to shoot over. Five shooting stations marked on the ground, each with 3–6 targets. Start and finish gates with a big timer board.
Target behavior
• Pop-ups rise when the player crosses a trigger volume, stay up 2–4 s, then drop.
• Shoot / no-shoot. Blue "threat" targets score; white "no-shoot" targets cost a penalty.
• Movers slide along a track behind cover.
• Swingers appear only when a steel activator plate is hit.
• Each target needs 1 hit to the A-zone or 2 hits elsewhere to count as neutralised.
Course scripting. Each course is a JSON file listing stations, trigger volumes and target timings, so new courses can be made without code. Ship three: Basic Lane, Cover Drill, and Night Run (dark, flashlight on weapon).
Scoring. Raw time + 5 s per missed target + 10 s per no-shoot hit. Hit factor (points ÷ time) is shown alongside for players who know practical shooting.
Ghost run. The best run replays as a translucent ghost so the player can race their past self.
Range 3: Warehouse
A free-roam training warehouse where foam test dummies hunt the player in waves; the player moves, takes cover and survives as long as possible.
Layout. About 40 × 30 m: pallet racks forming aisles, shipping containers, a raised catwalk with two stairs, an office with windows, and a loading dock. Overhead lights can flicker or cut out in later waves. All cover is navmesh-aware so dummies path around it.
Dummy types (orange foam mannequins with a painted target on the chest; no faces, no blood)
Type
Speed
Hits to stop
Attack
Appears from
Walker
1.2 m/s
3 body / 1 head
Melee shove at 1 m
Wave 1
Rusher
4 m/s sprint
2 body / 1 head
Charge and tackle
Wave 2
Shooter
1.5 m/s
4 body / 1 head
Fires slow, visible foam balls
Wave 3
Shield
1 m/s
Shield blocks front; flank or shoot legs
Melee
Wave 5
Dummy AI runs as a simple state machine: idle → patrol → alerted (heard a shot or saw the player) → chase → attack → stunned on hit → down. Shooters add a "seek cover, peek, fire" loop. Pathing uses the baked navmesh; line of sight is a raycast to the player's head.
Player damage. 100 health. Hits flash the view edges red-to-orange and pulse the controller. Health regenerates after 5 s without damage. Out of health ends the run (dummy "tags" you; no death animation).
Waves. Wave n spawns 3 + 2n dummies from dock doors and stairwells. Ammo crates appear between waves; a 15 s break with a countdown.
Modes
• Survival: endless waves, score = dummies stopped × accuracy multiplier.
• Clear the building: fixed dummy placements, fastest clear time.
• Sandbox: spawn any dummy from a wrist menu, toggle their attacks off.
Scoring, progression and UI
Each range keeps its own local leaderboard, and medals (bronze/silver/gold) on each drill or course unlock weapons, attachments and harder variants.
Hub. A small lobby with three doors labelled by range, a weapon locker, and a scoreboard wall. Walking through a door loads that range's GLB.
In-world UI (no flat HUD)
• Wrist panel on the support hand: ammo count, health (Range 3), timer, wave number.
• Point-and-trigger laser for menus; the laser appears only when a menu is open.
• End-of-run board: time, accuracy %, hits by zone, penalties, medal earned, "retry" and "back to hub".
Unlocks
• Carbine: silver on any Range 1 drill.
• Shotgun and Range 3: finish any Range 2 course.
• Red-dot sight, flashlight, extended mag: gold medals.
Saving. Scores, settings and unlocks in localStorage (wrapped in try/catch). An optional online leaderboard is a later stretch.
Comfort, performance and build plan
Comfort options. Snap or smooth turn, teleport or smooth move, optional vignette while moving, seated mode (raises the player height), and dominant-hand swap. Range 3 defaults to vignette on.
Performance budget (Quest 2 floor, 72 Hz)
• Under 100 draw calls and ~150k triangles per range; instanced pallets, racks and targets.
• Baked lighting in Blender; one real-time light max (the weapon flashlight).
• KTX2 textures, 1K max on props; fixed foveation via renderer.xr.setFoveation(1).
• Max 12 active dummies; AI ticks at 10 Hz, animation at full rate.
• Object pools for decals, shells and impact effects.
Project structure
src/
  main.ts            renderer, XR session, scene manager
  player/            rig, locomotion, controllers, haptics
  weapons/           weapon base, configs/*.json, reload state machine
  ranges/
    hub/  standard/  runthrough/  warehouse/
  targets/           paper, steel, popup, mover
  ai/                dummy states, navmesh, spawner
  ui/                wrist panel, menus, scoreboards
  audio/  physics/  util/
public/models/  public/audio/  public/courses/*.json
Milestones
1. Core rig: Vite + three.js + VRButton, input abstraction with flat mode and IWER emulation, Blender export script, controllers, pistol firing at a cube, haptics.
2. Range 1: booth, carrier rail, paper and steel targets, reload sequence, scoring.
3. Range 2: pop-up system, JSON courses, timer and penalties, ghost run.
4. Range 3: warehouse, navmesh, walker and rusher, player health, waves.
5. Polish: shooter and shield dummies, hub, unlocks, audio pass, comfort settings.
6. Ship: performance pass on Quest 2, GitHub Pages deploy, desktop fallback check.
Open questions
• Name: "Range Day XR" is a placeholder.
• Should Range 2 support a mixed-reality passthrough mode on Quest 3?
• Is a multiplayer co-op warehouse worth planning for now (WebRTC), or later?