# QA Checklist

Run before every release candidate. Tick in the PR description.

## Automated

- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — 0 errors (warnings reviewed)
- [ ] `npm test` — all unit/component tests pass
- [ ] `npm run test:e2e` — all journeys pass (desktop + mobile tags)
- [ ] `npm run build` — succeeds
- [ ] `npm run docs` — feature matrix and screen inventory regenerated and committed

## Route smoke (every portal, every role)

- [ ] Every route in `SCREEN_INVENTORY.md` renders an `h1` with no console errors for its role
- [ ] Opening another portal's route shows access denied (or redirects)
- [ ] Support/platform admin see access denied on pages outside their permissions

## UI states (spot-check one screen per module)

- [ ] Skeleton on first load; spinner on the action button while saving
- [ ] Empty state with a next step
- [ ] Error state with retry (Settings → developer: failure rate)
- [ ] Offline: banner shown, network actions disabled, downloaded content usable
- [ ] Success toast after mutations; destructive actions ask for confirmation

## Cross-cutting

- [ ] Bangla ⇄ English switch persists; Bangla numerals preference respected
- [ ] Light/dark/system theme and high contrast; reduced motion
- [ ] Keyboard-only pass through: login, tutor, exam runner, admin table + sheet
- [ ] Mobile width (360 px): navigation, tables scroll, dialogs fit
- [ ] Every AI/OCR/voice/payment result is labelled simulated; synthetic papers labelled as such
- [ ] Financial and analytics figures carry the demo-data note

## Data consistency

- [ ] Exam result → analytics mastery and result history update
- [ ] Bookmark → bookmarks page; note → notes page
- [ ] Admin exam publish → student exam list; book upload → admin books + KB ingestion queue
- [ ] Review approve → publish reflected in both portals
- [ ] Plan change → user plan/entitlements
- [ ] Settings → Reset demo data restores seeds
