/** Asset limits are conservative project targets, not a headset frame-rate certification. */
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url);
const limits = JSON.parse(
  await readFile(new URL("src/rendering/budgets.json", root), "utf8"),
);
const reports = [];
for (const id of ["standard", "runthrough", "qualification", "warehouse"]) {
  const bytes = await readFile(new URL(`public/models/${id}.glb`, root));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  const jsonLength = bytes.readUInt32LE(12),
    gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const bin = bytes.subarray(20 + jsonLength + 8),
    materials = new Set(),
    textureIndices = new Set();
  let triangles = 0;
  function visit(index) {
    const node = gltf.nodes[index];
    if (/^(COL_|NAV_)/.test(node.name || "")) return;
    if (node.mesh !== undefined)
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        assert(
          [undefined, 4].includes(primitive.mode),
          `${id}: unsupported topology`,
        );
        triangles +=
          gltf.accessors[primitive.indices ?? primitive.attributes.POSITION]
            .count / 3;
        if (primitive.material !== undefined) materials.add(primitive.material);
      }
    for (const child of node.children || []) visit(child);
  }
  for (const node of gltf.scenes[gltf.scene || 0].nodes) visit(node);
  function collectTextures(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (/texture$/i.test(key) && v?.index !== undefined)
        textureIndices.add(v.index);
      else if (typeof v === "object") collectTextures(v);
    }
  }
  for (const index of materials) {
    const m = gltf.materials[index];
    assert.notEqual(
      m.alphaMode,
      "BLEND",
      `${id}: environment alpha blending/overdraw`,
    );
    assert(!m.doubleSided, `${id}: double-sided environment material`);
    collectTextures(m);
  }
  const images = new Set(
    [...textureIndices].map((i) => gltf.textures[i].source),
  );
  let textureBytes = 0,
    maxDimension = 0;
  for (const index of images) {
    const image = gltf.images[index];
    assert(image.bufferView !== undefined, `${id}: external image`);
    const view = gltf.bufferViews[image.bufferView],
      data = bin.subarray(
        view.byteOffset || 0,
        (view.byteOffset || 0) + view.byteLength,
      );
    assert.equal(
      image.mimeType,
      "image/png",
      `${id}: add a size reader for this texture format`,
    );
    assert.equal(data.readUInt32BE(12), 0x49484452, `${id}: invalid PNG`);
    const width = data.readUInt32BE(16),
      height = data.readUInt32BE(20);
    maxDimension = Math.max(maxDimension, width, height);
    // Conservative decoded RGBA8 plus the complete mip chain, even for RGB images.
    textureBytes += Math.ceil((width * height * 4 * 4) / 3);
  }
  const report = {
    scene: id,
    triangles: Math.round(triangles),
    materials: materials.size,
    textures: images.size,
    maxTextureDimension: maxDimension,
    textureMemoryMiB: +(textureBytes / 1048576).toFixed(2),
    fileMiB: +(bytes.length / 1048576).toFixed(2),
  };
  assert(
    triangles <= limits.maxEnvironmentTriangles,
    `${id}: triangle budget ${triangles}`,
  );
  assert(
    materials.size <= limits.maxEnvironmentMaterials,
    `${id}: material budget`,
  );
  assert(
    maxDimension <= limits.maxTextureDimension,
    `${id}: oversized texture ${maxDimension}`,
  );
  assert(
    textureBytes <= limits.maxTextureMemoryMiB * 1048576,
    `${id}: texture-memory budget`,
  );
  assert(
    bytes.length <= limits.maxEnvironmentFileMiB * 1048576,
    `${id}: file budget`,
  );
  assert(
    !gltf.extensions?.KHR_lights_punctual,
    `${id}: exported real-time lights`,
  );
  reports.push(report);
}
console.table(reports);
if (process.argv.includes("--write"))
  await writeFile(
    new URL("docs/environment-budgets.json", root),
    JSON.stringify(
      { limits, environments: reports, hardwareFrameRateVerified: false },
      null,
      2,
    ) + "\n",
  );
console.log(
  "PASS: Quest 2 project asset limits, opaque single-sided materials, packed textures, and no exported real-time lights.",
);
