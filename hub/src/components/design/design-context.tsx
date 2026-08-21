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
import { hydrateStateAssets, hasUnresolvedAssets, stripStateAssets } from "@/lib/design/assets";
import { flavorPackById, FLAVOR_PACKS } from "@/lib/design/colors";
import { getDesignSpec, type DesignSpec } from "@/lib/design/specs";
import {
  applyFlavorPack,
  createTemplate,
  duplicateTemplate,
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
} from "@/lib/design/templates";
import type { DesignType, LabelState, LabelTemplate, StickerSku } from "@/lib/design/types";
import { isStorageEnabled } from "@/lib/firebase-config";
import { removeDesignKey, writeDesignKey } from "@/lib/design/write";

type DesignContextValue = {
  templates: LabelTemplate[];
  products: Product[];
  stickers: StickerSku[];
  current: LabelTemplate | null;
  busy: boolean;
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
  setLocked: (locked: boolean) => void;
  applyPack: (packId: string) => void;
  applyProduct: (productId: string) => void;
  setField: (key: string, value: string) => void;
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
  const [busy, setBusy] = useState(false);
  const consumedTs = useRef(0);
  const openedId = useRef<string | null>(null);

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
        stripped.push({
          ...t,
          state: await stripStateAssets(t.id, t.state),
          flavorKey: flavorKeyFromState(t.state),
          productIdentity: identityFromState(t.state),
          updatedAt: t.updatedAt,
        });
      }
      await writeDesignKey("bb_label_templates", stripped);
      if (stripped.some((t) => hasUnresolvedAssets(t.state)) && !isStorageEnabled()) {
        toast.push("Label art needs Cloudflare R2 — text saved, images left as placeholders.", "warn");
      }
    },
    [toast],
  );

  const loadIntoCurrent = useCallback(
    async (t: LabelTemplate) => {
      openedId.current = t.id;
      setBusy(true);
      try {
        const state = await hydrateStateAssets(t.id, t.state);
        setCurrent({ ...t, state });
      } catch {
        setCurrent(t);
        toast.push("Opened the template. Some art files could not load.", "warn");
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const openTemplate = useCallback(
    async (id: string) => {
      const t = templates.find((x) => x.id === id);
      if (!t) {
        toast.push("That template is not in the library.", "warn");
        return;
      }
      await loadIntoCurrent(t);
      go("atelier", id);
    },
    [templates, loadIntoCurrent, go, toast],
  );

  useEffect(() => {
    const open = parseLabelOpen(labelOpen);
    const fresh =
      Boolean(open?.ts) && Date.now() - Number(open?.ts) < 120_000 && Number(open?.ts) !== consumedTs.current;
    const urlTemplate = params.get("template") || "";
    const urlId = params.get("id") || "";

    let templateId = urlTemplate;
    if (fresh && open) {
      consumedTs.current = Number(open.ts);
      void removeDesignKey("bb_label_open");
      templateId = open.templateId || templateId;
      if (!templateId && open.stickerId) {
        const sku = stickers.find((s) => s.id === open.stickerId);
        if (sku?.templateKey) templateId = sku.templateKey;
      }
    }
    if (!templateId) templateId = urlId;
    if (!templateId || openedId.current === templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    openedId.current = templateId;
    void loadIntoCurrent(t).then(() => {
      if (fresh || urlTemplate) go("atelier", t.id);
    });
  }, [labelOpen, params, templates, stickers, loadIntoCurrent, go]);

  const replaceCurrent = useCallback((next: LabelTemplate) => {
    setCurrent({
      ...next,
      flavorKey: flavorKeyFromState(next.state),
      productIdentity: identityFromState(next.state),
    });
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
      busy,
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
        setBusy(true);
        try {
          await persist([...templates, t]);
          openedId.current = t.id;
          setCurrent(t);
          go("atelier", t.id);
          toast.push("Template created.", "ok");
          return t;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not save the template.", "bad");
          return null;
        } finally {
          setBusy(false);
        }
      },
      openTemplate,
      duplicate: async (id) => {
        const src = templates.find((t) => t.id === id);
        if (!src) return;
        const copy = duplicateTemplate(src);
        setBusy(true);
        try {
          await persist([...templates, copy]);
          toast.push("Duplicated.", "ok");
          await loadIntoCurrent(copy);
          go("atelier", copy.id);
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not duplicate.", "bad");
        } finally {
          setBusy(false);
        }
      },
      remove: async (id) => {
        const result = safeRemoveTemplate(templates, id);
        if (!result.ok) {
          toast.push(result.error, "bad");
          return;
        }
        setBusy(true);
        try {
          await persist(result.next);
          if (current?.id === id) {
            openedId.current = null;
            setCurrent(null);
            go("library", null);
          }
          toast.push("Deleted.", "ok");
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Could not delete.", "bad");
        } finally {
          setBusy(false);
        }
      },
      importFiles: async (raw) => {
        const incoming = uniquify(parseImportedJson(raw), templates);
        if (!incoming.length) {
          toast.push("No templates in that file.", "warn");
          return 0;
        }
        setBusy(true);
        try {
          await persist([...templates, ...incoming]);
          toast.push(`Imported ${incoming.length} template${incoming.length === 1 ? "" : "s"}.`, "ok");
          return incoming.length;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Import failed.", "bad");
          return 0;
        } finally {
          setBusy(false);
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
        a.download = `${current.name.replace(/[^\w\- ]+/g, "_") || "label"}.json`;
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
        replaceCurrent({
          ...current,
          designType,
          labelMode: spec.defaultMode,
          isTapered: spec.isTapered,
          state: { ...current.state, _designType: designType, _isTapered: spec.isTapered },
        });
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
        replaceCurrent({ ...current, state: nextState });
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
          flavorKey: flavorKeyFromState(current.state),
          productIdentity: identityFromState(current.state),
          updatedAt: new Date().toISOString(),
        };
        const list = templates.some((t) => t.id === next.id)
          ? templates.map((t) => (t.id === next.id ? next : t))
          : [...templates, next];
        setBusy(true);
        try {
          await persist(list);
          setCurrent(next);
          toast.push("Saved.", "ok");
          return true;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Save failed.", "bad");
          return false;
        } finally {
          setBusy(false);
        }
      },
      saveAsNew: async () => {
        if (!current) return false;
        const copy = duplicateTemplate(current);
        copy.name = `${current.name.trim() || "Label"} copy`;
        setBusy(true);
        try {
          await persist([...templates, copy]);
          openedId.current = copy.id;
          setCurrent(copy);
          go("atelier", copy.id);
          toast.push("Saved as a new template.", "ok");
          return true;
        } catch (err) {
          toast.push(err instanceof Error ? err.message : "Save failed.", "bad");
          return false;
        } finally {
          setBusy(false);
        }
      },
      linkedStickers,
    };
  }, [
    templates,
    products,
    stickers,
    current,
    busy,
    go,
    openTemplate,
    persist,
    loadIntoCurrent,
    replaceCurrent,
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
