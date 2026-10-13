"use server";

import { cookies } from "next/headers";
import { ACCEPTANCE_COOKIE, appVersion } from "../lib/disclaimer/gate.ts";

// Browsers cap a cookie's lifetime at 400 days; after that the notice appears once more.
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Records on this device that the running version's disclaimer was accepted. */
export async function acceptDisclaimer() {
  (await cookies()).set(ACCEPTANCE_COOKIE, appVersion(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
