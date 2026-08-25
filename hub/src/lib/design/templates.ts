import { asArray, genId } from "@/lib/invoices/helpers";
import { getDesignSpec, parseDesignType } from "./specs";
import type {
  CompositeBlob,
  DesignType,
  FlavorPack,
  LabelOpen,
  LabelState,
  LabelTemplate,
  ProductIdentity,
  StickerSku,
  SyncTargets,
} from "./types";

const ASSET_PREFIX = "__asset__:";
const R2_PREFIX = "__r2__:";

export function isAssetRef(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith(ASSET_PREFIX) || value.startsWith(R2_PREFIX))
  );
}

/** Accept raster Library snaps only. SVG (including data-URL SVG) is dropped. */
export function asLibraryThumb(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v || v.startsWith("blob:") || /^data:image\/svg/i.test(v)) return undefined;
  if (/^data:image\/(png|jpe?g|webp|gif|avif)/i.test(v)) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith(ASSET_PREFIX) || v.startsWith(R2_PREFIX)) return v;
  return undefined;
}

export function toR2Ref(objectKey: string) {
  return `${R2_PREFIX}${objectKey}`;
}

export function r2KeyFromRef(value: string) {
  return value.startsWith(R2_PREFIX) ? value.slice(R2_PREFIX.length) : "";
}

export function emptyIdentity(): ProductIdentity {
  return {
    brand: "",
    topLogo: "",
    topLine1: "",
    topLine2: "",
    circleBrand1: "",
    circleBrand2: "",
    weight: "",
    bestBefore: "",
    productionDate: "",
    dateLabel1: "**Best Before:",
    dateLabel2: "**Production Date:",
  };
}

export function pickStr(...values: unknown[]) {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function formatWeight(raw: string) {
  const w = raw.trim();
  if (!w) return "";
  if (/^net\s*weight/i.test(w)) return w;
  return `NET WEIGHT: ${w}`;
}

export function flavorKeyFromState(state: LabelState) {
  return pickStr(state.eCFlavorTxt, state.eName1, state.tTitle1, state.eCBrand1);
}

export function identityFromState(state: LabelState): ProductIdentity {
  return {
    brand: pickStr(state.eBrand),
    topLogo: pickStr(state.tLogoTxt, "BB"),
    topLine1: pickStr(state.tTitle1),
    topLine2: pickStr(state.tTitle2),
    circleBrand1: pickStr(state.eCBrand1, state.tTitle1),
    circleBrand2: pickStr(state.eCBrand2, state.tTitle2),
    weight: pickStr(state.eWeight),
    bestBefore: pickStr(state.eDate1, state.eCDate1),
    productionDate: pickStr(state.eDate2, state.eCDate2),
    dateLabel1: pickStr(state.eDateLabel1, "**Best Before:"),
    dateLabel2: pickStr(state.eDateLabel2, "**Production Date:"),
  };
}

function defaultSyncTargets(designType: DesignType): SyncTargets {
  const spec = getDesignSpec(designType);
  if (spec.composite || spec.outline || designType === "circular") {
    return { back: false, top: false, circle: true };
  }
  return { back: true, top: true, circle: false };
}

function asIdentity(raw: unknown): ProductIdentity {
  const r = raw && typeof raw === "object" ? (raw as Partial<ProductIdentity>) : {};
  const base = emptyIdentity();
  return {
    brand: pickStr(r.brand),
    topLogo: pickStr(r.topLogo),
    topLine1: pickStr(r.topLine1),
    topLine2: pickStr(r.topLine2),
    circleBrand1: pickStr(r.circleBrand1),
    circleBrand2: pickStr(r.circleBrand2),
    weight: pickStr(r.weight),
    bestBefore: pickStr(r.bestBefore),
    productionDate: pickStr(r.productionDate),
    dateLabel1: pickStr(r.dateLabel1, base.dateLabel1),
    dateLabel2: pickStr(r.dateLabel2, base.dateLabel2),
  };
}

function asSyncTargets(raw: unknown, designType: DesignType): SyncTargets {
  const r = raw && typeof raw === "object" ? (raw as Partial<SyncTargets>) : {};
  const fallback = defaultSyncTargets(designType);
  return {
    back: typeof r.back === "boolean" ? r.back : fallback.back,
    top: typeof r.top === "boolean" ? r.top : fallback.top,
    circle: typeof r.circle === "boolean" ? r.circle : fallback.circle,
  };
}

function asState(raw: unknown): LabelState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as LabelState) };
}

export function cloneState(state: LabelState): LabelState {
  return JSON.parse(JSON.stringify(state || {})) as LabelState;
}

export function normalizeTemplate(raw: unknown): LabelTemplate | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;
  const id = String(t.id || "").trim();
  const name = String(t.name || "").trim();
  if (!id || !name) return null;
  const designType = parseDesignType(t.designType);
  const spec = getDesignSpec(designType);
  const mode = String(t.labelMode || spec.defaultMode);
  const labelMode =
    mode === "back" || mode === "top" || mode === "circle" ? mode : spec.defaultMode;
  const libraryThumb = asLibraryThumb(t.libraryThumb);
  return {
    id,
    name,
    productId: String(t.productId || ""),
    flavorKey: String(t.flavorKey || ""),
    designType,
    designLocked: Boolean(t.designLocked),
    labelMode,
    isTapered: t.isTapered === undefined ? spec.isTapered : Boolean(t.isTapered),
    state: asState(t.state),
    productIdentity: asIdentity(t.productIdentity),
    syncTargets: asSyncTargets(t.syncTargets, designType),
    schemaVersion: Number(t.schemaVersion) || 2,
    updatedAt: String(t.updatedAt || new Date().toISOString()),
    ...(libraryThumb ? { libraryThumb } : {}),
  };
}

export function normalizeTemplates(value: unknown): LabelTemplate[] {
  return asArray<unknown>(value)
    .map(normalizeTemplate)
    .filter((t): t is LabelTemplate => Boolean(t));
}

function uid(prefix: string) {
  return genId(prefix);
}

export function starterComposite(pack: FlavorPack): CompositeBlob {
  return {
    version: 1,
    artboard: { wCm: 8, hCm: 8 },
    bg: pack.bg,
    txt: pack.txt,
    parts: [
      {
        id: uid("p"),
        type: "circle",
        x: 50,
        y: 50,
        w: 70,
        h: 70,
        rot: 0,
        z: 0,
        color: pack.bg,
      },
    ],
    zones: [
      {
        id: uid("z"),
        kind: "logo",
        x: 50,
        y: 35,
        w: 22,
        h: 22,
        label: "Logo",
        text: "BB",
        z: 1,
        color: pack.txt,
      },
      {
        id: uid("z"),
        kind: "text",
        x: 50,
        y: 58,
        w: 50,
        h: 14,
        label: "Brand",
        field: "eCBrand1",
        text: "BALANCE",
        z: 2,
        color: pack.txt,
      },
      {
        id: uid("z"),
        kind: "text",
        x: 50,
        y: 74,
        w: 52,
        h: 14,
        label: "Flavor",
        field: "eCFlavorTxt",
        text: "FLAVOR",
        z: 3,
        color: pack.txt,
      },
    ],
    unionPath: "",
    presetId: null,
  };
}

export function applyFlavorPack(state: LabelState, pack: FlavorPack): LabelState {
  const next: LabelState = {
    ...state,
    cLabel: pack.bg,
    cTxtMain: pack.txt,
    cTxtSub: pack.sub,
    cLogoTxt: pack.logo,
    cCFlavorClr: pack.flavor,
    cLogoCircle: pack.txt,
  };
  if (next._composite) {
    next._composite = {
      ...next._composite,
      bg: pack.bg,
      txt: pack.txt,
      parts: (next._composite.parts || []).map((p, i) =>
        i === 0 && !p.src ? { ...p, color: pack.bg } : p,
      ),
      zones: (next._composite.zones || []).map((z) =>
        z.src ? z : { ...z, color: pack.txt },
      ),
    };
  }
  if (next._stamps?.length) {
    next._stamps = next._stamps.map((s) => ({ ...s, color: pack.txt }));
  }
  return next;
}

export function patchState(state: LabelState, patch: Record<string, unknown>): LabelState {
  const next: LabelState = { ...state, ...patch };
  if (next._composite?.zones) {
    next._composite = {
      ...next._composite,
      zones: next._composite.zones.map((z) => {
        const field = z.field;
        if (field && Object.prototype.hasOwnProperty.call(patch, field)) {
          return { ...z, text: String(patch[field] ?? "") };
        }
        return z;
      }),
    };
  }
  return next;
}

export function starterState(designType: DesignType, pack: FlavorPack): LabelState {
  const spec = getDesignSpec(designType);
  const size =
    designType === "taper_top"
      ? { cW: "10", cH: "7" }
      : designType === "rect_top"
        ? { cW: "8", cH: "5" }
        : spec.composite
          ? { cW: "8", cH: "8" }
          : { cW: "6", cH: "6" };
  const base = applyFlavorPack(
    {
      eBrand: "BB",
      eCBrand1: "BALANCE",
      eCBrand2: "BITES",
      eCFlavorTxt: "FLAVOR",
      eWeight: "",
      ...size,
      _isTapered: spec.isTapered,
      _designType: designType,
    },
    pack,
  );
  if (spec.composite) {
    base._composite = starterComposite(pack);
  }
  return base;
}

export function ensureCompositeState(state: LabelState, pack: FlavorPack): LabelState {
  if (state._composite?.parts?.length) return state;
  return {
    ...state,
    cW: String(state.cW || "8"),
    cH: String(state.cH || "8"),
    _composite: starterComposite(pack),
  };
}

export function createTemplate(opts: {
  name: string;
  designType: DesignType;
  pack: FlavorPack;
  productId?: string;
  weight?: string;
}): LabelTemplate {
  const spec = getDesignSpec(opts.designType);
  const state = starterState(opts.designType, opts.pack);
  if (opts.weight) state.eWeight = formatWeight(opts.weight);
  const identity = identityFromState(state);
  return {
    id: genId("lbl"),
    name: opts.name,
    productId: opts.productId || "",
    flavorKey: flavorKeyFromState(state),
    designType: opts.designType,
    designLocked: false,
    labelMode: spec.defaultMode,
    isTapered: spec.isTapered,
    state,
    productIdentity: identity,
    syncTargets: defaultSyncTargets(opts.designType),
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateTemplate(src: LabelTemplate): LabelTemplate {
  const copy: LabelTemplate = {
    ...src,
    id: genId("lbl"),
    name: `${src.name} copy`,
    state: cloneState(src.state),
    productIdentity: { ...src.productIdentity },
    syncTargets: { ...src.syncTargets },
    updatedAt: new Date().toISOString(),
  };
  delete copy.libraryThumb;
  return copy;
}

export function assetFieldName(value: string) {
  if (value.startsWith(R2_PREFIX)) return "";
  return value.slice(ASSET_PREFIX.length);
}

export function toAssetRef(field: string) {
  return `${ASSET_PREFIX}${field}`;
}

export function isInlineAsset(key: string, value: unknown) {
  return (
    (key.startsWith("hx") || key.startsWith("hxq")) &&
    typeof value === "string" &&
    value.length > 400 &&
    !value.startsWith(ASSET_PREFIX) &&
    !value.startsWith(R2_PREFIX)
  );
}

export function parseImportedJson(raw: unknown): LabelTemplate[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizeTemplate).filter((t): t is LabelTemplate => Boolean(t));
  }
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (obj.template === "bb_label_template_v2" || obj.state) {
    const t = normalizeTemplate({
      ...obj,
      id: obj.id || genId("lbl"),
      name: obj.name || "Imported",
    });
    return t ? [t] : [];
  }
  if (Array.isArray(obj.templates)) {
    return parseImportedJson(obj.templates);
  }
  return [];
}

export function exportPayload(t: LabelTemplate) {
  const libraryThumb = asLibraryThumb(t.libraryThumb);
  return {
    template: "bb_label_template_v2",
    schemaVersion: 2,
    id: t.id,
    name: t.name,
    date: t.updatedAt,
    designType: t.designType,
    designLocked: t.designLocked,
    labelMode: t.labelMode,
    isTapered: t.isTapered,
    productId: t.productId,
    flavorKey: t.flavorKey,
    productIdentity: t.productIdentity,
    syncTargets: t.syncTargets,
    state: t.state,
    ...(libraryThumb && isAssetRef(libraryThumb) ? { libraryThumb } : {}),
  };
}

export function parseLabelOpen(value: unknown): LabelOpen | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  return {
    stickerId: String(o.stickerId || ""),
    templateId: String(o.templateId || ""),
    productId: String(o.productId || ""),
    recipeId: String(o.recipeId || ""),
    ts: Number(o.ts) || 0,
  };
}

export function parseStickers(value: unknown): StickerSku[] {
  return asArray<Record<string, unknown>>(value)
    .map((s) => ({
      id: String(s.id || ""),
      name: String(s.name || ""),
      productId: String(s.productId || ""),
      recipeId: String(s.recipeId || ""),
      templateKey: String(s.templateKey || s.templateId || ""),
    }))
    .filter((s) => s.id);
}

export function safeRemoveTemplate(
  list: LabelTemplate[],
  id: string,
): { ok: true; next: LabelTemplate[] } | { ok: false; error: string } {
  const next = list.filter((t) => t.id !== id);
  if (list.length > 1 && next.length === 0) {
    return { ok: false, error: "Refusing to wipe the whole library from one delete." };
  }
  return { ok: true, next };
}
