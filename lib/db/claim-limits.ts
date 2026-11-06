// Which foods the law lets bear a claim at all. A drink over 1.2% alcohol by volume may bear no health claim, and no
// nutrition claim but about its alcohol or energy (EU Regulation 1924/2006, Article 4(3) and (4)), so it clears no
// "source" bar anywhere in the Dex. USDA gives grams per 100 g; 1.2% by volume is 0.95 g of alcohol per 100 mL.
import type { sql } from "./client.ts";

type Sql = typeof sql;

const ALCOHOL_LIMIT_G_PER_100G = 0.95;

/** What a food's page says where its effects would be. */
export const NO_CLAIMS_ON_ALCOHOL = "EU law allows no claims on a drink over 1.2% alcohol, so none is shown.";

/**
 * @param q [Sql] the connection or transaction of the query this joins
 * @return [PendingQuery] a condition, true where the ingredient aliased `i` may bear claims
 */
export function mayBearClaims(q: Sql) {
  return q`not (i.category = 'drink' and exists (
    select 1 from ingredient_compound a join compound ac on ac.id = a.compound_id
    where a.ingredient_id = i.id and ac.slug = 'alcohol' and a.amount_per_100g >= ${ALCOHOL_LIMIT_G_PER_100G}))`;
}
