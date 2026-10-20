# Range Day XR

A playable, browser-based WebXR range built with TypeScript, Vite, three.js, Rapier and three-pathfinding. Runs as a static site on GitHub Pages, with desktop mouse/keyboard and immersive VR controller input.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

For a Quest on the same network: `HTTPS=1 npm run dev`, open the printed LAN URL, accept the local development certificate, and select Enter VR. Production GitHub Pages provides trusted HTTPS. Enter VR only appears when immersive VR is supported. Use Chrome or Edge on desktop. Local XR emulation: `npm run dev`, then open `/?emulate=quest3` (IWER and its DevUI are development-only and removed from the production bundle).

## Playable features

- Standard range: 10 lanes, paper bullseyes, zone targets and falling steel, distances 5–50m, bring-back inspection, up to 48 persistent bullet marks, free fire, 5-shot group, 6-shot string and randomized reaction drills. Exact smallest enclosing circle for group diameter.
- Run-through: three JSON-driven five-station courses, timed blue/white pop-ups, moving targets and steel-activated swingers in Cover Drill, hit zones, no-shoot and miss penalties, hit factor, saved Basic Lane ghost, and a flashlight for Night Run. Walk across the finish gate to end a run.
- Warehouse: navmesh pursuit around racks, walkers, rushers, shooters with visible foam projectiles, frontal shield blocking, 12-enemy cap, 10Hz path updates, health regeneration, endless waves/resupply, fixed building clear and sandbox modes.
- Shared pistol, automatic carbine, shotgun pellet spread, recoil, haptics, reload state machine with magazine reserves, synth audio, local records/medals and settings.
- WebXR: controller models, handedness, two-handed aiming, support-stick locomotion or teleport, 30-degree snap or smooth turning, wrist stats, menu pointing, manual magazine grip/slide interaction or simple reload.
- Desktop pause, mouse look, sprint, crouch, debug stats and free camera. All ranges and weapons are available immediately in early access; medals record progression without restricting testing.
- GLB scene cache, static geometry batching, Rapier world occlusion/collision, warehouse navmesh, Blender export pipeline, CI build and Pages deployment.

## Controls

| Action | Desktop | Quest |
|---|---|---|
| Aim / fire | Mouse / left click | Gun controller / trigger |
| Move | WASD | Support thumbstick |
| Turn | Mouse | Gun thumbstick |
| Sprint / crouch | Shift / C | Physical crouch |
| Reload | R | Gun A/X |
| Weapons | 1–3 or wheel | Gun B/Y |
| Pause / menu | Esc | Support B/Y |
| Finish free-fire string | Enter | Wrist menu → Finish string |
| Debug / free camera | F1 / F2 | Desktop only |

With simple reload disabled: press R to eject, R to insert, R to charge. In VR eject with A/X, hold support grip at belt height, move the magazine to the weapon, then release/regrip at the slide and pull back. A/X also steps the manual sequence as an accessibility fallback.

Click the scene if the browser releases pointer lock. Esc releases the mouse and pauses. On supported headsets the initial VR menu lets you choose and start a range. Desktop drill and course selectors are available before capturing the mouse or after releasing it.

## Assets and architecture

`src/main.ts` owns the renderer, shared input, range scene lifecycle, weapons, targets, AI and UI. `src/game.ts` contains testable reload/scoring/save rules. `src/world.ts` imports GLBs and owns physics, batching and navigation. Course files live in `public/courses/`. Original design is in `docs/game-design.md`.

`npm run assets` exports `assets/*.blend` with Blender when source scenes exist, otherwise regenerates the included GLB blockouts from `tools/generate-scenes.mjs`. See `assets/README.md` for naming conventions and current marker support.

## Verification

`npm test` covers firing cadence, reload transitions, exhausted reserves, scoring penalties, accuracy and enclosing-circle group size. With `npm run dev` running, `npm run test:browser` tests GLB loads, firing/score, reload, records, range changes, a course station trigger, a warehouse wave and the draw-call budget in headless Chromium. Set `TEST_URL` to test a preview or deployed URL. Install a Playwright Chromium build if needed (`npx playwright install chromium`).

## Current limits versus the complete design

This is an early-access implementation, not the final six-milestone art/performance release. Environments and weapons are geometric blockouts, not authored Blender scenes with baked lighting, rigged dummy animations or compressed texture art. Audio is synthesized rather than positional asset recordings. The warehouse uses a single level of racks/dock cover; office, stairs and catwalk remain for the environment pass. Steel uses visual fall/reset rather than rigid-body plate simulation. Rail retrieval snaps to inspection distance. Attachments, the guided tutorial, 3D hub-door transitions, physical in-world range-control panels, rigged hit/down animations remain. VR includes a world-space range control menu and result summary; its layout still needs headset usability testing. Settings/records are local to the browser. No multiplayer, passthrough or online leaderboard.

Real Quest testing is required for hand alignment, comfort, room-scale boundary behavior and sustained 72Hz performance. Software-browser draw-call checks are not headset certification. Controller models load from the three.js controller asset service; font files load from Google Fonts with local fallbacks.

## GitHub Pages

`.github/workflows/pages.yml` builds/tests on pushes to `main`, then uploads/deploys `dist`. In repository Settings → Pages use **GitHub Actions**. Vite uses a relative base so both project URLs and custom domains work. Repository visibility must permit Pages on your account plan.
