// The looks someone can choose, and everything that makes each one what it is. Pure, so the server, the
// web and the tests agree on what exists. The native apps read this same table from their snapshot.

type Weight = "regular" | "medium" | "semibold" | "bold" | "heavy" | "black";

const WEIGHTS: Record<Weight, number> = { regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800, black: 900 };

export type SkinDefinition = {
  id: string;
  name: string;
  about: string;
  /** A page of its own, or the original handheld's lens, bezel and D-pad. */
  shell: "page" | "handheld";
  dark: boolean;
  colors: {
    screen: string;
    card: string;
    line: string;
    ink: string;
    inkSoft: string;
    /** Links, selection, and the fill of a bar. */
    accent: string;
    /** A main button. */
    night: string;
    onNight: string;
    /** The largest tile, and the veil behind an unlock. */
    tile: string;
    onTile: string;
    chip: string;
    onChip: string;
    /** What a blacked-out creature stands on. */
    hidden: string;
    notice: string;
    danger: string;
  };
  font: {
    /** How the native apps set it: the system's own faces, so every size follows Dynamic Type. */
    design: "default" | "rounded" | "serif" | "monospaced";
    heading: Weight;
    strong: Weight;
    /** How the web sets it. */
    web: string;
    webHeading?: string;
  };
  radius: { card: number; tile: number; panel: number; control: number | "pill" };
  /** What runs round cards, tiles and controls. */
  outline: { width: number; color: "ink" | "line" | "accent"; dashed: boolean };
  shadow: "none" | "soft" | "hard";
  backdrop: "flat" | "pearl" | "dots" | "depths" | "scanlines";
  /** What stands behind the creature at the top of an entry. */
  stage: "foil" | "flat" | "plate" | "type" | "glow" | "tint";
  card: "wash" | "flat" | "sheet" | "type" | "glow";
  /** How a creature is set off from what it stands on. Never by changing its colours. */
  creature: "plain" | "sticker" | "glow";
  meter: "pill" | "thin" | "solid" | "segments";
  /** Controls floating over what scrolls beneath them are frosted, or solid. */
  glass: boolean;
  title: "none" | "thick" | "hair" | "dashed" | "banner";
  /** Headings end in a full stop. */
  period: boolean;
  /** An entry opens with its name above its creature, or below. */
  hero: "art-first" | "title-first";
  nav: "round" | "text";
  /** The small mark beside the name. */
  mark: "holo" | "accent" | "none";
};

const SYSTEM = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
const FREDOKA = "var(--font-fredoka), ui-rounded, system-ui, sans-serif";

export const SKINS = [
  {
    id: "new-age",
    name: "New age",
    about: "Clean white pages, big quiet type, and one blue for anything you can press.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#FFFFFF",
      card: "#F5F5F7",
      line: "#D2D2D7",
      ink: "#1D1D1F",
      inkSoft: "#6E6E73",
      accent: "#0066CC",
      night: "#0071E3",
      onNight: "#FFFFFF",
      tile: "#000000",
      onTile: "#F5F5F7",
      chip: "#1D1D1F",
      onChip: "#FFFFFF",
      hidden: "#D2D2D7",
      notice: "#F5F5F7",
      danger: "#BF4800",
    },
    font: { design: "default", heading: "semibold", strong: "semibold", web: SYSTEM },
    radius: { card: 28, tile: 28, panel: 18, control: "pill" },
    outline: { width: 0, color: "line", dashed: false },
    shadow: "none",
    backdrop: "flat",
    stage: "flat",
    card: "flat",
    creature: "plain",
    meter: "thin",
    glass: true,
    title: "none",
    period: true,
    hero: "title-first",
    nav: "text",
    mark: "none",
  },
  {
    id: "iridescent",
    name: "Iridescent",
    about: "Pearl and holographic foil, made for touch.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#F6F5FC",
      card: "#FFFFFF",
      line: "#E4E1F3",
      ink: "#1F1B3D",
      inkSoft: "#5B5780",
      accent: "#5B45E0",
      night: "#211B4E",
      onNight: "#FFFFFF",
      tile: "#211B4E",
      onTile: "#FFFFFF",
      chip: "#211B4E",
      onChip: "#FFFFFF",
      hidden: "#6A55F0",
      notice: "#EFE9FF",
      danger: "#9F1239",
    },
    font: { design: "rounded", heading: "heavy", strong: "bold", web: FREDOKA },
    radius: { card: 22, tile: 26, panel: 20, control: "pill" },
    outline: { width: 0, color: "line", dashed: false },
    shadow: "soft",
    backdrop: "pearl",
    stage: "foil",
    card: "wash",
    creature: "plain",
    meter: "pill",
    glass: true,
    title: "none",
    period: false,
    hero: "art-first",
    nav: "round",
    mark: "holo",
  },
  {
    id: "yellow-version",
    name: "Yellow version",
    about: "The original handheld, with its lens and D-pad.",
    shell: "handheld",
    dark: false,
    colors: {
      screen: "#EEF3E6",
      card: "#FBFDF7",
      line: "#CFD8C9",
      ink: "#1C2823",
      inkSoft: "#4D5B54",
      accent: "#D3222A",
      night: "#D3222A",
      onNight: "#FFFFFF",
      tile: "#D3222A",
      onTile: "#FFFFFF",
      chip: "#1C2823",
      onChip: "#EEF3E6",
      hidden: "#1F86C9",
      notice: "#FFD23F",
      danger: "#9F1239",
    },
    font: { design: "rounded", heading: "heavy", strong: "bold", web: FREDOKA },
    radius: { card: 16, tile: 16, panel: 14, control: 9 },
    outline: { width: 2, color: "ink", dashed: false },
    shadow: "hard",
    backdrop: "flat",
    stage: "type",
    card: "type",
    creature: "plain",
    meter: "segments",
    glass: false,
    title: "banner",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "none",
  },
  {
    id: "nutrition-label",
    name: "Nutrition label",
    about: "Black rules and heavy type, like the panel on the back of the packet.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#FFFFFF",
      card: "#FFFFFF",
      line: "#000000",
      ink: "#000000",
      inkSoft: "#333333",
      accent: "#000000",
      night: "#000000",
      onNight: "#FFFFFF",
      tile: "#000000",
      onTile: "#FFFFFF",
      chip: "#000000",
      onChip: "#FFFFFF",
      hidden: "#BDBDBD",
      notice: "#FFFFFF",
      danger: "#B00000",
    },
    font: { design: "default", heading: "black", strong: "bold", web: 'var(--font-archivo), "Helvetica Neue", Helvetica, Arial, sans-serif' },
    radius: { card: 0, tile: 0, panel: 0, control: 0 },
    outline: { width: 2, color: "ink", dashed: false },
    shadow: "none",
    backdrop: "flat",
    stage: "flat",
    card: "sheet",
    creature: "plain",
    meter: "solid",
    glass: false,
    title: "thick",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "none",
  },
  {
    id: "field-guide",
    name: "Field guide",
    about: "A naturalist's plates, in ink on paper.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#F1EDE0",
      card: "#FAF7EE",
      line: "#C9C2AB",
      ink: "#1E2A1E",
      inkSoft: "#56604E",
      accent: "#3F6B3A",
      night: "#1E3A26",
      onNight: "#F6F2E6",
      tile: "#1E3A26",
      onTile: "#F6F2E6",
      chip: "#1E3A26",
      onChip: "#F6F2E6",
      hidden: "#B9B39B",
      notice: "#E4DFC9",
      danger: "#8A1C1C",
    },
    font: { design: "serif", heading: "semibold", strong: "semibold", web: "var(--font-newsreader), Georgia, serif" },
    radius: { card: 4, tile: 6, panel: 4, control: 4 },
    outline: { width: 1, color: "line", dashed: false },
    shadow: "none",
    backdrop: "flat",
    stage: "plate",
    card: "sheet",
    creature: "plain",
    meter: "thin",
    glass: false,
    title: "hair",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "none",
  },
  {
    id: "seed-packet",
    name: "Seed packet",
    about: "Loud flat colour and slab type, printed a little off register.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#FFF1CC",
      card: "#FFF9E8",
      line: "#E3C88A",
      ink: "#2A1A0E",
      inkSoft: "#5B4632",
      accent: "#C8321F",
      night: "#C8321F",
      onNight: "#FFF9E8",
      tile: "#2F6B3A",
      onTile: "#FFF9E8",
      chip: "#2A1A0E",
      onChip: "#FFF1CC",
      hidden: "#E3A72F",
      notice: "#F5C242",
      danger: "#8E1B0E",
    },
    font: { design: "serif", heading: "black", strong: "bold", web: 'var(--font-zilla), Rockwell, "Courier New", serif' },
    radius: { card: 6, tile: 6, panel: 6, control: 6 },
    outline: { width: 3, color: "ink", dashed: false },
    shadow: "hard",
    backdrop: "dots",
    stage: "type",
    card: "type",
    creature: "plain",
    meter: "solid",
    glass: false,
    title: "banner",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "accent",
  },
  {
    id: "sticker-book",
    name: "Sticker book",
    about: "Every creature a die-cut sticker on a dotted page.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#E8F5FF",
      card: "#FFFFFF",
      line: "#BFDDF5",
      ink: "#2B2350",
      inkSoft: "#5A5380",
      accent: "#D81B72",
      night: "#D81B72",
      onNight: "#FFFFFF",
      tile: "#6A3FD6",
      onTile: "#FFFFFF",
      chip: "#2B2350",
      onChip: "#FFFFFF",
      hidden: "#FFD84D",
      notice: "#FFE68A",
      danger: "#B3124F",
    },
    font: { design: "rounded", heading: "heavy", strong: "bold", web: FREDOKA },
    radius: { card: 24, tile: 28, panel: 22, control: "pill" },
    outline: { width: 0, color: "line", dashed: false },
    shadow: "soft",
    backdrop: "dots",
    stage: "tint",
    card: "wash",
    creature: "sticker",
    meter: "pill",
    glass: false,
    title: "none",
    period: false,
    hero: "art-first",
    nav: "round",
    mark: "accent",
  },
  {
    id: "deep-sea",
    name: "Deep sea",
    about: "Dark water, with your creatures glowing in it.",
    shell: "page",
    dark: true,
    colors: {
      screen: "#05131F",
      card: "#0C2233",
      line: "#1D3B50",
      ink: "#E8F6FF",
      inkSoft: "#9CBDD0",
      accent: "#4FE3D0",
      night: "#4FE3D0",
      onNight: "#04202A",
      tile: "#0E3A52",
      onTile: "#E8F6FF",
      chip: "#4FE3D0",
      onChip: "#04202A",
      hidden: "#7FA6BD",
      notice: "#0F3347",
      danger: "#FF9BAE",
    },
    font: { design: "default", heading: "bold", strong: "semibold", web: "var(--font-sora), system-ui, sans-serif" },
    radius: { card: 20, tile: 24, panel: 18, control: "pill" },
    outline: { width: 0, color: "line", dashed: false },
    shadow: "none",
    backdrop: "depths",
    stage: "glow",
    card: "glow",
    creature: "glow",
    meter: "pill",
    glass: true,
    title: "none",
    period: false,
    hero: "art-first",
    nav: "round",
    mark: "accent",
  },
  {
    id: "receipt",
    name: "Receipt",
    about: "Till paper, typed in one width, with every line dashed.",
    shell: "page",
    dark: false,
    colors: {
      screen: "#DAD7D0",
      card: "#FCFBF6",
      line: "#8A877F",
      ink: "#1A1A18",
      inkSoft: "#55534D",
      accent: "#1A1A18",
      night: "#1A1A18",
      onNight: "#FCFBF6",
      tile: "#1A1A18",
      onTile: "#FCFBF6",
      chip: "#1A1A18",
      onChip: "#FCFBF6",
      hidden: "#B5B2A9",
      notice: "#FCFBF6",
      danger: "#A01010",
    },
    font: { design: "monospaced", heading: "bold", strong: "bold", web: 'var(--font-plex-mono), ui-monospace, "SF Mono", Menlo, monospace' },
    radius: { card: 0, tile: 0, panel: 0, control: 0 },
    outline: { width: 1, color: "ink", dashed: true },
    shadow: "none",
    backdrop: "flat",
    stage: "plate",
    card: "sheet",
    creature: "plain",
    meter: "segments",
    glass: false,
    title: "dashed",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "none",
  },
  {
    id: "arcade",
    name: "Arcade",
    about: "Neon in the dark, with scanlines and a pixel font.",
    shell: "page",
    dark: true,
    colors: {
      screen: "#120428",
      card: "#1E0B42",
      line: "#4A2A8A",
      ink: "#F4ECFF",
      inkSoft: "#C0A8E8",
      accent: "#39F0FF",
      night: "#FF2E88",
      onNight: "#12021F",
      tile: "#2B0F66",
      onTile: "#39F0FF",
      chip: "#39F0FF",
      onChip: "#120428",
      hidden: "#8E7ACB",
      notice: "#2B0F66",
      danger: "#FF8FA8",
    },
    font: { design: "monospaced", heading: "heavy", strong: "bold", web: 'var(--font-plex-mono), ui-monospace, "SF Mono", Menlo, monospace', webHeading: "var(--font-vt323), ui-monospace, monospace" },
    radius: { card: 4, tile: 4, panel: 4, control: 4 },
    outline: { width: 2, color: "accent", dashed: false },
    shadow: "none",
    backdrop: "scanlines",
    stage: "glow",
    card: "glow",
    creature: "glow",
    meter: "segments",
    glass: false,
    title: "banner",
    period: false,
    hero: "art-first",
    nav: "text",
    mark: "accent",
  },
] as const satisfies readonly SkinDefinition[];

export type Skin = (typeof SKINS)[number]["id"];

export const DEFAULT_SKIN: Skin = "new-age";

/** @return [Skin | null] the skin with this id, or null when there is none */
export function parseSkin(value: unknown): Skin | null {
  return SKINS.find((s) => s.id === value)?.id ?? null;
}

/**
 * @param id [Skin] a skin that exists
 * @return [SkinDefinition] everything that makes it what it is
 */
export function skinOf(id: Skin): SkinDefinition {
  return SKINS.find((s) => s.id === id)!;
}

const px = (value: number) => `${value}px`;

/**
 * @param skin [SkinDefinition] the skin being worn
 * @return [Record<string, string>] the CSS variables the styles read, to set on the page
 */
export function skinVariables({ colors, font, radius, outline }: SkinDefinition): Record<string, string> {
  return {
    "--color-screen": colors.screen,
    "--color-card": colors.card,
    "--color-line": colors.line,
    "--color-ink": colors.ink,
    "--color-ink-soft": colors.inkSoft,
    "--color-accent": colors.accent,
    "--color-night": colors.night,
    "--color-on-night": colors.onNight,
    "--color-tile": colors.tile,
    "--color-on-tile": colors.onTile,
    "--color-chip": colors.chip,
    "--color-on-chip": colors.onChip,
    "--color-hidden": colors.hidden,
    "--color-notice": colors.notice,
    "--color-danger": colors.danger,
    "--font-sans": font.web,
    "--font-heading": font.webHeading ?? font.web,
    "--font-weight-bold": String(WEIGHTS[font.strong]),
    "--font-weight-heading": String(WEIGHTS[font.heading]),
    "--radius-card": px(radius.card),
    "--radius-tile": px(radius.tile),
    "--radius-panel": px(radius.panel),
    "--radius-control": radius.control === "pill" ? "999px" : px(radius.control),
    "--outline-width": px(outline.width),
    "--outline-color": `var(--color-${outline.color})`,
    "--outline-style": outline.dashed ? "dashed" : "solid",
  };
}

/**
 * @param skin [SkinDefinition] the skin being worn
 * @return [Record<string, string | undefined>] the attributes the styles choose a treatment by, to set on the page
 */
export function skinAttributes(skin: SkinDefinition): Record<string, string | undefined> {
  return {
    "data-skin": skin.id,
    "data-dark": skin.dark ? "true" : undefined,
    "data-backdrop": skin.backdrop,
    "data-stage": skin.stage,
    "data-card": skin.card,
    "data-creature": skin.creature,
    "data-meter": skin.meter,
    "data-glass": skin.glass ? "true" : undefined,
    "data-title": skin.title,
    "data-period": skin.period ? "true" : undefined,
    "data-hero": skin.hero,
    "data-nav": skin.nav,
    "data-mark": skin.mark,
    "data-shadow": skin.shadow,
  };
}
