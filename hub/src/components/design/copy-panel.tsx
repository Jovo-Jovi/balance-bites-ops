"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ActionBtn, Field, TextArea, TextInput } from "@/components/invoices/ui";
import { blockLayerId, listBlocks } from "@/lib/design/blocks";
import { familyFocus, flag, n, previewFace, s } from "@/lib/design/layout";
import { stampOnFace } from "@/lib/design/studio-library";
import type { DesignBlock } from "@/lib/design/types";
import { layerDeco, layerPlate, stickerCopyFields } from "@/lib/design/layers";
import { useDesignApp } from "./design-context";
import { LayerFillControls, PlateFillControls } from "./fill-controls";

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return "#ffffff";
}

function DecoStampCopy() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const face = previewFace(t);
  const stamps = (t.state._stamps || []).filter(
    (st) => stampOnFace(st, face) && (st.kind === "text" || st.kind === "arc" || st.kind === "letters" || Boolean(st.text && !st.iconId)),
  );
  if (!stamps.length) return null;
  return (
    <div className="grid gap-3">
      {stamps.map((st) => {
        const deco = layerDeco(t.state, st.id);
        const plate = layerPlate(t.state, st.id);
        return (
          <div key={st.id} className="grid gap-2">
            {st.kind === "arc" && !st.text ? (
              <p className="text-xs uppercase tracking-wide text-[var(--bb-muted)]">{st.label || "Arc line"}</p>
            ) : (
              <Field label={st.label || (st.kind === "letters" ? "Word" : "Text")}>
                <TextInput value={st.text || ""} onChange={(e) => app.patchLayer(st.id, { text: e.target.value })} />
              </Field>
            )}
            {deco?.fill ? <LayerFillControls deco={deco} onPatch={(patch) => app.patchLayer(st.id, patch)} /> : null}
            {plate ? <PlateFillControls plate={plate} onPatch={(patch) => app.patchLayer(st.id, patch)} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function LangSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value || "both"}
      onChange={(e) => onChange(e.target.value)}
      className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
    >
      <option value="both">English + Arabic</option>
      <option value="en">English only</option>
      <option value="ar">Arabic only</option>
    </select>
  );
}

function FocusBlock({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: ReactNode;
}) {
  const app = useDesignApp();
  const on = familyFocus(app.selectedId)?.block === id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (on) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [on]);
  return (
    <div
      ref={ref}
      className={`grid gap-3 ${on ? "rounded-[var(--bb-radius)] border border-[var(--bb-gold)] p-3" : ""}`}
    >
      {title ? (
        <p className={`text-xs uppercase tracking-wide ${on ? "text-[var(--bb-title)]" : "text-[var(--bb-muted)]"}`}>
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function NamedBlockFields({ block }: { block: DesignBlock }) {
  const app = useDesignApp();
  return (
    <FocusBlock id={`blk:${block.id}`} title={block.title || "Section"}>
      <Field label="Section title">
        <TextInput value={block.title} onChange={(e) => app.patchNamedSection(block.id, { title: e.target.value })} />
      </Field>
      <Field label="Width %">
        <TextInput
          inputMode="decimal"
          value={String(block.widthPct ?? 20)}
          onChange={(e) => app.patchNamedSection(block.id, { widthPct: Number(e.target.value) })}
        />
      </Field>
      {block.fields.map((f) => (
        <div key={f.id} className="grid gap-2 border-t border-[var(--bb-line)] pt-2">
          <Field label="Field label">
            <TextInput value={f.label} onChange={(e) => app.patchNamedField(block.id, f.id, { label: e.target.value })} />
          </Field>
          <Field label="English">
            <TextArea rows={2} value={f.en} onChange={(e) => app.patchNamedField(block.id, f.id, { en: e.target.value })} />
          </Field>
          <Field label="Arabic">
            <TextArea
              rows={2}
              value={f.ar}
              onChange={(e) => app.patchNamedField(block.id, f.id, { ar: e.target.value })}
              dir="rtl"
            />
          </Field>
          <ActionBtn tone="ghost" onClick={() => app.removeNamedField(block.id, f.id)}>
            Remove field
          </ActionBtn>
        </div>
      ))}
      <ActionBtn tone="ghost" onClick={() => app.addNamedField(block.id)}>
        Add field
      </ActionBtn>
    </FocusBlock>
  );
}

export function CopyPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const face = previewFace(t);
  const st = t.state;

  if (face === "composite") {
    const rows = stickerCopyFields(t);
    return (
      <div className="grid gap-3">
        <p className="text-sm text-[var(--bb-muted)]">Text and logo blocks already on this die-cut.</p>
        {rows.map((row) => {
          const deco = layerDeco(st, row.id);
          const plate = layerPlate(st, row.id);
          return (
          <div key={row.id} className="grid gap-2">
            <Field label={row.label}>
              <TextInput
                value={row.text}
                onChange={(e) => app.patchLayer(row.id, { text: e.target.value })}
              />
            </Field>
            {deco?.fill ? (
              <LayerFillControls deco={deco} onPatch={(patch) => app.patchLayer(row.id, patch)} />
            ) : row.color ? (
              <label className="flex items-center gap-2 pb-1 text-xs text-[var(--bb-muted)]">
                Color
                <input
                  type="color"
                  value={toHex(row.color)}
                  onChange={(e) => app.patchLayer(row.id, { color: e.target.value })}
                  className="h-11 w-11 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
                  aria-label={`${row.label} color`}
                />
              </label>
            ) : null}
            {plate ? <PlateFillControls plate={plate} onPatch={(patch) => app.patchLayer(row.id, patch)} /> : null}
          </div>
          );
        })}
      </div>
    );
  }

  if (face === "circle") {
    return (
      <div className="grid gap-3">
        <DecoStampCopy />
        <FocusBlock id="clogo" title="Logo">
          <Field label="Logo letters">
            <TextInput value={s(st, "tLogoTxt")} onChange={(e) => app.setField("tLogoTxt", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="cbrand" title="Brand">
          <Field label="Brand line 1">
            <TextInput value={s(st, "eCBrand1")} onChange={(e) => app.setField("eCBrand1", e.target.value)} />
          </Field>
          <Field label="Brand line 2">
            <TextInput value={s(st, "eCBrand2")} onChange={(e) => app.setField("eCBrand2", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="cflavor" title="Flavor">
          <Field label="Product name">
            <TextInput value={s(st, "eCProdName")} onChange={(e) => app.setField("eCProdName", e.target.value)} />
          </Field>
          <Field label="Flavor">
            <TextInput value={s(st, "eCFlavorTxt")} onChange={(e) => app.setField("eCFlavorTxt", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="cweight" title="Weight">
          <Field label="Weight">
            <TextInput value={s(st, "eWeight")} onChange={(e) => app.setField("eWeight", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="cdates" title="Dates">
          <label className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
            <input
              type="checkbox"
              checked={flag(st, "bCShowDate1", true)}
              onChange={(e) => app.setField("bCShowDate1", e.target.checked ? "true" : "false")}
            />
            Date 1
          </label>
          <Field label="Date 1">
            <TextInput value={s(st, "eCDate1")} onChange={(e) => app.setField("eCDate1", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
            <input
              type="checkbox"
              checked={flag(st, "bCShowDate2", true)}
              onChange={(e) => app.setField("bCShowDate2", e.target.checked ? "true" : "false")}
            />
            Date 2
          </label>
          <Field label="Date 2">
            <TextInput value={s(st, "eCDate2")} onChange={(e) => app.setField("eCDate2", e.target.value)} />
          </Field>
        </FocusBlock>
      </div>
    );
  }

  if (face === "top") {
    return (
      <div className="grid gap-3">
        <DecoStampCopy />
        <FocusBlock id="tlogo" title="Logo">
          <Field label="Logo letters">
            <TextInput value={s(st, "tLogoTxt")} onChange={(e) => app.setField("tLogoTxt", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="ttitle" title="Title">
          <Field label="Title 1">
            <TextInput value={s(st, "tTitle1")} onChange={(e) => app.setField("tTitle1", e.target.value)} />
          </Field>
          <Field label="Title 2">
            <TextInput value={s(st, "tTitle2")} onChange={(e) => app.setField("tTitle2", e.target.value)} />
          </Field>
        </FocusBlock>
        <FocusBlock id="tsub" title="Subtitle">
          <Field label="Subtitle 1">
            <TextInput value={s(st, "tSub1")} onChange={(e) => app.setField("tSub1", e.target.value)} />
          </Field>
          <Field label="Subtitle 2">
            <TextInput value={s(st, "tSub2")} onChange={(e) => app.setField("tSub2", e.target.value)} />
          </Field>
        </FocusBlock>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <DecoStampCopy />
      <FocusBlock id="logo" title="Logo">
        <Field label="Letters on the disc">
          <TextInput value={s(st, "eBrand")} onChange={(e) => app.setField("eBrand", e.target.value)} />
        </Field>
        <Field label="Logo language">
          <LangSelect value={s(st, "eLangLogo", "both")} onChange={(v) => app.setField("eLangLogo", v)} />
        </Field>
      </FocusBlock>
      <FocusBlock id="brand" title="Brand names">
        <Field label="Name 1">
          <TextInput value={s(st, "eName1")} onChange={(e) => app.setField("eName1", e.target.value)} />
        </Field>
        <Field label="Name 2">
          <TextInput value={s(st, "eName2")} onChange={(e) => app.setField("eName2", e.target.value)} />
        </Field>
        <Field label="Name 3">
          <TextInput value={s(st, "eName3")} onChange={(e) => app.setField("eName3", e.target.value)} />
        </Field>
        <Field label="Name 1 (Arabic)">
          <TextInput value={s(st, "eName1Ar")} onChange={(e) => app.setField("eName1Ar", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Name 2 (Arabic)">
          <TextInput value={s(st, "eName2Ar")} onChange={(e) => app.setField("eName2Ar", e.target.value)} dir="rtl" />
        </Field>
      </FocusBlock>
      <FocusBlock id="ing" title="Ingredients">
        <Field label="Ingredients language">
          <LangSelect value={s(st, "eLangIng", "both")} onChange={(v) => app.setField("eLangIng", v)} />
        </Field>
        <Field label="Ingredients title">
          <TextInput value={s(st, "eIngTitle")} onChange={(e) => app.setField("eIngTitle", e.target.value)} />
        </Field>
        <Field label="Ingredients">
          <TextArea rows={4} value={s(st, "eIngredients")} onChange={(e) => app.setField("eIngredients", e.target.value)} />
        </Field>
        <Field label="Allergen">
          <TextInput value={s(st, "eAllergen")} onChange={(e) => app.setField("eAllergen", e.target.value)} />
        </Field>
        <Field label="Ingredients title (Arabic)">
          <TextInput value={s(st, "eIngTitleAr")} onChange={(e) => app.setField("eIngTitleAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Ingredients (Arabic)">
          <TextArea rows={3} value={s(st, "eIngredientsAr")} onChange={(e) => app.setField("eIngredientsAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Allergen (Arabic)">
          <TextInput value={s(st, "eAllergenAr")} onChange={(e) => app.setField("eAllergenAr", e.target.value)} dir="rtl" />
        </Field>
        <div className="grid gap-2">
          <p className="text-xs text-[var(--bb-muted)]">Ingredient badges (emoji or short mark)</p>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Field label={`Icon ${i}`}>
                <TextInput value={s(st, `eIcon${i}`)} onChange={(e) => app.setField(`eIcon${i}`, e.target.value)} />
              </Field>
              <Field label={`Label ${i}`}>
                <TextInput value={s(st, `eBadge${i}`)} onChange={(e) => app.setField(`eBadge${i}`, e.target.value)} />
              </Field>
            </div>
          ))}
        </div>
      </FocusBlock>
      <FocusBlock id="tip" title="Tips">
        <Field label="Tips language">
          <LangSelect value={s(st, "eLangTip", "both")} onChange={(v) => app.setField("eLangTip", v)} />
        </Field>
        <Field label="Tip title">
          <TextInput value={s(st, "eTipTitle")} onChange={(e) => app.setField("eTipTitle", e.target.value)} />
        </Field>
        <Field label="Tip body">
          <TextArea rows={3} value={s(st, "eTipBody")} onChange={(e) => app.setField("eTipBody", e.target.value)} />
        </Field>
        <Field label="Tip title (Arabic)">
          <TextInput value={s(st, "eTipTitleAr")} onChange={(e) => app.setField("eTipTitleAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Tip body (Arabic)">
          <TextArea rows={2} value={s(st, "eTipBodyAr")} onChange={(e) => app.setField("eTipBodyAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Tip icon 1">
          <TextInput value={s(st, "eTipIcon1")} onChange={(e) => app.setField("eTipIcon1", e.target.value)} />
        </Field>
        <Field label="Tip icon 2">
          <TextInput value={s(st, "eTipIcon2")} onChange={(e) => app.setField("eTipIcon2", e.target.value)} />
        </Field>
      </FocusBlock>
      <FocusBlock id="dates" title="Dates">
        <Field label="Dates language">
          <LangSelect value={s(st, "eLangDates", "both")} onChange={(v) => app.setField("eLangDates", v)} />
        </Field>
        <Field label="Date label 1">
          <TextInput value={s(st, "eDateLabel1")} onChange={(e) => app.setField("eDateLabel1", e.target.value)} />
        </Field>
        <Field label="Date 1">
          <TextInput value={s(st, "eDate1")} onChange={(e) => app.setField("eDate1", e.target.value)} />
        </Field>
        <Field label="Date label 2">
          <TextInput value={s(st, "eDateLabel2")} onChange={(e) => app.setField("eDateLabel2", e.target.value)} />
        </Field>
        <Field label="Date 2">
          <TextInput value={s(st, "eDate2")} onChange={(e) => app.setField("eDate2", e.target.value)} />
        </Field>
        <Field label="Store">
          <TextInput value={s(st, "eStore")} onChange={(e) => app.setField("eStore", e.target.value)} />
        </Field>
        <Field label="Date label 1 (Arabic)">
          <TextInput value={s(st, "eDateLabel1Ar")} onChange={(e) => app.setField("eDateLabel1Ar", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Date label 2 (Arabic)">
          <TextInput value={s(st, "eDateLabel2Ar")} onChange={(e) => app.setField("eDateLabel2Ar", e.target.value)} dir="rtl" />
        </Field>
        <Field label="Store (Arabic)">
          <TextInput value={s(st, "eStoreAr")} onChange={(e) => app.setField("eStoreAr", e.target.value)} dir="rtl" />
        </Field>
      </FocusBlock>
      <FocusBlock id="weight" title="Weight">
        <Field label="Weight">
          <TextInput value={s(st, "eWeight")} onChange={(e) => app.setField("eWeight", e.target.value)} />
        </Field>
      </FocusBlock>
      <FocusBlock id="custom" title="Custom">
        <Field label="Custom title">
          <TextInput value={s(st, "eCusTitle")} onChange={(e) => app.setField("eCusTitle", e.target.value)} />
        </Field>
        <Field label="Custom body">
          <TextArea rows={2} value={s(st, "eCusBody")} onChange={(e) => app.setField("eCusBody", e.target.value)} />
        </Field>
        <Field label="Custom body (Arabic)">
          <TextArea rows={2} value={s(st, "eCusBodyAr")} onChange={(e) => app.setField("eCusBodyAr", e.target.value)} dir="rtl" />
        </Field>
      </FocusBlock>
      {listBlocks(st).map((b) => (
        <NamedBlockFields key={b.id} block={b} />
      ))}
    </div>
  );
}

export function NutritionPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const st = t.state;
  const row = (key: string, label: string, fallback = true) => (
    <label key={key} className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
      <input
        type="checkbox"
        checked={flag(st, key, fallback)}
        onChange={(e) => app.setField(key, e.target.checked ? "true" : "false")}
      />
      {label}
    </label>
  );
  const numField = (key: string, label: string) => (
    <Field key={key} label={label}>
      <TextInput inputMode="decimal" value={s(st, key)} onChange={(e) => app.setField(key, e.target.value)} />
    </Field>
  );
  return (
    <FocusBlock id="nut" title="Nutrition">
      <div className="grid gap-3">
      {numField("nSrv", "Serving size")}
      {numField("nCal", "Calories")}
      <div className="grid grid-cols-2 gap-2">
        {numField("nFat", "Total fat (g)")}
        {numField("nFatDV", "Fat DV %")}
        {numField("nSatFat", "Sat. fat (g)")}
        {numField("nSatFatDV", "Sat. DV %")}
        {numField("nChol", "Cholesterol (mg)")}
        {numField("nCholDV", "Chol. DV %")}
        {numField("nSod", "Sodium (mg)")}
        {numField("nSodDV", "Sodium DV %")}
        {numField("nCarb", "Carb (g)")}
        {numField("nCarbDV", "Carb DV %")}
        {numField("nFib", "Fiber (g)")}
        {numField("nFibDV", "Fiber DV %")}
        {numField("nSug", "Sugars (g)")}
        {numField("nProt", "Protein (g)")}
        {numField("nVitD", "Vit D (mcg)")}
        {numField("nCalc", "Calcium (mg)")}
        {numField("nIron", "Iron (mg)")}
        {numField("nPot", "Potassium (mg)")}
      </div>
      <p className="text-xs text-[var(--bb-muted)]">Rows on the facts panel</p>
      <div className="grid gap-1.5">
        {row("cNFat", "Total fat")}
        {row("cNSatFat", "Saturated fat")}
        {row("cNChol", "Cholesterol")}
        {row("cNSod", "Sodium")}
        {row("cNCarb", "Total carb.")}
        {row("cNFib", "Dietary fiber")}
        {row("cNSug", "Total sugars")}
        {row("cNProt", "Protein")}
      </div>
    </div>
    </FocusBlock>
  );
}

export function LayoutPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const st = t.state;
  const named = listBlocks(st);
  const sec = (key: string, label: string, fallback = true) => (
    <label key={key} className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
      <input
        type="checkbox"
        checked={flag(st, key, fallback)}
        onChange={(e) => app.setField(key, e.target.checked ? "true" : "false")}
      />
      {label}
    </label>
  );
  return (
    <div className="grid gap-3">
      <p className="text-sm text-[var(--bb-muted)]">Which wrap columns are on, and how wide they are.</p>
      <div className="grid gap-1.5">
        {sec("chkS1", "Ingredients")}
        {sec("chkS2", "Nutrition")}
        {sec("chkS3", "Logo column")}
        {sec("chkS4", "Tips")}
        {sec("chkS5", "Dates")}
        {sec("chkS6", "Custom", false)}
      </div>
      {named.length ? (
        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-wide text-[var(--bb-muted)]">Named sections</p>
          {named.map((b) => (
            <div key={b.id} className="grid gap-2 rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-2">
              <p className="text-sm text-[var(--bb-text)]">{b.title || "Section"}</p>
              <Field label="Width %">
                <TextInput
                  inputMode="decimal"
                  value={String(b.widthPct ?? 20)}
                  onChange={(e) => app.patchNamedSection(b.id, { widthPct: Number(e.target.value) })}
                />
              </Field>
              <ActionBtn tone="ghost" onClick={() => app.removeArt(blockLayerId(b.id))}>
                Remove
              </ActionBtn>
            </div>
          ))}
        </div>
      ) : null}
      <Field label="Section order">
        <TextInput value={s(st, "eSecOrd", "1,2,3,4,5,6")} onChange={(e) => app.setField("eSecOrd", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Ingredients %">
          <TextInput inputMode="decimal" value={s(st, "sw1") || "22"} onChange={(e) => app.setField("sw1", e.target.value)} />
        </Field>
        <Field label="Nutrition %">
          <TextInput inputMode="decimal" value={s(st, "sw2") || "28"} onChange={(e) => app.setField("sw2", e.target.value)} />
        </Field>
        <Field label="Logo %">
          <TextInput inputMode="decimal" value={s(st, "sw3") || "20"} onChange={(e) => app.setField("sw3", e.target.value)} />
        </Field>
        <Field label="Tips %">
          <TextInput inputMode="decimal" value={s(st, "sw4") || "18"} onChange={(e) => app.setField("sw4", e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-[var(--bb-muted)]">Dates width is the leftover after those four percents.</p>
      <label className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
        <input
          type="checkbox"
          checked={flag(st, "chkIngBadges", true)}
          onChange={(e) => app.setField("chkIngBadges", e.target.checked ? "true" : "false")}
        />
        Badges on ingredients
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
        <input
          type="checkbox"
          checked={flag(st, "chkLogoBadges", true)}
          onChange={(e) => app.setField("chkLogoBadges", e.target.checked ? "true" : "false")}
        />
        Badges on logo
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--bb-text)]">
        <input
          type="checkbox"
          checked={flag(st, "chkName2Box", false)}
          onChange={(e) => app.setField("chkName2Box", e.target.checked ? "true" : "false")}
        />
        Highlight name 2
      </label>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={`${label} (${value}${suffix || ""})`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-[var(--bb-gold)]"
      />
    </Field>
  );
}

export function TypePanel({ face }: { face: string }) {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const st = t.state;
  if (face === "circle") {
    return (
      <div className="grid gap-3">
        <RangeField label="Logo size" value={n(st, "sCLogoSz", 45)} min={15} max={80} suffix="px" onChange={(v) => app.setField("sCLogoSz", v)} />
        <RangeField label="Brand size" value={n(st, "sCBrandFS", 20)} min={8} max={40} suffix="px" onChange={(v) => app.setField("sCBrandFS", v)} />
        <RangeField label="Product name size" value={n(st, "sCProdNameFS", 12)} min={6} max={28} suffix="px" onChange={(v) => app.setField("sCProdNameFS", v)} />
        <RangeField label="Flavor size" value={n(st, "sCFlavorFS", 14)} min={6} max={36} suffix="px" onChange={(v) => app.setField("sCFlavorFS", v)} />
        <RangeField label="Weight size" value={n(st, "sCWtFS", 8)} min={4} max={16} suffix="px" onChange={(v) => app.setField("sCWtFS", v)} />
        <RangeField label="Date size" value={n(st, "sCDateFS", 6)} min={4} max={14} suffix="px" onChange={(v) => app.setField("sCDateFS", v)} />
        <RangeField label="Product photo" value={n(st, "sCProdSz", 80)} min={20} max={150} suffix="px" onChange={(v) => app.setField("sCProdSz", v)} />
        <Field label="Logo circle">
          <select
            value={s(st, "tLogoCircleStyle", "full")}
            onChange={(e) => app.setField("tLogoCircleStyle", e.target.value)}
            className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
          >
            <option value="full">Filled</option>
            <option value="ring">Ring</option>
          </select>
        </Field>
      </div>
    );
  }
  if (face === "top") {
    return (
      <div className="grid gap-3">
        <RangeField label="Logo circle" value={n(st, "sTCircleSz", 32)} min={15} max={60} suffix="px" onChange={(v) => app.setField("sTCircleSz", v)} />
        <RangeField label="Logo letters" value={n(st, "sTLogoFS", 15)} min={8} max={36} suffix="px" onChange={(v) => app.setField("sTLogoFS", v)} />
        <RangeField label="Title size" value={n(st, "sTTitleFS", 20)} min={10} max={40} suffix="px" onChange={(v) => app.setField("sTTitleFS", v)} />
        <RangeField label="Subtitle size" value={n(st, "sTSubFS", 7)} min={4} max={16} suffix="px" onChange={(v) => app.setField("sTSubFS", v)} />
        <Field label="Logo circle">
          <select
            value={s(st, "tLogoCircleStyle", "full")}
            onChange={(e) => app.setField("tLogoCircleStyle", e.target.value)}
            className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
          >
            <option value="full">Filled</option>
            <option value="ring">Ring</option>
          </select>
        </Field>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <Field label="Heading font">
        <TextInput value={s(st, "fntHeading", "Montserrat")} onChange={(e) => app.setField("fntHeading", e.target.value)} />
      </Field>
      <Field label="Body font">
        <TextInput value={s(st, "fntBody", "DM Sans")} onChange={(e) => app.setField("fntBody", e.target.value)} />
      </Field>
      <Field label="Arabic font">
        <TextInput value={s(st, "fntArabic", "Tajawal")} onChange={(e) => app.setField("fntArabic", e.target.value)} />
      </Field>
      <RangeField label="Ingredients" value={n(st, "sIngFS", 6.5)} min={4} max={16} step={0.5} suffix="px" onChange={(v) => app.setField("sIngFS", v)} />
      <RangeField label="Nutrition title" value={n(st, "sNutTitle", 12)} min={6} max={24} suffix="px" onChange={(v) => app.setField("sNutTitle", v)} />
      <RangeField label="Nutrition body" value={n(st, "sNutBody", 6)} min={4} max={14} step={0.5} suffix="px" onChange={(v) => app.setField("sNutBody", v)} />
      <RangeField label="Calories" value={n(st, "sCalFS", 30)} min={10} max={48} suffix="px" onChange={(v) => app.setField("sCalFS", v)} />
      <RangeField label="Logo letters" value={n(st, "sLogoFS", 20)} min={8} max={40} suffix="px" onChange={(v) => app.setField("sLogoFS", v)} />
      <RangeField label="Logo circle" value={n(st, "sLogoSz", 48)} min={20} max={80} suffix="px" onChange={(v) => app.setField("sLogoSz", v)} />
      <RangeField label="Product name" value={n(st, "sNameFS", 14)} min={6} max={28} suffix="px" onChange={(v) => app.setField("sNameFS", v)} />
      <RangeField label="Tips" value={n(st, "sTipFS", 6.5)} min={4} max={16} step={0.5} suffix="px" onChange={(v) => app.setField("sTipFS", v)} />
      <RangeField label="Dates" value={n(st, "sDateFS", 6)} min={4} max={14} step={0.5} suffix="px" onChange={(v) => app.setField("sDateFS", v)} />
      <RangeField label="Weight" value={n(st, "sWtFS", 8)} min={4} max={18} suffix="px" onChange={(v) => app.setField("sWtFS", v)} />
      <Field label="Logo circle">
        <select
          value={s(st, "eLogoCircleStyle", "full")}
          onChange={(e) => app.setField("eLogoCircleStyle", e.target.value)}
          className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
        >
          <option value="full">Filled</option>
          <option value="ring">Ring</option>
        </select>
      </Field>
    </div>
  );
}

export function SizePanel({ face }: { face: string }) {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const st = t.state;
  const scale = n(st, "sScale", 100);
  return (
    <div className="grid gap-3">
      <RangeField label="Screen zoom" value={scale} min={20} max={400} suffix="%" onChange={(v) => app.setField("sScale", v)} />
      {face === "top" ? (
        <Field label="Lid size (cm)">
          <TextInput inputMode="decimal" value={s(st, "tSz") || "4"} onChange={(e) => app.setField("tSz", e.target.value)} />
        </Field>
      ) : null}
      {face === "back" ? (
        <>
          <Field label="Width (cm)">
            <TextInput inputMode="decimal" value={s(st, "sW") || "17"} onChange={(e) => app.setField("sW", e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <TextInput inputMode="decimal" value={s(st, "sH") || "4.5"} onChange={(e) => app.setField("sH", e.target.value)} />
          </Field>
        </>
      ) : null}
      {face === "taper" ? (
        <>
          <Field label="Top Ø (cm)">
            <TextInput inputMode="decimal" value={s(st, "tpDTop") || "9"} onChange={(e) => app.setField("tpDTop", e.target.value)} />
          </Field>
          <Field label="Bottom Ø (cm)">
            <TextInput inputMode="decimal" value={s(st, "tpDBot") || "7"} onChange={(e) => app.setField("tpDBot", e.target.value)} />
          </Field>
          <Field label="Cup height (cm)">
            <TextInput inputMode="decimal" value={s(st, "tpCupH") || "9"} onChange={(e) => app.setField("tpCupH", e.target.value)} />
          </Field>
          <Field label="Label height (cm)">
            <TextInput inputMode="decimal" value={s(st, "tpLblH") || "7"} onChange={(e) => app.setField("tpLblH", e.target.value)} />
          </Field>
          <Field label="Offset from bottom (cm)">
            <TextInput inputMode="decimal" value={s(st, "tpOffsetBot") || "0.5"} onChange={(e) => app.setField("tpOffsetBot", e.target.value)} />
          </Field>
          <Field label="Wrap %">
            <TextInput inputMode="decimal" value={s(st, "tpWrap") || "85"} onChange={(e) => app.setField("tpWrap", e.target.value)} />
          </Field>
        </>
      ) : null}
      {face === "circle" || face === "composite" ? (
        <>
          <Field label="Width (cm)">
            <TextInput inputMode="decimal" value={s(st, "cW") || "6"} onChange={(e) => app.setField("cW", e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <TextInput inputMode="decimal" value={s(st, "cH") || "6"} onChange={(e) => app.setField("cH", e.target.value)} />
          </Field>
        </>
      ) : null}
    </div>
  );
}

export function ColorFields({ face }: { face: string }) {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const st = t.state;
  const deco = app.selectedId ? layerDeco(st, app.selectedId) : null;
  const plate = app.selectedId ? layerPlate(st, app.selectedId) : null;
  const color = (key: string, label: string, fallback: string) => (
    <Field key={key} label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toHex(s(st, key, fallback) || fallback)}
          onChange={(e) => app.setField(key, e.target.value)}
          className="h-11 w-11 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
          aria-label={label}
        />
        <TextInput value={s(st, key, fallback)} onChange={(e) => app.setField(key, e.target.value)} />
      </div>
    </Field>
  );
  return (
    <div className="grid gap-3">
      {app.selectedId && (deco?.fill || plate) ? (
        <div className="grid gap-2 border-b border-[var(--bb-line)] pb-3">
          <p className="text-xs uppercase tracking-wide text-[var(--bb-muted)]">Selected layer</p>
          {deco?.fill ? (
            <LayerFillControls deco={deco} onPatch={(patch) => app.patchLayer(app.selectedId!, patch)} />
          ) : null}
          {plate ? <PlateFillControls plate={plate} onPatch={(patch) => app.patchLayer(app.selectedId!, patch)} /> : null}
        </div>
      ) : null}
      {color("cLabel", "Label fill", "#2e7d32")}
      {color("cTxtMain", "Main ink", "#ffffff")}
      {color("cTxtSub", "Secondary ink", "#cccccc")}
      {face === "circle" || face === "composite" ? color("cCFlavorClr", "Flavor ink", "#1a1a1a") : null}
      {face === "back" || face === "taper" ? (
        <>
          {color("cLogoCircle", "Logo circle", "#ffffff")}
          {color("cLogoTxt", "Logo letters", "#2e7d32")}
          {color("cName2Bg", "Name 2 fill", "#ffffff")}
          {color("cName2Txt", "Name 2 ink", "#2e7d32")}
        </>
      ) : null}
    </div>
  );
}
