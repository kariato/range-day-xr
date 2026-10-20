These reduced PBR texture maps are derived from ambientCG assets under **CC0 1.0 Universal**. Copying, modification and redistribution in this game are permitted. The environment models and other procedural tiles are original project work.

- [Concrete034](https://ambientcg.com/a/Concrete034): albedo, OpenGL normal and roughness. The asset page identifies it as an approximated/photo material.
- [Gravel023](https://ambientcg.com/a/Gravel023): albedo, OpenGL normal and roughness; the asset credits photoscanned pebbles by rubberduck (BlendSwap / CC0).
- [ambientCG licensing](https://docs.ambientcg.com/license/)
- [CC0 1.0 legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

Maps are reduced to at most 512 px for albedo and 256 px for normal/roughness. No displacement tessellation is used. `sources.json` records source archive hashes and `tools/prepare_environment_textures.py` reproduces the reduction in Blender. Original download archives are not required at runtime. Optimized PNGs are packed into editable Blender sources and GLB exports; no live texture CDN is required.
