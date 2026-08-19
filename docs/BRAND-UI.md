# Brand and UI/UX

## Logo

**Wordmark**  
“Balance Bites” in Playfair Display 900. Tracking tight. Gold on charcoal. Already used on invoices (`brand-mono`) and the finance header.

**Mark**  
The rotated square (diamond) from Invoice Pro’s header ornament — not a cartoon bite, not a new mascot. Hub favicon = that diamond, gold fill, charcoal ground.

**Do not** introduce a second logo for Finance or Designer in v1. One mark, three cards.

## Color

| Token | Value | Use |
|---|---|---|
| Charcoal | `#060603` | Page ground |
| Panel | `#0e0d0a` | Cards |
| Gold | `#c9a84c` | Brand, links, primary actions |
| Muted | `#7a6f58` | Labels, hints |
| Text | `#e8dfc8` | Body |
| OK | `#7dab6e` | Paid, profit, stock-as-cash win |
| Warn | `#d4924a` | Pending |
| Bad | `#cc5555` | Loss, deficit |

User color presets (`bb_color_presets`) already retheme Invoice Pro, Stock Costs, and Designer. The hub should read the active preset after login so the launcher matches the apps.

## Type

| Role | Font |
|---|---|
| Brand | Playfair Display |
| Section labels | Syne, uppercase, wide tracking |
| UI English | DM Sans |
| UI Arabic | Tajawal |

## Hub UX (the one URL)

**Before login**  
Centered wordmark, diamond, one button: دخول. Arabic first.

**After login**  
Full-viewport dark screen, RTL. Three equal cards:

1. **الفواتير** — Invoices — subtitle: عملاء · طباعة · تحصيل  
2. **التصميم** — Design — subtitle: ملصقات · قوالب · مطبعة  
3. **المالية والمخزون** — Finance & Inventory — subtitle: تكاليف · مخزون · أرباح  

Cards: gold hairline, large type, whole card is the hit target. Footer: connected tenant name, sign out.

**Do not** put finance KPIs on the hub. The hub only routes.

## In-app UX (keep in v1)

- Invoice Pro stays a print-first document canvas.
- Designer stays a left-panel atelier (RTL panel, LTR artboard is OK).
- Finance stays tabbed RTL dashboard.

Phase 1 wraps these; it does not restyle them.

## Motion and chrome

No gradients, no heavy shadows. Hairline gold borders. The existing HTML already follows this. Hub must match.

## Language

| Surface | Default |
|---|---|
| Hub | Arabic |
| Invoices / Finance | Arabic |
| Designer | English chrome, Arabic product names |
| Docs / README | English (this repo) |

## Accessibility

- Card focus rings (gold).
- Do not rely on color alone for shutdown win/loss — keep the words ربح / خسارة.
- Print views stay high-contrast black on white (already separate from the dark UI).
