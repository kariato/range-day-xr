# Blender environment sources

`standard.blend` is the original indoor-range environment authored in Blender 4.5.13 LTS. It includes ten 1.8 metre lanes, acoustic booths, oak equipment shelves, target rails and hangers, overhead baffles, concrete, rubber backstop, ventilation ducts, LED fixtures, floor distance markings, observation glazing and a rear access door. Its procedural albedo/normal tiles are packed into the source. Ambient occlusion is baked into active vertex colours from scene geometry; this is contact shading, not a full indirect-light bake.

Open the source in Blender, edit and save, then export:

```sh
BLENDER_BIN=/path/to/blender npm run assets
```

The exporter preserves active vertex colours and packed textures and omits the source's preview lights/camera. These lights help inspect the source in Blender; runtime uses shared game lighting and emissive fixture materials. Normal game builds use the included GLB and need no Blender installation.

`tools/model_indoor_range.py` is the original reproducible authoring script. Running it explicitly overwrites the indoor source and export. Normal export preserves manual source edits. `tools/generate-scenes.mjs` keeps authored scenes and only rebuilds remaining blockouts. The hub, outdoor course, warehouse and qualification house are still blockouts; their art passes are not part of this indoor release.

Use metres and +Y-up glTF export. The loader reads `COL_` meshes as hidden Rapier box colliders, `NAV_` meshes as hidden pathfinding geometry, and `SPAWN_dummy_*` empties as spawn points. Preserve collider/navmesh geometry and custom properties in exports. Runtime static meshes merge by material; keep materials shared and include the same vertex attributes on meshes sharing a material. Dynamic targets remain game-owned; their hanger/trolley geometry follows target retrieval.

The environment is an approximate artist interpretation for a game, not manufacturer or engineering data. Twelve shared materials and tiled 256 px original PBR textures keep the shipped GLB around 5.9 MB. Baked ambient occlusion costs no real-time shadow maps. Quest hardware performance and comfort still need device testing.
