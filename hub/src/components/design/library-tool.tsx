"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActionBtn, Empty, Field, Modal, TextInput } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import { FLAVOR_PACKS } from "@/lib/design/colors";
import { artboardOf } from "@/lib/design/layout";
import { libraryCardSvg } from "@/lib/design/preview";
import { productForTemplate } from "@/lib/design/product-match";
import { DESIGN_SPECS } from "@/lib/design/specs";
import type { DesignType, LabelTemplate } from "@/lib/design/types";
import { productOptions, useDesignApp } from "./design-context";

const LibraryThumb = memo(function LibraryThumb({ template }: { template: LabelTemplate }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const { wCm, hCm } = artboardOf(template, template.state);
  const safeH = Math.max(0.1, hCm);
  const wide = wCm / safeH > 2;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const svg = on ? libraryCardSvg(template) : "";
  const maxH = wide ? 96 : 140;
  return (
    <div
      ref={ref}
      className="mx-auto overflow-hidden rounded-[var(--bb-radius)] bg-[var(--bb-panel)]"
      style={{
        aspectRatio: `${wCm} / ${hCm}`,
        width: "100%",
        height: "auto",
        maxHeight: maxH,
        maxWidth: `min(100%, calc(${maxH}px * ${wCm} / ${safeH}))`,
      }}
    >
      {on ? (
        <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="block h-full w-full bg-[var(--bb-panel)]" />
      )}
    </div>
  );
});

export function LibraryTool() {
  const app = useDesignApp();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<DesignType>("composite");
  const [draftPack, setDraftPack] = useState(FLAVOR_PACKS[0].id);
  const [draftProduct, setDraftProduct] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return app.templates.filter((t) => {
      if (family && t.designType !== family) return false;
      if (!needle) return true;
      const product = productForTemplate(t, app.products)?.name || "";
      return [t.name, t.flavorKey, t.designType, product].join(" ").toLowerCase().includes(needle);
    });
  }, [app.templates, app.products, q, family]);

  const products = productOptions(app.products, draftProduct);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">Cloud templates. Open one to edit.</p>
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => setCreating(true)}>New template</ActionBtn>
        <label className="bb-btn inline-flex cursor-pointer items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] text-sm text-[var(--bb-text)]">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const raw = JSON.parse(await file.text()) as unknown;
                await app.importFiles(raw);
              } catch {
                toast.push("That file is not JSON.", "bad");
              }
            }}
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, flavor, product"
          aria-label="Search templates"
        />
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          aria-label="Filter by family"
          className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)] sm:max-w-52"
        >
          <option value="">All families</option>
          {DESIGN_SPECS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <Empty>
          {app.templates.length === 0
            ? "No templates in the cloud yet. Create one — nothing is seeded automatically."
            : "No templates match this search."}
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((t) => {
            const product = productForTemplate(t, app.products);
            const spec = DESIGN_SPECS.find((s) => s.id === t.designType);
            return (
              <li
                key={t.id}
                className="bb-glass flex flex-col gap-2 p-2"
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 220px" }}
              >
                <button type="button" className="text-start" onClick={() => void app.openTemplate(t.id)}>
                  <LibraryThumb template={t} />
                  <div className="mt-2">
                    <p className="truncate font-brand text-sm text-[var(--bb-title)]">{t.name}</p>
                    <p className="truncate text-[11px] text-[var(--bb-muted)]">
                      {spec?.label || t.designType}
                      {t.flavorKey ? ` · ${t.flavorKey}` : ""}
                      {product ? ` · ${product.name}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex flex-wrap gap-1">
                  <ActionBtn className="min-h-8 px-2 text-[11px]" onClick={() => void app.openTemplate(t.id)}>
                    Open
                  </ActionBtn>
                  <ActionBtn tone="ghost" className="min-h-8 px-2 text-[11px]" onClick={() => void app.duplicate(t.id)}>
                    Copy
                  </ActionBtn>
                  <ActionBtn tone="danger" className="min-h-8 px-2 text-[11px]" onClick={() => setPendingDelete(t.id)}>
                    Delete
                  </ActionBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={creating}
        title="New template"
        onClose={() => setCreating(false)}
        closeLabel="Close"
        footer={
          <>
            <ActionBtn tone="ghost" onClick={() => setCreating(false)}>
              Cancel
            </ActionBtn>
            <ActionBtn
              disabled={app.busy || !draftName.trim()}
              onClick={async () => {
                const t = await app.newTemplate({
                  name: draftName,
                  designType: draftType,
                  packId: draftPack,
                  productId: draftProduct || undefined,
                });
                if (t) {
                  setCreating(false);
                  setDraftName("");
                }
              }}
            >
              Create
            </ActionBtn>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <TextInput value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </Field>
          <Field label="Family">
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as DesignType)}
              className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
            >
              {DESIGN_SPECS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.hint}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Flavor pack">
            <select
              value={draftPack}
              onChange={(e) => setDraftPack(e.target.value)}
              className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
            >
              {FLAVOR_PACKS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product (optional)">
            <select
              value={draftProduct}
              onChange={(e) => setDraftProduct(e.target.value)}
              className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
            >
              <option value="">None</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.weight ? ` · ${p.weight}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete template"
        onClose={() => setPendingDelete(null)}
        closeLabel="Close"
        footer={
          <>
            <ActionBtn tone="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </ActionBtn>
            <ActionBtn
              tone="danger"
              disabled={app.busy}
              onClick={async () => {
                if (!pendingDelete) return;
                await app.remove(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </ActionBtn>
          </>
        }
      >
        <p className="text-sm text-[var(--bb-text)]">
          Deletes this template from the cloud library and every uploaded file in its art folder. This cannot be
          undone. Design does not change Finance SKUs — pick a new template on the SKU later.
        </p>
      </Modal>
    </div>
  );
}
