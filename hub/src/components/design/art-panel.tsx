"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, ActionBtn, Field, Modal, TextInput } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import { isStorageEnabled } from "@/lib/firebase-config";
import {
  BG_MORE,
  BG_SLOTS,
  ICON_SIZES,
  imageZones,
  readImageFile,
  usableImage,
} from "@/lib/design/art";
import {
  ICON_CATEGORIES,
  LETTER_STYLES,
  categoryCount,
  filterIcons,
  iconSvg,
} from "@/lib/design/icons";
import { isAssetRef } from "@/lib/design/templates";
import { listLabelAssets } from "@/lib/storage";
import { parseLabelAssetKey } from "@/lib/storage-paths";
import { useDesignApp } from "./design-context";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

type StorageTarget = { field: string } | { zoneId: string } | { addPhotos: true };

function StoragePicker({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: StorageTarget | null;
  onClose: () => void;
}) {
  const app = useDesignApp();
  const toast = useToast();
  const [items, setItems] = useState<{ key: string; size: number }[]>([]);
  const [scope, setScope] = useState<"this" | "all">("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const multiple = Boolean(target && "addPhotos" in target);

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setLoading(true);
    void listLabelAssets()
      .then(setItems)
      .catch((err) => toast.push(err instanceof Error ? err.message : "Could not list storage.", "bad"))
      .finally(() => setLoading(false));
  }, [open, toast]);

  const names = useMemo(() => {
    const map = new Map(app.templates.map((t) => [t.id, t.name]));
    return map;
  }, [app.templates]);

  const filtered = items.filter((it) => {
    const p = parseLabelAssetKey(it.key);
    if (!p) return false;
    if (scope === "this" && app.current && p.templateId !== app.current.id) return false;
    const label = `${names.get(p.templateId) || p.templateId} ${p.fileName}`;
    if (q && !label.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  async function useKeys(keys: string[]) {
    if (!keys.length || !target || !app.current) return;
    try {
      if ("addPhotos" in target) await app.addPhotosFromStorage(keys);
      else await app.applyStorageRef(target, keys[0]);
      onClose();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Could not use that file.", "bad");
    }
  }

  return (
    <Modal
      open={open}
      title="Choose from storage"
      onClose={onClose}
      closeLabel="Close"
      footer={
        multiple ? (
          <ActionBtn disabled={!picked.length || app.busy} onClick={() => void useKeys(picked)}>
            Use selected
          </ActionBtn>
        ) : undefined
      }
    >
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Reuse a file already on R2 instead of uploading a duplicate. Device upload is still on the slot.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${
            scope === "this"
              ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
              : "border-[var(--bb-line)] text-[var(--bb-text)]"
          }`}
          onClick={() => setScope("this")}
        >
          This template
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${
            scope === "all"
              ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
              : "border-[var(--bb-line)] text-[var(--bb-text)]"
          }`}
          onClick={() => setScope("all")}
        >
          All templates
        </button>
      </div>
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" aria-label="Search storage" />
      {loading ? (
        <p className="mt-3 text-sm text-[var(--bb-muted)]">Listing R2…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--bb-muted)]">No stored label files in this view.</p>
      ) : (
        <ul className="mt-3 max-h-64 overflow-auto">
          {filtered.map((it) => {
            const p = parseLabelAssetKey(it.key);
            const label = p
              ? `${names.get(p.templateId) || p.templateId} · ${p.fileName.replace(/\.txt$/, "")}`
              : it.key;
            const on = picked.includes(it.key);
            return (
              <li key={it.key}>
                {multiple ? (
                  <label className="flex cursor-pointer items-center gap-2 border-b border-[var(--bb-line)] py-2 text-sm text-[var(--bb-text)]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPicked((cur) => (on ? cur.filter((k) => k !== it.key) : [...cur, it.key]))
                      }
                    />
                    <span className="min-w-0 truncate">{label}</span>
                  </label>
                ) : (
                  <button
                    type="button"
                    className="w-full truncate border-b border-[var(--bb-line)] py-2 text-left text-sm text-[var(--bb-text)] hover:text-[var(--bb-title)]"
                    onClick={() => void useKeys([it.key])}
                  >
                    {label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function ImageActions({
  onDevice,
  onStorage,
  onClear,
  hasValue,
  multiple,
}: {
  onDevice: (files: FileList) => void;
  onStorage: () => void;
  onClear: () => void;
  hasValue: boolean;
  multiple?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <label className="bb-btn inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 text-sm text-[var(--bb-text)]">
        Device
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files?.length) onDevice(files);
          }}
        />
      </label>
      {isStorageEnabled() ? (
        <ActionBtn tone="ghost" onClick={onStorage}>
          Storage
        </ActionBtn>
      ) : null}
      <ActionBtn tone="ghost" disabled={!hasValue} onClick={onClear}>
        Clear
      </ActionBtn>
    </div>
  );
}

function ImageSlot({
  label,
  hint,
  field,
  opaKey,
  zoomKey,
  onStorage,
}: {
  label: string;
  hint?: string;
  field: string;
  opaKey: string;
  zoomKey: string;
  onStorage: () => void;
}) {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  if (!t) return null;
  const raw = str(t.state, field);
  const preview = usableImage(raw);
  const pending = isAssetRef(raw);

  return (
    <div className="rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-3">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)]">
          {preview ? (
            // Native img so data URLs and hydrated R2 blobs preview without a Next image host.
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--bb-muted)]">
              {pending ? "On R2 — opening…" : "No image"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--bb-text)]">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-[var(--bb-muted)]">{hint}</p> : null}
          <ImageActions
            hasValue={Boolean(raw)}
            onStorage={onStorage}
            onClear={() => {
              app.forgetAssetOrigin(field);
              app.setFields({ [field]: "" });
            }}
            onDevice={async (files) => {
              const file = files[0];
              if (!file) return;
              try {
                const data = await readImageFile(file);
                const patch: Record<string, string> = { [field]: data };
                if (opaKey && !str(t.state, opaKey)) patch[opaKey] = "1";
                if (zoomKey && !str(t.state, zoomKey)) patch[zoomKey] = "100";
                app.forgetAssetOrigin(field);
                app.setFields(patch);
              } catch (err) {
                toast.push(err instanceof Error ? err.message : "Could not read that image.", "bad");
              }
            }}
          />
        </div>
      </div>
      {opaKey || zoomKey ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {opaKey ? (
            <Field label={`Opacity ${Math.round(Number(str(t.state, opaKey) || 1) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={str(t.state, opaKey) || "1"}
                onChange={(e) => app.setField(opaKey, e.target.value)}
                className="w-full accent-[var(--bb-gold)]"
              />
            </Field>
          ) : null}
          {zoomKey ? (
            <Field label={`Zoom ${str(t.state, zoomKey) || "100"}%`}>
              <input
                type="range"
                min={50}
                max={250}
                step={5}
                value={str(t.state, zoomKey) || "100"}
                onChange={(e) => app.setField(zoomKey, e.target.value)}
                className="w-full accent-[var(--bb-gold)]"
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ZoneSlot({
  zoneId,
  label,
  onStorage,
}: {
  zoneId: string;
  label: string;
  onStorage: () => void;
}) {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  if (!t) return null;
  const zone = (t.state._composite?.zones || []).find((z) => z.id === zoneId);
  if (!zone) return null;
  const raw = String(zone.src || "");
  const preview = usableImage(raw);
  const pending = isAssetRef(raw);

  return (
    <div className="rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-3">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)]">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--bb-muted)]">
              {pending ? "On R2 — opening…" : "No image"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--bb-text)]">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--bb-muted)]">Clipped to the die-cut. Drag on the preview to place.</p>
          <ImageActions
            hasValue={Boolean(raw)}
            onStorage={onStorage}
            onClear={() => app.setZoneImage(zoneId, "")}
            onDevice={async (files) => {
              const file = files[0];
              if (!file) return;
              try {
                app.setZoneImage(zoneId, await readImageFile(file));
              } catch (err) {
                toast.push(err instanceof Error ? err.message : "Could not read that image.", "bad");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function ImagesPanel() {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  const [moreBg, setMoreBg] = useState(false);
  const [picker, setPicker] = useState<StorageTarget | null>(null);
  if (!t) return null;
  const composite = Boolean(t.state._composite);
  const photos = imageZones(t.state);
  const extraUsed = BG_MORE.some((slot) => str(t.state, slot.key));
  const showMore = moreBg || extraUsed;

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Photos on this sticker, then paper / overlay. Pick from storage or the device so the same file is not stored twice.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="bb-btn inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 text-sm text-[var(--bb-text)]">
          Add photos
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = e.target.files;
              e.target.value = "";
              if (!files?.length) return;
              try {
                await app.addPhotosFromDevice(files);
              } catch (err) {
                toast.push(err instanceof Error ? err.message : "Could not read those images.", "bad");
              }
            }}
          />
        </label>
        {isStorageEnabled() ? (
          <ActionBtn tone="ghost" onClick={() => setPicker({ addPhotos: true })}>
            Add from storage
          </ActionBtn>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {photos.map((z, i) => (
          <ZoneSlot
            key={z.id}
            zoneId={z.id}
            label={z.label || `Photo ${i + 1}`}
            onStorage={() => setPicker({ zoneId: z.id })}
          />
        ))}
        <ImageSlot
          label="Product photo"
          hint={composite ? "Classic circle slot. Extra photos are layers above." : "Shows on this cut."}
          field="hxCProd"
          opaKey=""
          zoomKey=""
          onStorage={() => setPicker({ field: "hxCProd" })}
        />
        {BG_SLOTS.filter((s) => s.key !== "hxCProd").map((slot) => (
          <ImageSlot
            key={slot.key}
            label={slot.label}
            hint={slot.hint}
            field={slot.key}
            opaKey={slot.opa}
            zoomKey={slot.zoom}
            onStorage={() => setPicker({ field: slot.key })}
          />
        ))}
      </div>
      {composite ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--bb-text)]">
          <input
            type="checkbox"
            checked={Boolean(t.state._fillCutWithPaper)}
            onChange={(e) => app.setFillCut(e.target.checked)}
          />
          Fill the cut shape with paper
        </label>
      ) : null}
      <button
        type="button"
        className="mt-3 text-xs text-[var(--bb-gold)] underline-offset-2 hover:underline"
        onClick={() => setMoreBg((v) => !v)}
      >
        {showMore && moreBg ? "Hide extra layers" : "More layers (3–5 + QR)"}
      </button>
      {showMore ? (
        <div className="mt-3 flex flex-col gap-3">
          {BG_MORE.map((slot) => (
            <ImageSlot
              key={slot.key}
              label={slot.label}
              field={slot.key}
              opaKey={slot.opa}
              zoomKey={slot.zoom}
              onStorage={() => setPicker({ field: slot.key })}
            />
          ))}
        </div>
      ) : null}
      <StoragePicker open={Boolean(picker)} target={picker} onClose={() => setPicker(null)} />
    </div>
  );
}

export function IconsPanel() {
  const app = useDesignApp();
  const t = app.current;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sizeId, setSizeId] = useState("m");
  const [iconColor, setIconColor] = useState("#c9a84c");
  const [letterStyle, setLetterStyle] = useState("fatty");
  const icons = useMemo(() => filterIcons(cat, q), [cat, q]);
  if (!t) return null;

  const stampColor = iconColor || "#c9a84c";

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Hub linen tiles — the flavor color stays on the sticker. Pick a size and gold (or any color), then tap an icon.
      </p>
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search icons"
        aria-label="Search icons"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ICON_CATEGORIES.map((c) => {
          const on = cat === c.id;
          const n = categoryCount(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                on
                  ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                  : "border-[var(--bb-line)] text-[var(--bb-text)]"
              }`}
            >
              {c.label} {n}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-[var(--bb-muted)]">Letter font</p>
        <div className="flex flex-wrap gap-1.5">
          {LETTER_STYLES.map((s) => {
            const on = letterStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setLetterStyle(s.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  on
                    ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                    : "border-[var(--bb-line)] text-[var(--bb-text)]"
                }`}
                style={{ fontFamily: s.family, fontWeight: s.weight }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--bb-muted)]">Size</span>
        {ICON_SIZES.map((s) => {
          const on = sizeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSizeId(s.id)}
              className={`min-h-9 min-w-9 rounded-full border px-2 text-xs ${
                on
                  ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                  : "border-[var(--bb-line)] text-[var(--bb-text)]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
        <label className="ms-auto flex items-center gap-2 text-xs text-[var(--bb-muted)]">
          Color
          <input
            type="color"
            value={toHex(stampColor)}
            onChange={(e) => setIconColor(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
            aria-label="Icon color"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--bb-muted)]">
        {icons.length} in {ICON_CATEGORIES.find((c) => c.id === cat)?.label ?? cat}
      </p>
      <div className="mt-2 grid max-h-[28rem] grid-cols-4 gap-1.5 overflow-auto sm:grid-cols-5 lg:grid-cols-6">
        {icons.map((ic) => (
          <button
            key={ic.id}
            type="button"
            title={ic.label}
            onClick={() => {
              app.applyIcon(ic.id, sizeId, stampColor, letterStyle);
            }}
            className="flex aspect-square flex-col items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] p-1 hover:border-[var(--bb-gold)]"
          >
            <span
              className="block h-8 w-8"
              dangerouslySetInnerHTML={{
                __html: iconSvg(ic, stampColor, ic.thickCurve ? 2.8 : ic.fill ? 0.9 : 2, letterStyle),
              }}
            />
            <span className="mt-0.5 w-full truncate text-[9px] leading-tight text-[var(--bb-muted)]">
              {ic.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ArtPanel() {
  return (
    <>
      <Accordion title="Uploaded images">
        <ImagesPanel />
      </Accordion>
      <Accordion title="Icon library">
        <IconsPanel />
      </Accordion>
    </>
  );
}

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return "#c9a84c";
}
