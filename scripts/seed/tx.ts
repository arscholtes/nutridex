import type { db } from "../../lib/db/client.ts";

/** The transaction every seed step writes through. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
