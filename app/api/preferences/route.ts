// The one way any app reads or changes the choices that follow someone between devices.
import { savedSkin, saveSkin } from "../../../lib/db/preferences.ts";
import { parseSkin } from "../../../lib/skins.ts";
import { refusal } from "../../../lib/upload-token.ts";

const json = (status: number, body: unknown) => Response.json(body, { status });

/** The chosen skin, or null when none has been chosen, so a device keeps what it has. */
export async function GET(request: Request): Promise<Response> {
  return refusal(request) ?? json(200, { skin: await savedSkin() });
}

/** Remembers a skin for every device. */
export async function PUT(request: Request): Promise<Response> {
  const refused = refusal(request);
  if (refused) return refused;
  const body = (await request.json().catch(() => null)) as { skin?: unknown } | null;
  const skin = parseSkin(body?.skin);
  if (!skin) return json(400, { error: "that is not a skin NutriDex has" });
  await saveSkin(skin);
  return json(200, { skin });
}
