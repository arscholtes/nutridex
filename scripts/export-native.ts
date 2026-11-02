// export-native: writes what the Dex shows into the native apps: dex.json and the creature art.
// Run after any change to the seed, the data functions, the art or the disclaimer.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { sql } from "../lib/db/client.ts";
import { buildSnapshot, CREATURE_CATALOG, creatureAssets, creatureSilhouette, SNAPSHOT_PATH } from "../lib/native/snapshot.ts";

const snapshot = await buildSnapshot();
writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 1)}\n`);

// Rebuilt whole, so art for a removed entry cannot linger.
rmSync(CREATURE_CATALOG, { recursive: true, force: true });
mkdirSync(CREATURE_CATALOG, { recursive: true });
writeFileSync(`${CREATURE_CATALOG}/Contents.json`, `${JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)}\n`);
const assets = creatureAssets(snapshot);
function writeImageset(name: string, svg: string, renderingIntent: "original" | "template"): void {
  mkdirSync(`${CREATURE_CATALOG}/${name}.imageset`);
  writeFileSync(`${CREATURE_CATALOG}/${name}.imageset/${name}.svg`, svg);
  writeFileSync(
    `${CREATURE_CATALOG}/${name}.imageset/Contents.json`,
    `${JSON.stringify({ images: [{ filename: `${name}.svg`, idiom: "universal" }], info: { author: "xcode", version: 1 }, properties: { "preserves-vector-representation": true, "template-rendering-intent": renderingIntent } }, null, 2)}\n`,
  );
}
for (const { name, svg } of assets) {
  writeImageset(name, svg, "original");
  writeImageset(`${name}-silhouette`, creatureSilhouette(svg), "template");
}
console.log(`wrote ${SNAPSHOT_PATH} with ${snapshot.cards.length} entries, and ${assets.length} creatures`);
await sql.end();
