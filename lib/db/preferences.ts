// Choices that follow someone between their devices. Reading and writing them happens only here.
import { parseSkin, type Skin } from "../skins.ts";
import { sql } from "./client.ts";

type Sql = typeof sql;

const SKIN_KEY = "skin";

/** @return [Promise<Skin | null>] the chosen skin, or null when none has been chosen or it no longer exists */
export async function savedSkin(q: Sql = sql): Promise<Skin | null> {
  const [row] = await q<{ value: string }[]>`select value from preference where key = ${SKIN_KEY}`;
  return row ? parseSkin(row.value) : null;
}

/** @param skin [Skin] the skin to remember for every device */
export async function saveSkin(skin: Skin, q: Sql = sql): Promise<void> {
  await q`
    insert into preference (key, value) values (${SKIN_KEY}, ${skin})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
