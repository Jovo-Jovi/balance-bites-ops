"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCloudKey } from "@/hooks/use-cloud-key";
import { useToast } from "@/components/toast";
import { asArray, genId, isInactiveProduct } from "@/lib/invoices/helpers";
import type { Product } from "@/lib/invoices/types";
import { applyAssetRefs, collectAssetRefs, hasUnresolvedAssets, hydrateAssetValue, hydrateStateAssets, stripStateAssets } from "@/lib/design/assets";
import { addProductPhotos, applyIconToState, compositeHasCharacterArt, readImageFile, removeArtItem, setFillCutWithPaper, setZoneSrc, syncPaperToSilhouette } from "@/lib/design/art";
import { CUT_LAYER, moveLayer as moveLayerInState, patchLayer as patchLayerInState, moveItem as moveItemInState, resizeItem as resizeItemInState, rotateItem as rotateItemInState, wrapRecipeChkForLayer } from "@/lib/design/layers";
import {
  flavorPackById,
  flavorSnapshot,
  flavorSnapshotEquals,
  FLAVOR_PACKS,
  restoreFlavorSnapshot,
  type FlavorSnapshot,
} from "@/lib/design/colors";
import { productForTemplate } from "@/lib/design/product-match";
import { attachLibraryThumb, stripLibraryThumb } from "@/lib/design/library-thumb";
import { exportFileBase } from "@/lib/design/prepress";
import { isStorageEnabled } from "@/lib/firebase-config";
import { deleteLabelAssetFolder, staffAuthHeader } from "@/lib/storage";
import { getDesignSpec, type DesignSpec } from "@/lib/design/specs";
import {
  applyFlavorPack,
  createTemplate,
  duplicateTemplate,
  ensureCompositeState,
  exportPayload,
  flavorKeyFromState,
  formatWeight,
  identityFromState,
  normalizeTemplates,
  parseImportedJson,
  parseLabelOpen,
  parseStickers,
  patchState,
  safeRemoveTemplate,
  toR2Ref,
} from "@/lib/design/templates";
import { fetchCharacterPng } from "@/lib/design/character-library";
import type { CutPreview } from "@/lib/design/studio-ops";
import {
  addLibraryCharacter,
  addShape,
  addZone,
  applyClipJoin,
  approveCutPreview,
  cancelCutPreview,
  groupSelectedLayers,
  mergeSelectedParts,
  previewWholeCut,
  removePart,
  setCutToSelected,
  syncCutPath as syncCutPathInState,
  ungroupSelected,
  type ZoneKind,
} from "@/lib/design/studio-ops";
import type { DesignType, LabelMode, LabelState, LabelTemplate, StickerSku } from "@/lib/design/types";
import { removeDesignKey, writeDesignKey } from "@/lib/design/write";

type ClipPick = { step: "main" | "inner"; mainId?: string };

async function withLibrarySnap(t: LabelTemplate): Promise<LabelTemplate> {
  try {
    return await attachLibraryThumb(t);
  } catch {
    return t;
  }
}

type DesignContextValue = {
  templates: LabelTemplate[];
  products: Product[];
  stickers: StickerSku[];
  current: LabelTemplate | null;
  selectedId: string | null;
  selectedIds: string[];
  canUndo: boolean;
  clipPick: ClipPick | null;
  cutPreview: CutPreview | null;
  busy: boolean;
  busyMessage: string;
  loadedFlavor: FlavorSnapshot | null;
  loadedFlavorOn: boolean;
  restoreLoadedFlavor: () => void;
  addPhotosFromDevice: (files: FileList | File[]) => Promise<void>;
  addPhotosFromStorage: (objectKeys: string[]) => Promise<void>;
  applyStorageRef: (target: { field: string } | { zoneId: string }, objectKey: string) => Promise<void>;
  setZoneImage: (zoneId: string, src: string) => void;
  forgetAssetOrigin: (path: string) => void;
  openLibrary: () => void;
  openAtelier: (id?: string) => void;
  openPrint: () => void;
  newTemplate: (opts: {
    name: string;
    designType: DesignType;
    packId: string;
    productId?: string;
  }) => Promise<LabelTemplate | null>;
  openTemplate: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importFiles: (raw: unknown) => Promise<number>;
  exportCurrent: () => void;
  setName: (name: string) => void;
  setFamily: (designType: DesignType) => void;
  setLabelMode: (mode: LabelMode) => void;
  setLocked: (locked: boolean) => void;
  applyPack: (packId: string) => void;
  applyProduct: (productId: string) => void;
  setField: (key: string, value: string) => void;
  setFields: (patch: Record<string, string>) => void;
  applyIcon: (iconId: string, sizeId: string, color?: string, letterStyle?: string) => void;
  removeArt: (id: string) => void;
  patchLayer: (id: string, patch: { color?: string; text?: string; borderWidth?: number; borderColor?: string; size?: number }) => void;
  moveLayer: (id: string, dir: -1 | 1) => void;
  selectLayer: (id: string | null, opts?: { shift?: boolean }) => void;
  moveItem: (id: string, x: number, y: number) => void;
  resizeItem: (id: string, w: number, h: number) => void;
  rotateItem: (id: string, rot: number) => void;
  setFillCut: (on: boolean) => void;
  addStudioShape: (type: string) => void;
  addStudioZone: (kind: ZoneKind) => void;
  applyStudioCharacter: (style: string, seed: string) => Promise<void>;
  mergeStudioParts: () => void;
  groupStudioLayers: () => void;
  ungroupStudioLayers: () => void;
  startStudioTrim: () => void;
  cutStudioSelection: () => void;
  previewStudioCut: () => void;
  approveStudioCut: () => void;
  cancelStudioCut: () => void;
  undoStudio: () => void;
  syncCutPath: () => void;
  save: () => Promise<boolean>;
  saveAsNew: () => Promise<boolean>;
  linkedStickers: StickerSku[];
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function useDesignApp() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesignApp must be inside DesignProvider");
  return ctx;
}

function uniquify(incoming: LabelTemplate[], existing: LabelTemplate[]) {
  const ids = new Set(existing.map((t) => t.id));
  return incoming.map((t) => {
    if (!ids.has(t.id)) {
      ids.add(t.id);
      return t;
    }
    const copy = { ...t, id: genId("lbl"), name: t.name };
    ids.add(copy.id);
    return copy;
  });
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const templatesRaw = useCloudKey<unknown>("bb_label_templates");
  const products = asArray<Product>(useCloudKey("bb_products"));
  const stickers = parseStickers(useCloudKey("bb_stickers"));
  const labelOpen = useCloudKey<unknown>("bb_label_open");
  const templates = useMemo(() => normalizeTemplates(templatesRaw), [templatesRaw]);
  const [current, setCurrent] = useState<LabelTemplate | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const busyDepth = useRef(0);
  const [loadedFlavor, setLoadedFlavor] = useState<FlavorSnapshot | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [clipPick, setClipPick] = useState<ClipPick | null>(null);
  const [cutPreview, setCutPreview] = useState<CutPreview | null>(null);
  const consumedTs = useRef(0);
  const wantedId = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const assetOrigins = useRef<Record<string, Record<string, string>>>({});
  const undoStack = useRef<LabelState[]>([]);
  const selectedId = selectedIds[selectedIds.length - 1] || null;

  const go = useCallback(
    (tab: string, id?: string | null) => {
      const next = new URLSearchParams(params.toString());
      next.set("tab", tab);
      if (id) next.set("id", id);
      else next.delete("id");
      next.delete("template");
      next.delete("product");
      router.replace(`${pathname}?${next.toString()}`);
      window.scrollTo(0, 0);
    },
    [params, pathname, router],
  );

  const persist = useCallback(
    async (list: LabelTemplate[]) => {
      const stripped: LabelTemplate[] = [];
      for (const t of list) {
        const thumb = await stripLibraryThumb(t.id, t.libraryThumb);
        const row: LabelTemplate = {
          ...t,
          state: await stripStateAssets(t.id, applyAssetRefs(t.state, assetOrigins.current[t.id] || {})),
          flavorKey: flavorKeyFromState(t.state),
          productIdentity: identityFromState(t.state),
          updatedAt: t.updatedAt,
        };
        if (thumb) row.libraryThumb = thumb;
        else delete row.libraryThumb;
        stripped.push(row);
      }
      await writeDesignKey("bb_label_templates", stripped);
      if (stripped.some((t) => hasUnresolvedAssets(t.state)) && !isStorageEnabled()) {
        toast.push("Label art needs Cloudflare R2 — text saved, images left as placeholders.", "warn");
      }
    },
    [toast],
  );

  const beginBusy = useCallback((message: string) => {
    busyDepth.current += 1;
    setBusyMessage(message);
    setBusy(true);
  }, []);

  const endBusy = useCallback(() => {
    busyDepth.current = Math.max(0, busyDepth.current - 1);
    if (busyDepth.current === 0) {
      setBusy(false);
      setBusyMessage("");
    }
  }, []);

  const loadIntoCurrent = useCallback(
    async (t: LabelTemplate) => {
      const seq = ++loadSeq.current;
      wantedId.current = t.id;
      setSelectedIds([]);
      setClipPick(null);
      setCutPreview(null);
      undoStack.current = [];
      setCanUndo(false);
      const openState = compositeHasCharacterArt(t.state) ? { ...t.state, hxCProd: "" } : t.state;
      setCurrent({ ...t, state: openState });
      assetOrigins.current[t.id] = collectAssetRefs(openState);
      setLoadedFlavor(flavorSnapshot(openState));
      beginBusy("Opening sticker…");
      try {
        const state = await hydrateStateAssets(t.id, openState);
        if (seq !== loadSeq.current || wantedId.current !== t.id) return;
        setCurrent({ ...t, state });
      } catch {
        if (seq !== loadSeq.current || wantedId.current !== t.id) return;
        setCurrent({ ...t, state: openState });
        toast.push("Opened the template. Some art files could not load.", "warn");
      } finally {
        endBusy();
      }
    },
    [beginBusy, endBusy, toast],
  );

  const openTemplate = useCallback(
    async (id: string) => {
      const t = templates.find((x) => x.id === id);
      if (!t) {
        toast.push("That template is not in the library.", "warn");
        return;
      }
      wantedId.current = id;
      go("atelier", id);
      await loadIntoCurrent(t);
    },
    [templates, loadIntoCurrent, go, toast],
  );

  useEffect(() => {
    const open = parseLabelOpen(labelOpen);
    const fresh =
      Boolean(open?.ts) && Date.now() - Number(open?.ts) < 120_000 && Number(open?.ts) !== consumedTs.current;
    if (fresh && open) {
      consumedTs.current = Number(open.ts);
      void removeDesignKey("bb_label_open");
      let templateId = open.templateId || "";
      if (!templateId && open.stickerId) {
        const sku = stickers.find((s) => s.id === open.stickerId);
        if (sku?.templateKey) templateId = sku.templateKey;
      }
      if (templateId) {
        wantedId.current = templateId;
        const t = templates.find((x) => x.id === templateId);
        if (t) void loadIntoCurrent(t).then(() => go("atelier", t.id));
      }
      return;
    }
    const urlId = params.get("template") || params.get("id") || "";
    if (!urlId || !templates.length) return;
    if (wantedId.current === urlId) return;
    if (wantedId.current && wantedId.current !== urlId) return;
    const t = templates.find((x) => x.id === urlId);
    if (!t) return;
    void loadIntoCurrent(t);
  }, [labelOpen, params, templates, stickers, loadIntoCurrent, go]);

  const replaceCurrent = useCallback((next: LabelTemplate) => {
    setCurrent({
      ...next,
      flavorKey: flavorKeyFromState(next.state),
      productIdentity: identityFromState(next.state),
    });
  }, []);

  const pushUndo = useCallback((state: LabelState) => {
    undoStack.current.push(JSON.parse(JSON.stringify(state)) as LabelState);
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(true);
  }, []);

  const value = useMemo<DesignContextValue>(() => {
    const linkedStickers = current
      ? stickers.filter((s) => s.templateKey && s.templateKey === current.id)
      : [];

    return {
      templates,
      products,
      stickers,
      current,
      selectedId,
      selectedIds,
      canUndo,
      clipPick,
      cutPreview,
      busy,
      busyMessage,
      loadedFlavor,
      loadedFlavorOn: Boolean(current && loadedFlavor && flavorSnapshotEquals(current.state, loadedFlavor)),
      restoreLoadedFlavor: () => {
        if (!current || !loadedFlavor) return;
        replaceCurrent({ ...current, state: restoreFlavorSnapshot(current.state, loadedFlavor) });
      },
      forgetAssetOrigin: (path) => {
        if (!current) return;
        const orig = { ...(assetOrigins.current[current.id] || {}) };
        delete orig[path];
        assetOrigins.current[current.id] = orig;
      },
      addPhotosFromDevice: async (files) => {
        if (!current) return;
        const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (!list.length) return;
        const srcs: string[] = [];
        for (const file of list) srcs.push(await readImageFile(file));
        replaceCurrent({ ...current, state: addProductPhotos(current.state, srcs) });
      },
      addPhotosFromStorage: async (objectKeys) => {
        if (!current || !objectKeys.length) return;
        const srcs: string[] = [];
        const refs = objectKeys.map((key) => toR2Ref(key));
        for (const ref of refs) {
          srcs.push((await hydrateAssetValue(current.id, ref)) || ref);
        }
        const before = new Set((current.state._composite?.zones || []).map((z) => z.id));
        const nextState = addProductPhotos(current.state, srcs);
        const orig = { ...(assetOrigins.current[current.id] || {}) };
        for (const zone of nextState._composite?.zones || []) {
          if (before.has(zone.id) || zone.kind !== "image") continue;
          const i = srcs.indexOf(String(zone.src || ""));
          if (i >= 0) orig[`zone:${zone.id}:src`] = refs[i];
        }
        if (!current.state._composite && refs[0]) orig.hxCProd = refs[0];
        assetOrigins.current[current.id] = orig;
        replaceCurrent({ ...current, state: nextState });
      },
      applyStorageRef: async (target, objectKey) => {
        if (!current) return;
        const ref = toR2Ref(objectKey);
        const data = (await hydrateAssetValue(current.id, ref)) || ref;
        const orig = { ...(assetOrigins.current[current.id] || {}) };
        if ("zoneId" in target) {
          orig[`zone:${target.zoneId}:src`] = ref;
          assetOrigins.current[current.id] = orig;
          replaceCurrent({ ...current, state: setZoneSrc(current.state, target.zoneId, data) });
          return;
        }
        orig[target.field] = ref;
        assetOrigins.current[current.id] = orig;
        let nextState = patchState(current.state, { [target.field]: data });
        if (target.field === "hxBg1" && nextState._fillCutWithPaper) {
          nextState = syncPaperToSilhouette(nextState);
        }
        replaceCurrent({ ...current, state: nextState });
      },
      setZoneImage: (zoneId, src) => {
        if (!current) return;
        const orig = { ...(assetOrigins.current[current.id] || {}) };
        delete orig[`zone:${zoneId}:src`];
        assetOrigins.current[current.id] = orig;
        replaceCurrent({ ...current, state: setZoneSrc(current.state, zoneId, src) });
      },
      openLibrary: () => go("library", current?.id || null),
      openAtelier: (id) => {
        if (id) void openTemplate(id);
        else go("atelier", current?.id || null);
      },
      openPrint: () => go("print", current?.id || null),
      newTemplate: async ({ name, designType, packId, productId }) => {
        const pack = flavorPackById(packId) || FLAVOR_PACKS[0];
        const product = products.find((p) => p.id === productId);
        const t = createTemplate({
          name: name.trim(),
          designType,
          pack,
          productId: product?.id,
          weight: product?.weight,
        });
        beginBusy("Creating sticker…");
        try {
          setBusyMessage("Preparing library snap…");
          const saved = await withLibrarySnap(t);
          setBusyMessage("Saving…");
          await persist([...templates, saved]);
          wantedId.current = saved.id;
          assetOrigins.current[saved.id] = collectAssetRefs(saved.state);
          setLoadedFlavor(flavorSnapshot(saved.state));
          setCurrent(saved);
          go("atelier", saved.id);
          toast.push("Template created.", "ok");
          return saved;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not save the template.", "bad");
          return null;
        } finally {
          endBusy();
        }
      },
      openTemplate,
      duplicate: async (id) => {
        const src = templates.find((t) => t.id === id);
        if (!src) return;
        const copy = duplicateTemplate(src);
        beginBusy("Duplicating…");
        try {
          setBusyMessage("Preparing library snap…");
          const saved = await withLibrarySnap(copy);
          setBusyMessage("Saving…");
          await persist([...templates, saved]);
          toast.push("Duplicated.", "ok");
          await loadIntoCurrent(saved);
          go("atelier", saved.id);
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not duplicate.", "bad");
        } finally {
          endBusy();
        }
      },
      remove: async (id) => {
        const result = safeRemoveTemplate(templates, id);
        if (!result.ok) {
          toast.push(result.error, "bad");
          return;
        }
        beginBusy("Deleting sticker…");
        try {
          setBusyMessage("Removing template…");
          await persist(result.next);
          if (current?.id === id) {
            wantedId.current = null;
            setCurrent(null);
            go("library", null);
          }
          if (isStorageEnabled()) {
            try {
              setBusyMessage("Clearing art files…");
              const n = await deleteLabelAssetFolder(id);
              toast.push(n ? `Deleted (${n} art file${n === 1 ? "" : "s"}).` : "Deleted.", "ok");
            } catch {
              toast.push("Template removed. Some uploaded art could not be deleted.", "warn");
            }
          } else {
            toast.push("Deleted.", "ok");
          }
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not delete.", "bad");
        } finally {
          endBusy();
        }
      },
      importFiles: async (raw) => {
        const incoming = uniquify(parseImportedJson(raw), templates);
        if (!incoming.length) {
          toast.push("No templates in that file.", "warn");
          return 0;
        }
        beginBusy("Importing…");
        try {
          await persist([...templates, ...incoming]);
          toast.push(`Imported ${incoming.length} template${incoming.length === 1 ? "" : "s"}.`, "ok");
          return incoming.length;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Import failed.", "bad");
          return 0;
        } finally {
          endBusy();
        }
      },
      exportCurrent: () => {
        if (!current) return;
        const blob = new Blob([JSON.stringify(exportPayload(current), null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportFileBase(current)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      setName: (name) => {
        if (!current) return;
        replaceCurrent({ ...current, name });
      },
      setFamily: (designType) => {
        if (!current || current.designLocked) return;
        const spec = getDesignSpec(designType);
        let state: LabelState = { ...current.state, _designType: designType, _isTapered: spec.isTapered };
        if (spec.composite) {
          const pack = flavorPackById(current.flavorKey) || FLAVOR_PACKS[0];
          state = ensureCompositeState(state, pack);
        }
        replaceCurrent({
          ...current,
          designType,
          labelMode: spec.defaultMode,
          isTapered: spec.isTapered,
          state,
        });
      },
      setLabelMode: (mode) => {
        if (!current) return;
        const spec = getDesignSpec(current.designType);
        if (!spec.modes.includes(mode)) return;
        replaceCurrent({ ...current, labelMode: mode });
      },
      setLocked: (locked) => {
        if (!current) return;
        replaceCurrent({ ...current, designLocked: locked });
      },
      applyPack: (packId) => {
        if (!current) return;
        const pack = flavorPackById(packId);
        if (!pack) return;
        replaceCurrent({ ...current, state: applyFlavorPack(current.state, pack) });
      },
      applyProduct: (productId) => {
        if (!current) return;
        if (!productId) {
          replaceCurrent({ ...current, productId: "" });
          return;
        }
        const p = products.find((x) => x.id === productId);
        if (!p) return;
        const state = patchState(current.state, {
          eWeight: formatWeight(p.weight || ""),
        });
        replaceCurrent({ ...current, productId: p.id, state });
      },
      setFields: (patch) => {
        if (!current) return;
        let nextState: LabelState = patchState(current.state, patch);
        if (Object.prototype.hasOwnProperty.call(patch, "cW") || Object.prototype.hasOwnProperty.call(patch, "cH")) {
          nextState = {
            ...nextState,
            _composite: current.state._composite
              ? {
                  ...current.state._composite,
                  artboard: {
                    wCm: Number(patch.cW ?? current.state.cW) || current.state._composite.artboard?.wCm || 8,
                    hCm: Number(patch.cH ?? current.state.cH) || current.state._composite.artboard?.hCm || 8,
                  },
                }
              : current.state._composite,
          };
        }
        if (Object.prototype.hasOwnProperty.call(patch, "hxBg1") && nextState._fillCutWithPaper) {
          nextState = syncPaperToSilhouette(nextState);
        }
        replaceCurrent({ ...current, state: nextState });
      },
      setField: (key, value) => {
        if (!current) return;
        const nextState: LabelState =
          key === "cW" || key === "cH"
            ? {
                ...patchState(current.state, { [key]: value }),
                _composite: current.state._composite
                  ? {
                      ...current.state._composite,
                      artboard: {
                        wCm: Number(key === "cW" ? value : current.state.cW) || current.state._composite.artboard?.wCm || 8,
                        hCm: Number(key === "cH" ? value : current.state.cH) || current.state._composite.artboard?.hCm || 8,
                      },
                    }
                  : current.state._composite,
              }
            : patchState(current.state, { [key]: value });
        replaceCurrent({
          ...current,
          state:
            key === "hxBg1" && nextState._fillCutWithPaper ? syncPaperToSilhouette(nextState) : nextState,
        });
      },
      applyIcon: (iconId, sizeId, color, letterStyle) => {
        if (!current) return;
        replaceCurrent({
          ...current,
          state: applyIconToState(
            current.state,
            iconId,
            sizeId,
            color || String(current.state.cTxtMain || "#ffffff"),
            letterStyle,
          ),
        });
      },
      removeArt: (id) => {
        if (!current) return;
        const chk = wrapRecipeChkForLayer(id);
        if (chk) {
          pushUndo(current.state);
          replaceCurrent({ ...current, state: patchState(current.state, { [chk]: "false" }) });
          setSelectedIds((prev) => prev.filter((x) => wrapRecipeChkForLayer(x) !== chk && x !== id));
          toast.push("Block removed.", "ok");
          return;
        }
        if (current.state._composite?.parts?.some((p) => p.id === id)) {
          const op = removePart(current.state, id);
          if (!op.ok) {
            toast.push(op.message, "warn");
            return;
          }
          pushUndo(current.state);
          replaceCurrent({ ...current, state: op.state });
          setSelectedIds(op.selectIds);
          toast.push(op.message, "ok");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: removeArtItem(current.state, id) });
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        toast.push("Removed.", "ok");
      },
      patchLayer: (id, patch) => {
        if (!current) return;
        replaceCurrent({ ...current, state: patchLayerInState(current.state, id, patch) });
      },
      moveLayer: (id, dir) => {
        if (!current) return;
        replaceCurrent({ ...current, state: moveLayerInState(current, id, dir) });
      },
      selectLayer: (id, opts) => {
        if (clipPick && id && current?.state._composite?.parts?.some((p) => p.id === id)) {
          if (clipPick.step === "main") {
            setClipPick({ step: "inner", mainId: id });
            setSelectedIds([id]);
            toast.push("Trim: tap the other shape (cut to inside the main).", "ok");
            return;
          }
          if (id === clipPick.mainId) {
            toast.push("Pick a different shape for the inner layer.", "warn");
            return;
          }
          const mainId = clipPick.mainId;
          setClipPick(null);
          if (!mainId) return;
          const op = applyClipJoin(current.state, mainId, id);
          if (!op.ok) {
            toast.push(op.message, "warn");
            return;
          }
          pushUndo(current.state);
          replaceCurrent({ ...current, state: op.state });
          setSelectedIds(op.selectIds);
          toast.push(op.message, "ok");
          return;
        }
        if (!id) {
          setSelectedIds([]);
          return;
        }
        if (opts?.shift) {
          setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        } else {
          setSelectedIds([id]);
        }
      },
      moveItem: (id, x, y) => {
        if (!current) return;
        replaceCurrent({ ...current, state: moveItemInState(current, id, x, y) });
      },
      resizeItem: (id, w, h) => {
        if (!current) return;
        replaceCurrent({ ...current, state: resizeItemInState(current, id, w, h) });
      },
      rotateItem: (id, rot) => {
        if (!current) return;
        replaceCurrent({ ...current, state: rotateItemInState(current, id, rot) });
      },
      setFillCut: (on) => {
        if (!current) return;
        replaceCurrent({ ...current, state: setFillCutWithPaper(current.state, on) });
      },
      addStudioShape: (type) => {
        if (!current) return;
        const op = addShape(current.state, type);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setSelectedIds(op.selectIds);
        toast.push(op.message, "ok");
      },
      addStudioZone: (kind) => {
        if (!current) return;
        const op = addZone(current.state, kind);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setSelectedIds(op.selectIds);
        toast.push(op.message, "ok");
      },
      applyStudioCharacter: async (style, seed) => {
        if (!current) return;
        try {
          let auth: { Authorization: string };
          try {
            auth = await staffAuthHeader();
          } catch {
            toast.push("Sign in to add characters.", "warn");
            return;
          }
          const src = await fetchCharacterPng(style, seed, auth);
          const op = addLibraryCharacter(current.state, src, seed, current.designType === "composite");
          if (!op.ok) {
            toast.push(op.message, "warn");
            return;
          }
          pushUndo(current.state);
          replaceCurrent({ ...current, state: op.state });
          setSelectedIds(op.selectIds);
          toast.push(op.message, "ok");
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not load that character.", "bad");
        }
      },
      mergeStudioParts: () => {
        if (!current) return;
        const op = mergeSelectedParts(current.state, selectedIds);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setSelectedIds(op.selectIds);
        toast.push(op.message, "ok");
      },
      groupStudioLayers: () => {
        if (!current) return;
        const op = groupSelectedLayers(current.state, selectedIds);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setSelectedIds(op.selectIds);
        if (op.message) toast.push(op.message, "ok");
      },
      ungroupStudioLayers: () => {
        if (!current) return;
        const op = ungroupSelected(current.state, selectedIds);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setSelectedIds(op.selectIds);
        toast.push(op.message, "ok");
      },
      startStudioTrim: () => {
        setClipPick({ step: "main" });
        setSelectedIds([]);
        toast.push("Trim: tap the MAIN shape (border).", "ok");
      },
      cutStudioSelection: () => {
        if (!current) return;
        const op = setCutToSelected(current.state, selectedIds);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setCutPreview(null);
        toast.push(op.message, "ok");
      },
      previewStudioCut: () => {
        if (!current) return;
        const op = previewWholeCut(current.state, selectedIds);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setCutPreview(op.preview || null);
        toast.push(op.message, "ok");
      },
      approveStudioCut: () => {
        if (!current || !cutPreview) {
          toast.push("Preview a cut first.", "warn");
          return;
        }
        const op = approveCutPreview(current.state, cutPreview);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        pushUndo(current.state);
        replaceCurrent({ ...current, state: op.state });
        setCutPreview(null);
        setSelectedIds([CUT_LAYER]);
        toast.push(op.message, "ok");
      },
      cancelStudioCut: () => {
        if (!current || !cutPreview) return;
        const op = cancelCutPreview(current.state, cutPreview);
        if (!op.ok) {
          toast.push(op.message, "warn");
          return;
        }
        replaceCurrent({ ...current, state: op.state });
        setCutPreview(null);
        toast.push(op.message, "ok");
      },
      undoStudio: () => {
        if (!current) return;
        const prev = undoStack.current.pop();
        setCanUndo(undoStack.current.length > 0);
        if (!prev) return;
        setCutPreview(null);
        setClipPick(null);
        replaceCurrent({ ...current, state: prev });
        toast.push("Undone.", "ok");
      },
      syncCutPath: () => {
        if (!current) return;
        replaceCurrent({ ...current, state: syncCutPathInState(current.state) });
      },
      save: async () => {
        if (!current) return false;
        const name = current.name.trim();
        if (!name) {
          toast.push("Name the template first.", "warn");
          return false;
        }
        const next: LabelTemplate = {
          ...current,
          name,
          productId: current.productId || productForTemplate(current, products)?.id || "",
          flavorKey: flavorKeyFromState(current.state),
          productIdentity: identityFromState(current.state),
          updatedAt: new Date().toISOString(),
        };
        beginBusy("Saving sticker…");
        try {
          setBusyMessage("Preparing library snap…");
          const saved = await withLibrarySnap(next);
          setBusyMessage("Saving…");
          const list = templates.some((t) => t.id === saved.id)
            ? templates.map((t) => (t.id === saved.id ? saved : t))
            : [...templates, saved];
          await persist(list);
          setCurrent({ ...next, libraryThumb: saved.libraryThumb });
          toast.push("Saved.", "ok");
          return true;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Save failed.", "bad");
          return false;
        } finally {
          endBusy();
        }
      },
      saveAsNew: async () => {
        if (!current) return false;
        const copy = duplicateTemplate(current);
        copy.name = `${current.name.trim() || "Label"} copy`;
        beginBusy("Saving as new…");
        try {
          setBusyMessage("Preparing library snap…");
          const saved = await withLibrarySnap(copy);
          setBusyMessage("Saving…");
          await persist([...templates, saved]);
          wantedId.current = saved.id;
          setLoadedFlavor(flavorSnapshot(saved.state));
          setCurrent({ ...copy, libraryThumb: saved.libraryThumb });
          go("atelier", saved.id);
          toast.push("Saved as a new template.", "ok");
          return true;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Save failed.", "bad");
          return false;
        } finally {
          endBusy();
        }
      },
      linkedStickers,
    };
  }, [
    templates,
    products,
    stickers,
    current,
    selectedId,
    selectedIds,
    canUndo,
    clipPick,
    cutPreview,
    busy,
    busyMessage,
    loadedFlavor,
    go,
    openTemplate,
    persist,
    loadIntoCurrent,
    replaceCurrent,
    pushUndo,
    beginBusy,
    endBusy,
    toast,
  ]);

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function productOptions(products: Product[], selectedId: string) {
  return products.filter((p) => !isInactiveProduct(p) || p.id === selectedId);
}

export function specOf(t: LabelTemplate | null): DesignSpec {
  return getDesignSpec(t?.designType);
}
