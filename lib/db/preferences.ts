// Choices that follow someone between their devices. Reading and writing them happens only here.
import { parseSkin, type Skin } from "../skins.ts";
import { sql } from "./client.ts";

type Sql = typeof sql;

const SKIN_KEY = "skin";

/**
 * @param owner [string | null] the signed-in person, or null for the choice the apps share
 * @return [Promise<Skin | null>] the chosen skin, or null when none has been chosen or it no longer exists
 */
export async function savedSkin(owner: string | null = null, q: Sql = sql): Promise<Skin | null> {
  const [row] = await q<{ value: string }[]>`select value from preference where key = ${SKIN_KEY} and owner_id is not distinct from ${owner}`;
  return row ? parseSkin(row.value) : null;
}

/**
 * @param skin [Skin] the skin to remember for every device
 * @param owner [string | null] whose choice, or null for the one the apps share
 */
export async function saveSkin(skin: Skin, owner: string | null = null, q: Sql = sql): Promise<void> {
  await q`
    insert into preference (key, value, owner_id) values (${SKIN_KEY}, ${skin}, ${owner})
    on conflict on constraint preference_owner_key do update set value = excluded.value, updated_at = now()`;
}
