import { caller, json, sent } from "../../../../../lib/api/v1.ts";
import { saveSkin } from "../../../../../lib/db/preferences.ts";
import { parseSkin } from "../../../../../lib/skins.ts";

/** Remembers the signed-in person's skin for every device. */
export async function PUT(request: Request): Promise<Response> {
  const who = await caller(request);
  if (who instanceof Response) return who;
  const skin = parseSkin((await sent(request)).skin);
  if (!skin) return json(400, { error: "that is not a skin NutriDex has" });
  await saveSkin(skin, who.owner);
  return json(200, { skin });
}
