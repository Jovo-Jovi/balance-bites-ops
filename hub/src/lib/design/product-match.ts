import type { Product } from "@/lib/invoices/types";
import type { LabelTemplate } from "./types";

type Rule = { re: RegExp; needles: string[] };

const RULES: Rule[] = [
  { re: /circular-choco|peanuts.*choco/i, needles: ["سوداني", "شيكولات"] },
  { re: /circular-sesame/i, needles: ["سمسم"] },
  { re: /circular-cinnamon/i, needles: ["سوداني", "قرفة"] },
  { re: /circular-smoked/i, needles: ["مدخن"] },
  { re: /circular-plain/i, needles: ["محمص"] },
  { re: /cinnamon-choco/i, needles: ["بقسماط", "شيكولات"] },
  { re: /cinnamon-plain/i, needles: ["بقسماط", "ساده"] },
  { re: /crackers-cheddar/i, needles: ["شيدر", "cheddar"] },
  { re: /crackers-thyme/i, needles: ["زعتر", "thyme"] },
  { re: /crackers-rosemary/i, needles: ["روزماري", "rosemary"] },
  { re: /crackers-pepper/i, needles: ["فلفل", "pepper"] },
  { re: /crackers-paprika/i, needles: ["بابريكا", "paprika"] },
  { re: /popcorn-yellow/i, needles: ["كراميل"] },
  { re: /popcorn-red/i, needles: ["فشار", "شيكولات"] },
  { re: /popcorn-green/i, needles: ["فواكه"] },
  { re: /chicopon/i, needles: ["شيكوبون"] },
  { re: /marshmallow/i, needles: ["مارشميلو"] },
  { re: /jelly/i, needles: ["جيلي"] },
  { re: /china-crackers|chinese-crackers/i, needles: ["مقرمشات صينية"] },
  { re: /pretzel/i, needles: ["بريتزل"] },
  { re: /corn-ketchup/i, needles: ["كاتشب"] },
  { re: /corn-cheese/i, needles: ["ذرة", "جبن"] },
];

function blobOf(t: LabelTemplate) {
  return `${t.name} ${t.flavorKey} ${t.state.eName1 || ""} ${t.state.eCFlavorTxt || ""}`.toLowerCase();
}

function score(product: Product, needles: string[]) {
  const name = product.name.toLowerCase();
  return needles.reduce((n, needle) => n + (name.includes(needle.toLowerCase()) ? 1 : 0), 0);
}

export function productForTemplate(template: LabelTemplate, products: Product[]) {
  const byId = products.find((p) => p.id && p.id === template.productId);
  if (byId) return byId;
  const blob = blobOf(template);
  for (const rule of RULES) {
    if (!rule.re.test(blob)) continue;
    let best: Product | undefined;
    let bestScore = 0;
    for (const p of products) {
      const n = score(p, rule.needles);
      if (n > bestScore) {
        best = p;
        bestScore = n;
      }
    }
    if (best && bestScore > 0) return best;
  }
  return undefined;
}
