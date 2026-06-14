# Remaining Tasks — HMD Secure CRM

Gap analysis of the current build against the HMD × Prompt challenge brief.
Verified against backend (`backend/main.py`, `backend/SQL.py`, `backend/seed.py`) and
the React frontend (`frontend/src`) on 2026-06-14 — not just the self-reported
`FEATURES.md`.

**Legend:** 🔴 blocker for a clean P0 submission · 🟠 P1 (makes it genuinely useful) ·
🟢 P2 (stretch) · 🐛 bug

---

## 🔴 P0 gaps — must close before submission

The brief states *"P0 must all be working for a successful submission."* These P0
features are incomplete in the current build.

### Offer creation + storage — "Versioned. Stored on account."
- [x] ~~**Add an "Offers" tab to the account detail page.**~~ Done (commit 10b5b09):
  `AccountDetail.jsx:7` adds an Offers tab backed by new `GET /accounts/{id}/offers`
  (`main.py`); rows navigate to the offer.
- [ ] **Offer versioning flow.** Schema supports `version` and locked offers are immutable,
  but there is no UI/endpoint to revise a locked/rejected offer into `version = prev + 1`.
  `version` is only ever displayed (`Offers.jsx:98`, `OfferDetail.jsx:186`). Add a "Revise"
  action that clones lines into a new draft offer.

### Product + pricing catalog — "Add/update/retire without a developer"
- [x] ~~**Catalog edit UI.**~~ Done (commit 10b5b09): `Catalog.jsx` now has an `EditRow`
  calling `api.updateCatalogItem` (`Catalog.jsx:48`) via an Edit/Cancel toggle.

### Service catalog — "Internal vs 3rd-party tag. Cases link to a service."
- [x] ~~**Expose the `Service` table via the API.**~~ Done: added `GET /services`,
  `GET /services/{id}`, `POST /services`, `PATCH /services/{id}` (`main.py`). Returns
  `service_type` + `provider_name`.
- [x] ~~🐛 **Fix the case→service link.**~~ Done: `Cases.jsx` now populates the dropdown from
  `api.getServices()` and sends the real `services.id`. `CaseOut` also now carries
  `service_id` + `service_name`. Verified end-to-end.

### Offer approval workflow — notifications
- [x] ~~🔴 **Generate notifications at runtime.**~~ Done: added `_notify`/`_users_by_role`
  helpers and wired them into `submit_offer` (→ SMs), `approve_offer` (→ Finance + rep on SM
  step, → rep on Finance lock), and `reject_offer` (→ rep). Verified end-to-end: SM, Finance,
  and rep all receive the right notifications through the full approval chain.

### Deal pipeline — 3-yr time-phased forecast
- [ ] **Allow forecast entry beyond 12 months.** P0 says "3-yr time-phased forecast."
  Data model holds 36 months and Finance aggregates 3 years, but `DealDetail.jsx` only lets
  reps enter a rolling 12-month window. Add the ability to enter/extend months across the
  full 3-year horizon (the brief's demo flow only requires 12-month *entry*, but P0 text
  says 3-yr — confirm scope, otherwise extend the grid).

---

## 🟠 P1 — should have

### AI next best action (Azure OpenAI) — **completely missing**
- [ ] No AI of any kind exists in the codebase (no Azure OpenAI / LLM calls, backend or
  frontend). Given the brief is titled *"Build HMD's AI-native CRM"* with a whole section on
  AI agents, this is the most visible gap. At minimum implement **AI next best action** on
  the account/deal view: send the timeline + stage to Azure OpenAI and surface a suggested
  next step or draft email.

### Search & filter
- [ ] **Text search on Accounts** (`Accounts.jsx` — no search input).
- [ ] **Search + status/priority filter on Cases** (`Cases.jsx` — only sorts, no filters).
- [ ] Pipeline already filters by stage/channel/stale (`Pipeline.jsx`); consider adding a
  date filter. Global/cross-entity search is absent.

### In-app notifications
- [ ] **Jump-to-record.** `NotificationBell.jsx` polls (30s) and marks read, but clicking a
  notification does not navigate to the related entity. Wire `entity_type`/`entity_id` to a
  route.
- [ ] (Depends on the P0 runtime-notification fix above.)

### Basic reporting
- [ ] **Close rate** metric (won / (won+lost)) — not computed anywhere.
- [ ] **Cases by service** and **deals by owner** cross-aggregation views (current dashboards
  are scoped to the logged-in user / single dimension only).

---

## 🟢 P2 — nice to have (stretch, only if P0+P1 done)

- [ ] **SLA & due-date tracking** — highlight overdue / approaching SLA on cases. (Deal
  stale/overdue badges exist via `badges.js`, but cases have no SLA logic.)
- [ ] **Excel / CSV export** of forecast + cases (Finance). No export code exists.
- [ ] **Email-to-case** inbound via Microsoft Graph.
- [ ] **Outlook calendar** integration (book follow-up from a case).
- [ ] **AI case summary** — 1-paragraph summary on cases with 5+ notes.
- [ ] **AI forecast narrative** — natural-language pipeline health on the Finance view.
- [ ] **Conversational query** agent ("at-risk enterprise deals in DACH" → filtered result).

---

## 🐛 Other issues / polish

- [ ] **Note visibility rules not enforced.** `SQL.py` documents `general` / `internal`
  (rep+TAM) / `working` (TAM-only) visibility, but the note endpoints return all notes
  regardless of the requesting role. Finance can see internal/working notes. Filter by role.
- [ ] **Auth is a user-switcher, not Azure AD SSO.** The brief constraint specifies Azure AD
  (Entra ID) SSO; current auth is an `X-User-ID` header + localStorage user picker. Acceptable
  as a demo shortcut, but note it for the demo / future work (`get_current_user` in `main.py`).
- [ ] **Seed data depth.** ~30 seeded core rows. The brief stresses "use realistic seed data —
  an empty database doesn't show the product at its best." Consider expanding accounts/deals/
  cases so every dashboard (esp. SM team pipeline + Finance 3-yr forecast) looks populated.

---

## Quick status snapshot

| Brief area | State |
|---|---|
| Account & contact mgmt (P0) | ✅ done |
| Case management (P0) | 🟠 done except service-link bug |
| Deal pipeline + stages (P0) | 🟠 done; forecast entry capped at 12mo |
| Offer creation + storage (P0) | 🟠 Offers-on-account tab done; no versioning |
| Offer approval workflow (P0) | ✅ approval + runtime notifications work |
| Product + pricing catalog (P0) | ✅ add/edit/retire all work |
| Service catalog (P0) | ✅ endpoints added + case link fixed |
| Role-based access (P0) | ✅ (switcher, not SSO) |
| Personal dashboards (P0) | ✅ done |
| Case & deal notes (P0) | 🟠 done; visibility rules not enforced |
| Search & filter (P1) | 🟠 pipeline only |
| Sales forecast view (P1) | ✅ done (Finance + SM) |
| Deal risk indicator (P1) | ✅ done |
| In-app notifications (P1) | 🟠 polls/reads; no runtime create, no nav |
| AI next best action (P1) | 🔴 missing entirely |
| Basic reporting (P1) | 🟠 partial |
| All P2 items | 🟢 not started |
</content>
</invoke>
