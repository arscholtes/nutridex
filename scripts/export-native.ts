// export-native: writes what the Dex shows into the native apps: dex.sqlite and the creature art.
// Run after any change to the seed, the data functions, the art or the disclaimer.
//
// By default it reads TEST_DATABASE_URL, the 15 hand-pinned foods, and writes the copy that is committed,
// so a fresh clone builds and the tests can check it. With --full it reads DATABASE_URL, every food, for
// running on your own devices. That copy is far too large for git: put the small one back with a plain run.
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";

const full = process.argv.includes("--full");
if (!full) {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set in .env.local: run npm run db:test first, or pass --full");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
const { sql } = await import("../lib/db/client.ts");
const { CREATURE_CATALOG, creatureAssets, creatureSilhouette, SNAPSHOT_PATH, writeSnapshotFile } = await import("../lib/native/snapshot.ts");

const started = Date.now();
const cards = await writeSnapshotFile(SNAPSHOT_PATH, sql, (done, total) => {
  if (done % 500 === 0 || done === total) console.error(`  ${done} of ${total} foods`);
});

// Rebuilt whole, so art for a removed entry cannot linger.
rmSync(CREATURE_CATALOG, { recursive: true, force: true });
mkdirSync(CREATURE_CATALOG, { recursive: true });
writeFileSync(`${CREATURE_CATALOG}/Contents.json`, `${JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2)}\n`);
const assets = creatureAssets(cards);
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
const megabytes = (statSync(SNAPSHOT_PATH).size / 1048576).toFixed(1);
console.log(`wrote ${SNAPSHOT_PATH} (${megabytes} MB) with ${cards.length} entries${full ? ", every food" : ", the test database's"}, and ${assets.length} creatures, in ${Math.round((Date.now() - started) / 1000)}s`);
await sql.end();
