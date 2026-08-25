"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, TextInput } from "@/components/invoices/ui";
import { fmt } from "@/lib/finance/helpers";
import { unmatchedInvoiceLines } from "@/lib/finance/recipe-match";
import { calcCOGS, recipeSellPrice } from "@/lib/finance/recipes";
import type { Recipe } from "@/lib/finance/types";
import { useFinanceApp } from "./finance-context";
import { RecipeModal } from "./recipe-modal";
import { UnmatchedLinesHint } from "./section-chips";

export function RecipesTool() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Recipe | null | "new">(null);
  const list = app.recipes.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const unmatched = useMemo(
    () => unmatchedInvoiceLines(app.invoices, app.recipes),
    [app.invoices, app.recipes],
  );

  return (
    <div className="flex flex-col gap-4">
      <UnmatchedLinesHint lines={unmatched} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => setOpen("new")}>وصفة جديدة</ActionBtn>
        <TextInput className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." />
      </div>
      {list.length === 0 ? (
        <Empty>لا وصفات — لا تُزرع وصفات افتراضية إذا كانت السحابة فارغة.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((r) => {
            const cogs = calcCOGS(r, app.findItem);
            const sell = recipeSellPrice(r, app.products);
            return (
              <li key={r.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpen(r)}>
                  <span className="block text-[var(--bb-title)]">{r.name}</span>
                  <span className="text-xs text-[var(--bb-muted)]">
                    دفعة {r.batchSize} · {r.ingredients?.length || 0} مكوّن
                    {r.productId ? " · مربوط بمنتج" : ""}
                  </span>
                </button>
                <span dir="ltr" className="text-sm">
                  {fmt(cogs.total)} / {fmt(sell)} EGP
                </span>
                <ActionBtn tone="ghost" onClick={() => setOpen(r)}>
                  تعديل
                </ActionBtn>
                <ActionBtn tone="danger" onClick={() => app.removeRecipe(r.id)}>
                  حذف
                </ActionBtn>
              </li>
            );
          })}
        </ul>
      )}
      <RecipeModal
        open={open !== null}
        recipe={open === "new" ? null : open}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}
