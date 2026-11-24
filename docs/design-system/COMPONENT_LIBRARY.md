# Component Library

## Primitives — `src/components/ui/`

shadcn/ui (Radix) components: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button (sizes
`xs/sm/default/lg/icon*`), card, checkbox, collapsible, command, dialog, dropdown-menu, hover-card, input,
input-group, label, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, slider,
sonner (toasts), switch, table, tabs, textarea, toggle, toggle-group, tooltip.

## Shared building blocks

| Component | Path | Use |
| --- | --- | --- |
| `PortalShell`, `Sidebar`, `Header`, `MobileBottomNav`, `CommandPalette` | `components/shell/` | Portal layout, ⌘K search, guards, offline/demo banners |
| `PageHeader` | `components/common/page-header.tsx` | Title, description, eyebrow, actions |
| `StatCard` | `components/common/stat-card.tsx` | KPI tiles (`tone`: primary/success/warning/info/destructive) |
| `DataTable` | `components/data/data-table.tsx` | Admin tables: search, facets, sort, pagination, selection, bulk actions, column visibility, CSV export, loading/empty/error |
| `TrendChart`, `BarsChart`, `DonutChart`, `RadarSkill`, `Sparkline`, `ChartCard` | `components/charts/` | Themed Recharts with accessible labels |
| `EmptyState`, `ErrorState`, `QueryState`, `PageSkeleton`, `AccessDenied` | `components/feedback/` | Standard UI states |
| `ConfirmDialog` / `ConfirmAction` | `components/modals/`, `components/admin/admin-shared.tsx` | Destructive confirmations |
| `FileDrop` | `components/admin/admin-shared.tsx` | Real file selection + validation, simulated progress, cancel, retry |
| `RichText`, `Diagram` | `components/content/rich-text.tsx` | Markdown + KaTeX + inline SVG with alt text |
| `NotificationCenter`, `SubscriptionPage`, `HelpCenter`, settings sections | `components/common/` | Shared across portals |
| `ReviewQueue`, `ReviewDetailSheet`, `StatusBadge`, `StatusFlow` | `components/review/` | Editorial workflow (teacher + admin) |
| `QuestionEditorSheet` | `components/review/question-editor.tsx` | Rich question editor (CQ parts, LaTeX preview, rubric) |
| Marketing `Section`, `PageHero`, `FinalCta`, `DemoContentLabel` | `components/marketing/sections.tsx` | Public site |

## State checklist for new components

Default · hover/focus (visible ring) · selected (`aria-pressed`/`aria-selected`) · loading (spinner on the action)
· skeleton (first load) · empty (explain what to do next) · disabled (with reason) · error (with retry) · success
(toast) · permission denied (`AccessDenied`) · offline (`useOnline()` disables network actions).

## Conventions

- Bilingual copy inline with `l("বাংলা", "English")`; shared strings in `src/i18n/messages`.
- Numbers, dates and currency go through `useFormat()` so Bangla numerals follow the preference.
- Icons: Lucide only; decorative icons are `aria-hidden`.
