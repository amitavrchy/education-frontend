# Known Limitations

This is a frontend-only build. The items below are intentional limits of that scope or open follow-ups.
None of them is presented as complete in the UI.

## By design (mock environment)

- **No backend.** Data lives in the browser's IndexedDB per profile. Clearing site data or using another
  browser resets it. Nothing syncs between devices.
- **AI is simulated.** Tutor answers come from a local scenario + keyword-retrieval engine; voice replies are
  scripted. Both are labelled "simulated". Quality is not representative of a real model.
- **OCR, handwriting evaluation, question extraction from Excel/Word/PDF/images, ingestion, embeddings and
  payments are simulated.** CSV question import is genuinely parsed.
- **Device speech** (recognition/synthesis) depends on browser support; Firefox has no SpeechRecognition.
- **Board and institution papers, textbooks and passages are synthetic samples**, labelled as such. No real
  board questions or textbook text is included.
- **Security is UX-only.** Route guards, the permission matrix and session expiry run client-side. API keys are
  masked placeholders, and no secrets exist in the frontend.
- **Notifications** are in-app simulations; push and email preferences are UI only.
- **Service worker / PWA caching** registers only in production builds (`npm run build && npm start`).

## Follow-ups (not yet done)

1. **Accessibility audit**: no formal WCAG 2.2 AA audit or screen-reader pass yet (A11Y-05/06 partial).
   Add axe to the e2e suite.
2. **Component tests** cover `DataTable` only; other UI is covered by e2e and smoke (TEST-02 partial).
3. **Platform-neutral schemas**: contracts are TypeScript. A JSON-schema export for the Flutter repo is
   planned but not generated.
4. **Monorepo layout**: the spec's `edumentor-ai/apps/*` + `packages/*` structure was not adopted. Web and
   Flutter are separate repos by the owner's decision; shared contracts live in `src/contracts`.
5. **Composite operations** (progress recording, exam submit, tutor streaming, checkout, ingestion) need
   dedicated backend endpoints; `replaceAll()` throws in API mode to surface them (see
   `BACKEND_INTEGRATION_PLAN.md`).
6. **Performance** has not been profiled on low-end devices. Large tables are paginated and virtualised where
   long, but no Lighthouse budget is enforced yet.
7. **Legal pages** (terms, privacy) are drafts and need legal review.
