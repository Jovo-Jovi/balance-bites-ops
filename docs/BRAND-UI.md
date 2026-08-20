# Brand and UI/UX

## Logo

**Wordmark**  
“Balance Bites” in Playfair Display 900. Tracking tight. Ink on linen paper. Invoice Pro / Stock Costs HTML may still use gold until those apps are wrapped.

**Mark**  
The rotated square (diamond) from Invoice Pro’s header ornament — not a cartoon bite, not a new mascot. Hub favicon = that diamond, ink fill, linen ground.

**Do not** introduce a second logo for Finance or Designer in v1. One mark, three cards.

## Color (hub: Linen desk)

Warm paper office. Ink titles. Teal only on actions (buttons, links, focus).

| Token | Value | Use |
|---|---|---|
| Linen | `#f4f0ea` | Page ground |
| Panel | `#fffbf7` | Glass mix base |
| Teal | `#0f6e6b` | Primary actions, focus |
| Ink | `#1f2930` | Wordmark, titles, diamond |
| Line | `#d9d0c4` | Hairlines mixed into glass edges |
| Muted | `#6b645c` | Labels, hints |
| Text | `#2c2824` | Body |
| OK | `#3f7d4e` | Paid, profit, stock-as-cash win |
| Warn | `#b76e32` | Pending |
| Bad | `#b4453a` | Loss, deficit |

User color presets (`bb_color_presets`) already retheme Invoice Pro, Stock Costs, and Designer. Wrapped HTML keeps its own palette until a later pass.

## Type

| Role | Font |
|---|---|
| Brand | Playfair Display |
| Section labels | Syne, uppercase, wide tracking |
| UI English | DM Sans |
| UI Arabic | Tajawal |

## Hub UX (the one URL)

**Before login**  
Centered wordmark, diamond, glass login card, one button: دخول. Arabic first.

**After login**  
Full-viewport linen screen, RTL. Three equal frosted-glass cards:

1. **الفواتير** — Invoices — subtitle: عملاء · طباعة · تحصيل  
2. **التصميم** — Design — subtitle: ملصقات · قوالب · مطبعة  
3. **المالية والمخزون** — Finance & Inventory — subtitle: تكاليف · مخزون · أرباح  

Cards: semi-glass, large ink type, whole card is the hit target. Footer: connected tenant name, sign out.

**Responsive (hub is not the old HTML desktop layout)**  
The live `costs` HTML files are a **behavior** reference (keys, formulas, print). They are not a layout to copy. Hub chrome is fluid:

| Width | Hub |
|---|---|
| Phone | One column, compact cards, 44px tap targets, safe-area insets |
| Tablet | One column until there is room, then three cards |
| Desktop / wide | Three equal cards, wider measure |

Type uses `clamp`. Inputs stay 16px so iOS does not zoom. Do not ship fixed 1440px pages, `overflow: hidden` traps, or desktop-only tab strips in the hub.

**Do not** put finance KPIs on the hub. The hub only routes.

## In-app UX

Each app is a **workspace**, not a clone of the old HTML tab strip:

1. App switcher: الفواتير / التصميم / المالية (always visible).
2. Tool tabs under it — grouped by work (invoice, stock, prep…), scroll on phone.
3. One tool panel: what it does, primary actions, related features.

Logic and keys stay from the live apps. Layout does not.

Hub still has **three cards only** (no KPIs). Tools live inside the apps.

## Motion and chrome

Hub: light frosted glass on cards, login, header/footer, toasts. Soft page wash so the blur reads. No heavy drop shadows, no metallic gold. Wrapped HTML apps keep their current chrome until wrap.

## Language

| Surface | Default |
|---|---|
| Hub | Arabic |
| Invoices / Finance | Arabic |
| Designer | English chrome, Arabic product names |
| Docs / README | English (this repo) |

## Accessibility

- Card focus rings (teal).
- Do not rely on color alone for shutdown win/loss — keep the words ربح / خسارة.
- Print views stay high-contrast black on white (already separate from the hub).
- Respect `prefers-reduced-transparency` by falling back to solid panels.
