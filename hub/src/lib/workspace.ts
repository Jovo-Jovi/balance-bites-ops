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
          { label: "فاتورة جديدة", soon: true },
          { label: "حفظ", soon: true },
          { label: "طباعة", soon: true },
        ],
        features: [
          "أكورديون المحرر واختيار العميل والمنتج",
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
          { label: "عميل جديد", soon: true },
          { label: "طباعة القائمة", soon: true },
        ],
        features: ["إضافة / تعديل / أرشفة", "سجل العميل قبل المتابعة"],
      },
      {
        id: "catalog",
        label: "الكتالوج",
        en: "Catalog",
        summary: "التصنيفات والمنتجات وقائمة الأسعار للطباعة.",
        actions: [
          { label: "إضافة منتج", soon: true },
          { label: "طباعة الأسعار", soon: true },
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
          { label: "إكمال معلق", soon: true },
          { label: "الحزم", soon: true },
        ],
        features: ["تخطي kind: invoice_draft", "حفظ أسطر الفاتورة كنسخة متعددة"],
      },
      {
        id: "history",
        label: "السجل",
        en: "History",
        summary: "الفواتير السابقة وحالة الدفع المشتركة مع المالية.",
        actions: [{ label: "فتح السجل", soon: true }],
        features: ["علامات مدفوع / معلق", "عرض المرتجعات التي تكتبها المالية"],
      },
      {
        id: "reports",
        label: "التقارير",
        en: "Reports",
        summary: "إجمالي، عميل، أفضل منتج، ومنتج مع فلتر تاريخ.",
        actions: [{ label: "تقرير", soon: true }],
        features: ["فلتر تاريخ", "طباعة التقرير"],
      },
      {
        id: "look",
        label: "المظهر",
        en: "Look",
        summary: "ثيمات الألوان المشتركة مع التصميم والمالية.",
        actions: [{ label: "الثيمات", soon: true }],
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
        id: "templates",
        label: "Templates",
        en: "Library",
        summary:
          "Label template library. Arabic product names stay as stored.",
        actions: [
          { label: "New template", soon: true },
          { label: "Import legacy JSON", soon: true },
        ],
        features: ["bb_label_templates CRUD", "Legacy bbLabel-*.json if still on disk"],
      },
      {
        id: "atelier",
        label: "Atelier",
        en: "Artboard",
        summary: "Left tools, artboard on the right. English chrome.",
        actions: [{ label: "Open artboard", soon: true }],
        features: ["Product pick from bb_products / bb_stickers"],
      },
      {
        id: "prepress",
        label: "Prepress",
        en: "Print house",
        summary: "Bleed, crop, and print-ready export. Art files stay on Desktop.",
        actions: [{ label: "Export pack", soon: true }],
        features: ["bb-prepress.js", "bb-composite-label.js"],
      },
      {
        id: "libraries",
        label: "Libraries",
        en: "Assets",
        summary: "Icons, Jelly Kids, and art presets from the repo — not tenant JSON.",
        actions: [{ label: "Browse presets", soon: true }],
        features: ["Icon library", "Jelly Kids", "assets/presets/"],
      },
      {
        id: "link",
        label: "Product link",
        en: "Deep link",
        summary: "Open the template tied to a sticker SKU from finance.",
        actions: [{ label: "Open bb_label_open", soon: true }],
        features: ["Finance stickers → this atelier"],
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
        features: ["bb_operation_costs", "bb_backups على Desktop"],
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
  return app.tools.find((tool) => tool.id === tab) ?? app.tools[0];
}
