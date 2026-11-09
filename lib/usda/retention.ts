// USDA's Table of Nutrient Retention Factors, Release 6 (2007), read whole, and which of its food
// families a Dex food cooks like. Pure: no network, no database.

/** One row of the table: one food-and-cooking code by one nutrient. */
export type RetentionRow = {
  retentionCode: number;
  foodGroupCode: number;
  /** USDA's description as published, typos and all. */
  description: string;
  /** The food family before the cooking words, with USDA's typos put right (`VEG,ROOTS,ETC`). */
  family: string;
  /** The engine methods the code describes; empty for a state such as canned or frozen. */
  prepMethods: string[];
  /** True when cooking liquid or drippings stay in the dish, false when discarded, null when the code does not say. */
  liquidKept: boolean | null;
  nutrientNumber: number;
  nutrientName: string;
  /** The share retained: USDA's percentage over 100. Null where the published cell holds no number. */
  factor: number | null;
};

/** The cooking methods the coverage report counts. */
export const COOKING_METHODS = ["boiled", "baked", "fried", "roasted", "broiled", "simmered", "sauteed", "steamed", "stewed", "braised"] as const;

/** Every food family the table has, once its spellings are put right. */
export const RETENTION_FAMILIES = [
  "VEG,GREENS", "VEG,ROOTS,ETC", "VEG,OTHER", "POTATOES", "SWEETPOTATOES", "TOMATOES",
  "LEGUMES,CKD 15/20MIN", "LEGUMES,CKD 45/75MIN", "LEGUMES,CKD 2/2.5HRS", "LEGUMES",
  "BEEF", "BEEF,GROUND", "BEEF,ROAST", "BEEF,SLICES", "LIVER", "ORGAN MEATS(NOTLIVER)",
  "PORK,FRESH", "PORK,FRESH,CHOPS", "PORK,FRESH,GROUND", "PORK,FRESH,ROAST",
  "PORK,CURED", "PORK,CURED,GROUND", "PORK,CURED,SLICES", "HAM/PICNIC,CURED", "BACON",
  "SAUSAGE,RAW,PORK,OTHER", "SAUSAGE,RTE,FRANKS,ETC", "SAUSAGE",
  "LAMB", "LAMB,GROUND", "VEAL", "VEAL,ROAST", "VEAL,SLICES", "CHICKEN", "TURKEY",
  "FINFISH,<5%FAT", "FINFISH,>5%FAT", "FINFISH(FROZEN)", "FINFISH",
  "SHELLFISH,W/SHELL", "SHELLFISH,WO/SHELL", "SEAFOOD,FROG,TURTLE",
  "CHEESE", "EGGS", "MILK", "NUTS",
  "FRUITS,CITRUS", "FRUITS,FRESH(NOT CITRUS)", "FRUITS(DRIED)", "FRUITS",
  "CEREAL,INST", "CEREAL,REG/QUICK", "OATMEAL,INST", "OATMEAL,REG/QUICK",
  "FLOUR/MEAL", "PASTA", "RICE,WHITE/BROWN", "ALC BEV",
];

/** USDA's typos and abbreviations in a description, put right before anything is read from it. */
const SPELLINGS: [RegExp, string][] = [
  [/SWEETPOTAOTES/, "SWEETPOTATOES"],
  [/^VEAL\.SLICES/, "VEAL,SLICES"],
  [/, /g, ","],
  [/\bFRSH\b/, "FRESH"],
  [/\bSLICE\b/, "SLICES"],
  [/^ORGAN MEATS\(NOTLIVER\),? ?/, "ORGAN MEATS(NOTLIVER),"],
  // "BROILED CUT" is a whole cut of beef; "BROILED GROUND" is ground beef, which has its own family.
  [/^BEEF,BROILED CUT$/, "BEEF,BROILED"],
  [/^BEEF,BROILED GROUND$/, "BEEF,GROUND,BROILED"],
];

/** The cooking words after the family, in the table's spellings, and the engine method each means. */
const METHOD_WORDS: [RegExp, string][] = [
  [/HARD COOKED/, "boiled"],
  [/\bMASHED\b/, "boiled"],
  [/FRENCH FRY|HASH BROWN|STIR FRY/, "fried"],
  [/\bBOIL(ED|D)?\b|\bBLD\b/, "boiled"],
  [/\bBAKED\b|\bBKD\b/, "baked"],
  [/\bFRIED\b|\bFRYD\b|\bFRY\b|\bSCRAMBLED\b/, "fried"],
  [/\bROAST(ED)?\b/, "roasted"],
  [/\bBROILED\b|\bBRLD\b|\bGRILLED\b/, "broiled"],
  [/\bSIM(MERED|MRD|MER|MR|M|R)\b/, "simmered"],
  [/\bSAUTEED\b/, "sauteed"],
  [/\bSTEAMED\b/, "steamed"],
  [/\bSTEWED\b/, "stewed"],
  [/\bBRAIS(ED)?\b|\bBRSD\b/, "braised"],
  [/\b(RE)?HEATED\b/, "reheated"],
  [/\bTOASTED\b/, "toasted"],
  [/\bPOACHED\b/, "poached"],
];

/** Families whose bare "COOKED" means cooked in water. */
const COOKED_IN_WATER = new Set(["CEREAL,INST", "CEREAL,REG/QUICK", "OATMEAL,INST", "OATMEAL,REG/QUICK", "RICE,WHITE/BROWN"]);
const COOKED = /\bCOOKED\b|\bCKD\b/;
const FROM_FROZEN = /(COOKED|CKD) FROM (FROZEN|FRZN)/;

/** Whether the cooking liquid stays; the first match wins, so "NOT DRAINED" is read before "DRAINED". */
const LIQUID_WORDS: [RegExp, boolean][] = [
  [/W\/DRIP/, true],
  [/WATER USED/, true],
  [/NOT DRAINED/, true],
  [/COOKED W\/LIQUID/, true],
  [/WO\/DRIP/, false],
  [/\bDRAIN(ED)?\b|\bDRAIND\b|\bDRND\b/, false],
];

/**
 * Read the whole table.
 * @param csv [string] the published CSV: Retn_Code, FdGrp_CD, RetnDesc, Nutr_No, NutrDesc, Retn_Factor, Date
 * @return [RetentionRow[]] one row per line, in file order
 * @throws when a description fits none of the known families
 */
export function parseRetentionTable(csv: string): RetentionRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.slice(1).map((line) => {
    const [retentionCode, foodGroupCode, description, nutrientNumber, nutrientName, factor] = csvFields(line);
    const normalised = SPELLINGS.reduce((d, [pattern, fix]) => d.replace(pattern, fix), description);
    const family = familyOf(normalised, description);
    const rest = normalised.slice(family.length + 1);
    const liquidKept = LIQUID_WORDS.find(([pattern]) => pattern.test(rest))?.[1] ?? null;
    return {
      retentionCode: Number(retentionCode),
      foodGroupCode: Number(foodGroupCode),
      description,
      family,
      prepMethods: methodsOf(rest, family, liquidKept),
      liquidKept,
      nutrientNumber: Number(nutrientNumber),
      nutrientName,
      factor: /^\d+$/.test(factor) ? Number(factor) / 100 : null,
    };
  });
}

function familyOf(normalised: string, description: string): string {
  const family = RETENTION_FAMILIES.filter((f) => normalised === f || normalised.startsWith(`${f},`)).sort((a, b) => b.length - a.length)[0];
  if (!family) throw new Error(`"${description}" fits no retention family`);
  return family;
}

function methodsOf(rest: string, family: string, liquidKept: boolean | null): string[] {
  const found = METHOD_WORDS.flatMap(([pattern, method]) => {
    const at = rest.search(pattern);
    return at === -1 ? [] : [{ at, method }];
  });
  const cookedAt = rest.search(COOKED);
  if (cookedAt !== -1 && (COOKED_IN_WATER.has(family) || (FROM_FROZEN.test(rest) && liquidKept === false))) found.push({ at: cookedAt, method: "boiled" });
  return [...new Set(found.sort((a, b) => a.at - b.at).map((m) => m.method))];
}

/** @return [string[]] the line's fields, with quoted fields unwrapped */
function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      fields.push(field);
      field = "";
    } else field += ch;
  }
  fields.push(field);
  return fields;
}

type Hints = { fatPer100g: number | null };
type Family = string | null;
type Resolve = (description: string, hints: Hints) => Family;
/** An ordered rule: the first pattern that matches the lower-cased description decides. */
type Rule = [RegExp, Family | Resolve];
const ANY = /(?:)/;

/** @return [(description: string) => string] the base family with the first matching cut's suffix appended */
const withCut = (base: string, cuts: [RegExp, string][]) => (d: string): string => base + (cuts.find(([pattern]) => pattern.test(d))?.[1] ?? "");

/** Offal has its own families whatever the animal. */
const ORGANS: Rule[] = [
  [/\bliver\b/, "LIVER"],
  [/\b(kidneys?|hearts?|tongue|brains?|sweetbreads?|tripe|giblets|gizzards?)\b/, "ORGAN MEATS(NOTLIVER)"],
];
const organOr = (resolve: Family | Resolve): Resolve => (d, h) => firstMatch(ORGANS, d, h) ?? (typeof resolve === "function" ? resolve(d, h) : resolve);

const GROUND = /\bground\b/;
const SLICES = /\bsteaks?\b|\bslices?\b|\bsliced\b/;
const SAUSAGE_WORDS = /sausage|frankfurter|\bfranks?\b|bologna|salami|pepperoni|bratwurst|kielbasa|chorizo|wurst|luncheon|\bloaf\b|pastrami|mortadella|\bpate\b|headcheese|scrapple|wieners?|hot dogs?|vienna|braunschweiger|thuringer|cervelat/;
const SAUSAGE_RAW = /\braw\b|\bfresh\b|uncooked|unprepared/;
const SAUSAGE_READY = /cooked|smoked|cured|frankfurter|\bfranks?\b|bologna|salami|pepperoni|luncheon|\bloaf\b|pastrami|mortadella|wieners?|hot dogs?|vienna|braunschweiger|liverwurst|knackwurst|kielbasa|thuringer|cervelat|ready/;

const freshPork = withCut("PORK,FRESH", [[/\bchops?\b/, ",CHOPS"], [GROUND, ",GROUND"], [/\broast\b/, ",ROAST"]]);
const curedPork = withCut("PORK,CURED", [[GROUND, ",GROUND"], [new RegExp(`${SLICES.source}|\\bchops?\\b`), ",SLICES"]]);
const pork = (d: string): string => {
  if (!/\bcured\b|\bbacon\b/.test(d)) return freshPork(d);
  if (/\bbacon\b/.test(d)) return "BACON";
  if (/\bham\b|\bpicnic\b/.test(d)) return "HAM/PICNIC,CURED";
  return curedPork(d);
};

const instant = (d: string) => (/instant/.test(d) ? "INST" : "REG/QUICK");

/** Which family a Dex food cooks like, by its category word; a category absent here never gets one. */
const FAMILY_RULES: Record<string, Rule[]> = {
  vegetable: [
    [/sweet ?potato|\byams?\b/, "SWEETPOTATOES"],
    [/potato/, "POTATOES"],
    [/tomato/, "TOMATOES"],
    [/spinach|\bkale\b|chard|collards?|mustard greens|turnip greens|beet greens|lettuce|cabbage|bok choy|pak-?choi|watercress|arugula|endive|escarole|dandelion greens|amaranth leaves|broccoli raab|rapini/, "VEG,GREENS"],
    [/carrot|\bbeets?\b|turnip|parsnip|rutabaga|radish|celeriac|onion|garlic|shallot|\bleeks?\b|salsify|jicama|yambean|burdock|ginger root|horseradish|\btaro\b|cassava|water ?chestnut/, "VEG,ROOTS,ETC"],
    [ANY, "VEG,OTHER"],
  ],
  fruit: [
    [/orange|lemon|\blimes?\b|grapefruit|tangerine|mandarin|clementine|pomelo|pummelo|kumquat/, "FRUITS,CITRUS"],
    [/dried|dehydrated|raisins?|prunes?/, "FRUITS(DRIED)"],
    [ANY, "FRUITS,FRESH(NOT CITRUS)"],
  ],
  legume: [
    // Already cooked, fermented or pressed: no cooking code describes them.
    [/tofu|tempeh|soy ?milk|soy (sauce|protein|flour|meal)|\bmiso\b|natto|hummus|falafel|meatless/, null],
    [/peanut/, "NUTS"],
    [/lentil|split peas?|peas?, split/, "LEGUMES,CKD 15/20MIN"],
    [/soybean|chickpea|garbanzo/, "LEGUMES,CKD 2/2.5HRS"],
    [ANY, "LEGUMES,CKD 45/75MIN"],
  ],
  meat: [
    [SAUSAGE_WORDS, (d) => (SAUSAGE_RAW.test(d) ? "SAUSAGE,RAW,PORK,OTHER" : SAUSAGE_READY.test(d) ? "SAUSAGE,RTE,FRANKS,ETC" : "SAUSAGE")],
    [/^beef/, organOr(withCut("BEEF", [[GROUND, ",GROUND"], [/\broast\b|\bchuck\b|\bbrisket\b/, ",ROAST"], [SLICES, ",SLICES"]]))],
    [/^pork/, organOr(pork)],
    [/^bacon\b/, "BACON"],
    [/^ham\b/, "HAM/PICNIC,CURED"],
    [/^lamb/, organOr(withCut("LAMB", [[GROUND, ",GROUND"]]))],
    [/^veal/, organOr(withCut("VEAL", [[/\broast\b/, ",ROAST"], [new RegExp(`${SLICES.source}|\\bcutlets?\\b`), ",SLICES"]]))],
    [/^chicken/, organOr("CHICKEN")],
    [/^turkey/, organOr("TURKEY")],
    // The table has no game code; lamb is the closest red meat it does cover.
    [/^game meat/, organOr("LAMB")],
    // Other birds cook like chicken, the one bird besides turkey the table covers.
    [/^(duck|goose|pheasant|quail|squab|guinea hen|dove|cornish game hens|poultry)/, organOr("CHICKEN")],
    [ANY, null],
  ],
  fish: [
    [/shrimp|prawn|\bcrabs?\b|lobster|crayfish|crawfish|\bclams?\b|oyster|mussel|scallop|squid|octopus|abalone|snail|conch|cuttlefish|whelk|mollusks|crustaceans/, "SHELLFISH,WO/SHELL"],
    [/\bfrogs?\b|turtle/, "SEAFOOD,FROG,TURTLE"],
    [ANY, (_, h) => (h.fatPer100g === null ? "FINFISH" : h.fatPer100g >= 5 ? "FINFISH,>5%FAT" : "FINFISH,<5%FAT")],
  ],
  dairy: [
    [/cheese/, "CHEESE"],
    [/\beggs?\b/, "EGGS"],
    [/\bbutter\b|ghee/, null],
    [/milk|cream|yogurt|kefir/, "MILK"],
    [ANY, null],
  ],
  egg: [[ANY, "EGGS"]],
  cereal: [
    [/\boats?\b|oatmeal/, (d) => `OATMEAL,${instant(d)}`],
    [ANY, (d) => `CEREAL,${instant(d)}`],
  ],
  grain: [
    [/flour|meal\b|\bbran\b|\bgerm\b|crumbs|semolina|starch/, "FLOUR/MEAL"],
    [/pasta|noodle|macaroni|spaghetti|couscous|vermicelli|lasagn|fettuc|linguin/, "PASTA"],
    [/\brice\b/, "RICE,WHITE/BROWN"],
    [/\boats?\b/, "OATMEAL,REG/QUICK"],
    // Whole grains boil in water as rice does; the table has no code of their own.
    [/barley|quinoa|bulgur|millet|wheat berries|wheat, (hard|soft|durum)|buckwheat|amaranth|\bteff\b|sorghum|spelt|kamut|khorasan|\brye\b|triticale|hominy|farro|freekeh|corn grain/, "RICE,WHITE/BROWN"],
    [ANY, null],
  ],
  nut: [[ANY, "NUTS"]],
  drink: [
    [/non-?alcoholic/, null],
    [/alcoholic|\bbeer\b|\bwine\b|liquor|whiskey|whisky|\brum\b|vodka|\bgin\b|brandy|liqueur|tequila|\bsake\b|\bmead\b|champagne|vermouth/, "ALC BEV"],
    [ANY, null],
  ],
};

function firstMatch(rules: Rule[], description: string, hints: Hints): Family {
  const rule = rules.find(([pattern]) => pattern.test(description));
  if (!rule) return null;
  const [, family] = rule;
  return typeof family === "function" ? family(description, hints) : family;
}

/**
 * Which retention family a Dex food cooks like.
 * @param category [string] the Dex's category word (vegetable, fruit, legume, meat, fish, dairy, cereal, grain, nut, drink, …)
 * @param usdaDescription [string] USDA's description of the food
 * @param hints [Hints] fat per 100 g, which splits finfish into the table's two fat classes
 * @return [string | null] the family, or null when no cooking code describes the food
 */
export function retentionFamilyOf(category: string, usdaDescription: string, hints: Hints): string | null {
  const rules = FAMILY_RULES[category];
  if (!rules) return null;
  return firstMatch(rules, usdaDescription.toLowerCase(), hints);
}
