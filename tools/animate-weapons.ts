/** Embed named FireCycle clips in the Blender GLBs, preserving editable sources. */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createCycleClip } from "../src/weapons/firing";
import { WEAPONS } from "../src/game";
(globalThis as any).FileReader = class {
  result: unknown;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((data) => {
      this.result = `data:${blob.type};base64,${Buffer.from(data).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const root = new URL("../", import.meta.url),
  loader = new GLTFLoader(),
  exporter = new GLTFExporter();
for (const [index, w] of WEAPONS.entries()) {
  const path = fileURLToPath(
    new URL(`public/models/weapons/${w.id}.glb`, root),
  );
  const bytes = await readFile(path);
  const gltf = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const result = await exporter.parseAsync(gltf.scene, {
    binary: true,
    animations: [createCycleClip(index)],
  });
  await writeFile(path, Buffer.from(result as ArrayBuffer));
  console.log(`Embedded FireCycle: ${w.id}`);
}
