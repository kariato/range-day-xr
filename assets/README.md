# Blender source scenes

Place hub.blend, standard.blend, runthrough.blend warehouse.blend and qualification.blend here, then run `npm run assets`. The repository ships compact generated GLB blockouts so it works without Blender. `tools/generate-scenes.mjs` is the editable source of those blockouts; it is not a substitute for the planned Blender art pass.

Use metres and +Y-up glTF export. The loader reads COL_ meshes as hidden Rapier box colliders, NAV_ meshes as hidden pathfinding geometry, and SPAWN_dummy_* empties as spawn points. Preserve collider and navmesh geometry in exports. Export custom properties as extras. Runtime static meshes merge by material, so keep materials shared. The current game positions dynamic target objects from course JSON; TGT_/TRIG_ extras are reserved for the authored-scene migration.

`blender -b assets/standard.blend -P tools/export.py -- public/models/standard.glb`

DRACO and KTX2 decoding is configured in the loader. Included blockouts are uncompressed and have no external textures. Future compressed assets require the decoder CDN or locally hosted decoder files.
