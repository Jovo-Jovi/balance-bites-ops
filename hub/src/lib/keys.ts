import keyManifest from "./bb-keys.json";

export const BB_KEYS = keyManifest.firestoreKeys;
export type BbKey = (typeof BB_KEYS)[number];

export const STORAGE_ONLY_KEYS = keyManifest.storageOnlyKeys;
export const DEFAULT_TENANT_ID = keyManifest.tenantId;

const KEY_SET = new Set<string>(BB_KEYS);

export function isBbKey(key: string): key is BbKey {
  return KEY_SET.has(key);
}

export const EMPTY_DEFAULTS: Record<BbKey, unknown> = {
  bb_invoices: [],
  bb_inv2: {},
  bb_customers: [],
  bb_products: [],
  bb_categories: [],
  bb_invoice_payments: {},
  bb_customer_payments: [],
  bb_pending_invoices: [],
  bb_invoice_bundles: [],
  bb_returns: [],
  bb_materials: [],
  bb_packages: [],
  bb_stickers: [],
  bb_recipes: [],
  bb_purchases: [],
  bb_production: [],
  bb_operation_costs: [],
  bb_investors: [],
  bb_investor_target: { needed: 0, split: "equal", projectStart: "" },
  bb_label_templates: [],
  bb_label_open: null,
  bb_color_presets: [],
  bb_active_color_preset_id: "",
  bb_active_theme: {},
  bb_backup_index: [],
  bb_prep_lines: [],
  bb_prep_ing_view: "total",
  bb_prep_prod_mode: "all",
  bb_prep_print_mode: "both",
  bb_inv_print_preset_id: "",
  bb_print_fit_one: false,
  bb_ret_last_customer: "",
};
