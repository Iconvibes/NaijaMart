# Agent Learnings

Non-obvious facts about this codebase that can't be recovered by reading the code alone.

## Critical Regressions to Fix

- **`api.products()` response shape changed (FIXED).** Changed from flat array to `{ products, total, page, limit }`. Fixed by unwrapping in `productSource.js` (`api.products().then(r => r.products || r)`), `AdminDashboard.jsx` (`data?.[1]?.products || data?.[1]`), and `VendorProducts.jsx` (`data?.products || data`). Any new component calling `api.products()` must handle the paginated response shape.
- **`email.js` `getClient()` was missing `async` (FIXED).** Used `await import('resend')` without `async` declaration. Fixed by adding `async`. Would crash at runtime when `RESEND_API_KEY` is set.

## Environment & Config Quirks

- **MongoDB env var mismatch.** `.env.example` and README say `MONGO_URI`, but `server/db.js` reads `process.env.MONGODB_URI`. Setting `MONGO_URI` in `.env` has no effect — the app falls back to in-memory mode. Pre-existing.
- **In-memory store is the default.** No `MONGO_URI` → fully in-memory, data lost on restart. The app is designed to demo without any database. The `isMemoryDb()` flag gates every repo method.
- **Upload images are public by design.** `express.static('/uploads')` serves product images without auth. Adding auth here would break all product images site-wide.

## Architecture Patterns

- **`store.js` is the single data abstraction.** Every model method has dual branches: `if (isMemoryDb()) { /* in-memory */ } else { /* MongoDB */ }`. New models and repo methods MUST follow this pattern or the in-memory fallback breaks.
- **`repo` methods use `this` internally.** E.g. `createUser()` calls `this.findUserBySlug()`. Works when called as `repo.createUser()` but would break if destructured. Don't destructure methods from `repo`.
- **`productSource` is a shared cache layer.** It caches the promise (not the result) from `api.products()`. `FlashSales`, `TopSelling`, and `ListingPage` all mount simultaneously and share one fetch. Call `productSource.invalidateProducts()` after any product mutation from vendor pages.
- **Vendor order view is projections, not copies.** `vendorOrderView.js` transforms the full order into a vendor-scoped view: only their items, their subtotal, other sellers' addresses hidden. Always use `toVendorOrderView()` when returning orders to vendors.

## Frontend Gotchas

- **ListingPage has a pre-existing lint error.** `loading` is referenced at line 198 but never destructured from `useAsync` (only `data` is). This means `loading` is `undefined` (falsy), so skeleton loading states never render on the shop page. Also `formatNaira` is imported but unused in `ListingPage` (used by `PriceFilter`).
- **Bundle is >500KB.** Recharts + Socket.io client pushed the main chunk over Vite's warning threshold. Needs code splitting / lazy loading for admin/vendor analytics pages.
- **Socket.io connects to `window.location.origin`.** Works in dev, but production behind a reverse proxy (nginx, Cloudflare) needs WebSocket upgrade headers configured.

## Resilience Notes

- **In-memory dead letter queue is volatile.** Server restart loses all queued failed notifications. A production deployment would need Redis or DB persistence for the DLQ.
- **`nodemailer`/`resend`/`openai` are optional dependencies.** Email and AI services use dynamic `import()` and silently skip when the package isn't installed or the API key isn't set. The app fully works without them.
- **Circuit breakers are per-service singletons.** `circuits.whatsapp`, `circuits.resend`, `circuits.openai` in `server/lib/resilience.js` are module-level. They persist across requests but reset on server restart.

## Interview Portfolio

- **`docs/INTERVIEW-PORTFOLIO.md`** is gitignored — personal file for job interviews.
- **Auto-update trigger:** When any of these change, update the portfolio doc: new features added, API endpoints changed, database schema modified, tech stack changed, or architecture significantly altered. Ask the user to confirm before updating.
