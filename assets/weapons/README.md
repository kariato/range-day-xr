# Blender weapon sources

These original exterior game models were authored with Blender 4.5.13 LTS and saved as editable `.blend` files before modifier application and export batching. They are not renamed procedural runtime boxes or imported third-party assets.

- `glock-19-gen5.blend`: compact polymer-frame pistol, shaped slide, slide serrations, stippled grip, trigger guard, ejection-port detail, sights and detachable magazine.
- `mp15-sport-iii.blend`: AR-pattern civilian sporting rifle, shaped receiver, free-float handguard, top rail, recessed slot details, adjustable stock, curved magazine and added range sights. The reference rifle ships optic-ready without sights; this is a range-equipped interpretation.
- `mossberg-590r.blend`: pump shotgun with heat shield, tube, compact ribbed pump, adjustable stock, pistol grip, top rail and sights.

The exterior silhouettes are recognizable artist interpretations using approximate visible proportions, not manufacturer CAD or manufacturing models. No internal working mechanisms are included.

## Editing/exporting

Open a `.blend`, edit it normally, save, then run:

```sh
BLENDER_BIN=/path/to/blender npm run assets:weapons
```

This exports the saved sources without overwriting them. The exporter evaluates modifiers and merges meshes by movable part and material into `public/models/weapons/*.glb`. Blender is not required for normal `npm run build` or playing the game.

`npm run assets:weapons:generate` explicitly regenerates the original source scenes from `tools/model_weapons.py` and overwrites these three `.blend` files; use ordinary export to preserve manual edits.

Game coordinates: metres, +Y up, muzzle -Z, grip near origin. Preserve named empty groups `Weapon`, `Body`, `Slide`, `Magazine`, `Pump`, `Bolt`, and markers `Muzzle`, `Grip`, `Foregrip` where applicable. Runtime animates these groups. Weapon settings are in `src/weapons/configs.json`.

## Verified reference properties

| Reference | Magazine/tube | Chamber | Game fully loaded | Action |
|---|---:|---:|---:|---|
| Glock 19 Gen5 | 15 | 1 | 16 | Semi-auto |
| S&W M&P15 Sport III | 30 | 1 | 31 | Semi-auto |
| Mossberg 590R SKU 50762 | 6 | 1 | 7 | Pump |

Manufacturer sources:

- [Glock G19 Gen5 specifications](https://us.glock.com/en/products/law-enforcement/pistols/g19-gen5): standard 15-round magazine, 9×19 mm, 185 mm overall length.
- [Smith & Wesson M&P15 Sport III specifications](https://www.smith-wesson.com/product/mp-15-sport-iii): manufacturer product data lists 30-round capacity, 5.56 NATO and a 16-inch barrel.
- [Mossberg 590R specifications](https://resources.mossberg.com/journal/590r-590rm-shotguns-rotary-safety-selector): SKU 50762 lists 6+1, 12 gauge, 18.5-inch barrel and adjustable stock.

Capacities/calibers are sourced facts. Recoil, spread, cadence limits, reload times, eight-pellet shotgun pattern and haptics are game balancing values, not measured real-world ballistics. Empty-mag reloads feed a chamber round from the inserted magazine; tactical reloads retain the chambered round. Switching weapons preserves each weapon's ammunition and reload state. Pump cycling blocks firing until complete, and tube reloads insert one shell at a time.
