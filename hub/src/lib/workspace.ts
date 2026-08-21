export type AppId = "invoices" | "design" | "finance";

export type WorkspaceAction = {
  label: string;
  soon?: boolean;
};

export type WorkspaceTool = {
  id: string;
  label: string;
  en: string;
  summary: string;
  actions: WorkspaceAction[];
  features: string[];
};

export type WorkspaceApp = {
  id: AppId;
  href: `/${AppId}`;
  title: string;
  en: string;
  subtitle: string;
  dir: "rtl" | "ltr";
  lang: "ar" | "en";
  signOutLabel: string;
  tools: WorkspaceTool[];
};

export const WORKSPACE_APPS: WorkspaceApp[] = [
  {
    id: "invoices",
    href: "/invoices",
    title: "الفواتير",
    en: "Invoices",
    subtitle: "عملاء · طباعة · تحصيل",
    dir: "rtl",
    lang: "ar",
    signOutLabel: "خروج",
    tools: [
      {
        id: "editor",
        label: "فاتورة",
        en: "Invoice",
        summary:
          "إنشاء فاتورة، الأسطر، المجاميع، والحفظ والطباعة. سطر يدوي أو من الكتالوج مع العبوة والوزن.",
        actions: [
          { label: "فاتورة جديدة" },
          { label: "حفظ" },
          { label: "طباعة" },
        ],
        features: [
          "تبويبات المركز واختيار العميل والمنتج",
          "مجاميع: فرعي، خصم، إجمالي",
          "لقطة المحرر bb_inv2",
        ],
      },
      {
        id: "customers",
        label: "العملاء",
        en: "Customers",
        summary: "سجل العملاء وطباعة القائمة قبل فتح فاتورة جديدة.",
        actions: [
          { label: "عميل جديد" },
          { label: "طباعة القائمة" },
        ],
        features: ["إضافة / تعديل / أرشفة", "سجل العميل قبل المتابعة"],
      },
      {
        id: "catalog",
        label: "الكتالوج",
        en: "Catalog",
        summary: "التصنيفات والمنتجات وقائمة الأسعار للطباعة.",
        actions: [
          { label: "إضافة منتج" },
          { label: "طباعة الأسعار" },
        ],
        features: [
          "إضافة واحد / تصنيف كامل / تصنيفات محددة",
          "عبوات وأوزان على سطر الفاتورة",
        ],
      },
      {
        id: "queue",
        label: "الانتظار",
        en: "Queue",
        summary:
          "مسودات التحضير من المالية. تجاهل invoice_draft حتى الاعتماد. الحزم لنسخ أسطر متكررة.",
        actions: [
          { label: "إكمال معلق" },
          { label: "الحزم" },
        ],
        features: ["تخطي kind: invoice_draft", "حفظ أسطر الفاتورة كنسخة متعددة"],
      },
      {
        id: "history",
        label: "السجل",
        en: "History",
        summary: "الفواتير السابقة وحالة الدفع المشتركة مع المالية.",
        actions: [{ label: "فتح السجل" }],
        features: ["علامات مدفوع / معلق", "عرض المرتجعات التي تكتبها المالية"],
      },
      {
        id: "reports",
        label: "التقارير",
        en: "Reports",
        summary: "إجمالي، عميل، أفضل منتج، ومنتج مع فلتر تاريخ.",
        actions: [{ label: "تقرير" }],
        features: ["فلتر تاريخ", "طباعة التقرير"],
      },
      {
        id: "look",
        label: "المظهر",
        en: "Look",
        summary: "ثيمات الألوان المشتركة مع التصميم والمالية.",
        actions: [{ label: "الثيمات" }],
        features: ["bb_color_presets", "إعداد طباعة الصفحة"],
      },
    ],
  },
  {
    id: "design",
    href: "/design",
    title: "التصميم",
    en: "Design",
    subtitle: "ملصقات · قوالب · مطبعة",
    dir: "ltr",
    lang: "en",
    signOutLabel: "Sign out",
    tools: [
      {
        id: "library",
        label: "Library",
        en: "Templates",
        summary:
          "Saved label templates. Create, import JSON, open in the atelier. Arabic names stay as stored.",
        actions: [
          { label: "New template" },
          { label: "Import JSON" },
        ],
        features: [
          "bb_label_templates only — nothing seeded if the cloud list is empty",
          "Import a file you pick (bb_label_template_v2). No Desktop folder scan",
        ],
      },
      {
        id: "atelier",
        label: "Atelier",
        en: "Editor",
        summary:
          "Copy, flavor pack, product pick, and a preview of saved geometry. English chrome.",
        actions: [{ label: "Save" }, { label: "Save as new" }],
        features: [
          "Reads bb_products and bb_stickers",
          "Consumes bb_label_open (2 min) then clears it",
        ],
      },
      {
        id: "print",
        label: "Print house",
        en: "Prepress",
        summary: "Bleed, DPI, SVG preview, and JSON export for the open template.",
        actions: [{ label: "Print preview" }, { label: "Download SVG" }],
        features: ["1.5 mm bleed · 300 DPI", "Licensed popcorn presets stay excluded"],
      },
    ],
  },
  {
    id: "finance",
    href: "/finance",
    title: "المالية والمخزون",
    en: "Finance",
    subtitle: "تكاليف · مخزون · أرباح",
    dir: "rtl",
    lang: "ar",
    signOutLabel: "خروج",
    tools: [
      {
        id: "overview",
        label: "نظرة عامة",
        en: "Overview",
        summary:
          "لوحة التحكم والأرباح وCOGS والمستثمرون. الإغلاق سيناريوهان. الربح = مبيعات − تكلفة المباع − تشغيل − حوالك. المخزون أصل وليس ربحاً.",
        actions: [
          { label: "اللوحة", soon: true },
          { label: "الأرباح", soon: true },
        ],
        features: [
          "إغلاق: مخزون→نقد / مخزون→خسارة — المعلق يُحصّل دائماً",
          "كلمات ربح / خسارة لا اللون وحده",
          "NAV المستثمر يشمل قيمة المخزون",
        ],
      },
      {
        id: "invoices",
        label: "الفواتير",
        en: "Invoices",
        summary: "قراءة الفواتير، مدفوع/معلق، ودفتر العميل. الكتابة الأساسية من تطبيق الفواتير.",
        actions: [
          { label: "كشف عميل", soon: true },
          { label: "التحصيل", soon: true },
        ],
        features: ["bb_invoice_payments", "bb_customer_payments"],
      },
      {
        id: "stock",
        label: "المخزون",
        en: "Stock",
        summary:
          "الكمية المعروضة = مجموع المشتريات − استهلاك الوصفة من الفواتير (أو الإنتاج إن لم توجد فواتير).",
        actions: [
          { label: "دفتر الكميات", soon: true },
          { label: "مواد / تغليف / ملصقات", soon: true },
        ],
        features: [
          "الكتالوج وبطاقات BOM",
          "currentStock خانة وسيطة وليست المصدر",
        ],
      },
      {
        id: "flow",
        label: "التحضير",
        en: "Prep",
        summary:
          "تحضير حسب العميل، مسودات فاتورة، وشراء العجز. الإنتاج زر منفصل — لا تخلط الاعتمادين.",
        actions: [
          { label: "التحضير", soon: true },
          { label: "الإنتاج", soon: true },
          { label: "شراء عجز", soon: true },
        ],
        features: [
          "مسودة kind: invoice_draft",
          "اعتماد التحضير يكتب فاتورة #INV-",
        ],
      },
      {
        id: "purchases",
        label: "المشتريات",
        en: "Purchases",
        summary: "مصدر كمية الدفتر. بعد شراء حقيقي يُحدَّث الدفتر فوراً.",
        actions: [{ label: "تسجيل شراء", soon: true }],
        features: ["تسوية الجرد تُتخطى إن لم تتغير الكمية"],
      },
      {
        id: "recipes",
        label: "الوصفات",
        en: "Recipes",
        summary: "قائمة المواد للدفعات وربط المنتج.",
        actions: [{ label: "وصفة جديدة", soon: true }],
        features: ["تكلفة الدفعة", "ربط منتج"],
      },
      {
        id: "returns",
        label: "المرتجعات",
        en: "Returns",
        summary: "إعادة للمخزون أو تالف/حوالك.",
        actions: [{ label: "مرتجع جديد", soon: true }],
        features: ["restock / expired / mixed"],
      },
      {
        id: "ops",
        label: "التشغيل",
        en: "Ops",
        summary: "إيجار وأجور وتعويض (سالب مسموح). النسخ على سطح المكتب لا السحابة.",
        actions: [
          { label: "تكلفة تشغيل", soon: true },
          { label: "نسخة احتياطية", soon: true },
        ],
        features: ["bb_operation_costs", "bb_backups على Cloudflare R2"],
      },
    ],
  },
];

export function getWorkspaceApp(id: AppId): WorkspaceApp {
  const app = WORKSPACE_APPS.find((item) => item.id === id);
  if (!app) throw new Error(`Unknown workspace ${id}`);
  return app;
}

export function getTool(app: WorkspaceApp, tab: string | null): WorkspaceTool {
  const DESIGN_ALIAS: Record<string, string> = {
    templates: "library",
    prepress: "print",
    libraries: "atelier",
    link: "atelier",
  };
  const resolved =
    app.id === "design" && tab ? DESIGN_ALIAS[tab] || tab : tab;
  return app.tools.find((tool) => tool.id === resolved) ?? app.tools[0];
}
