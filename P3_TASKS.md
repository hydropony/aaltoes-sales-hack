# P3 — Deal Pipeline & Offer Flow

> Owner: Person 3
> Stack: React + Vite + shadcn/ui · fetches from `http://localhost:8000`
> Keep components in `src/features/deals/` and `src/features/offers/`

---

## 0 · Setup (do this first)

- [ ] Install shadcn/ui: `npx shadcn@latest init` then add components as needed
- [ ] Install React Query: `npm install @tanstack/react-query`
- [ ] Create `src/lib/api.js` — central fetch wrapper that attaches `X-User-ID` header from `localStorage`
- [ ] Add React Query provider to `main.jsx`

```js
// src/lib/api.js
const BASE = "http://localhost:8000";
export const api = (path, options = {}) =>
  fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "X-User-ID": localStorage.getItem("userId") ?? "",
      "Content-Type": "application/json",
      ...options.headers,
    },
  }).then(r => r.ok ? r.json() : Promise.reject(r));
```

---

## 1 · Constants & utilities

- [ ] Create `src/lib/stages.js`:

```js
export const STAGES = {
  direct:   ["Interest Shown","RFI Answered","RFP/Offer Given","Customer Test","Contract Negotiation","Won","Lost"],
  reseller: ["Interest Shown","RFI Answered","RFP/Offer Given","Customer Test","Won","Lost"],
};

// Internal API values matching backend DealStage enum
export const STAGE_API = {
  "Interest Shown":       "interest_shown",
  "RFI Answered":         "rfi_answered",
  "RFP/Offer Given":      "rfp_offer_given",
  "Customer Test":        "customer_test",
  "Contract Negotiation": "contract_negotiation",
  "Won":                  "won",
  "Lost":                 "lost",
};
export const STAGE_LABEL = Object.fromEntries(Object.entries(STAGE_API).map(([k,v]) => [v,k]));

export const validStages = (channel) => STAGES[channel] ?? STAGES.direct;
export const nextStages  = (channel, currentStage) => {
  const list = validStages(channel).map(s => STAGE_API[s]);
  const idx  = list.indexOf(currentStage);
  return list.slice(idx + 1);   // everything after current
};
```

- [ ] Create `src/lib/badges.js`:

```js
import { differenceInDays } from "date-fns";   // npm install date-fns

export const isStale    = (deal) => differenceInDays(new Date(), new Date(deal.updated_at)) >= 14;
export const isOverdue  = (deal) => deal.expected_close_date && new Date() > new Date(deal.expected_close_date)
                                    && deal.stage !== "won" && deal.stage !== "lost";
```

---

## 2 · Rep dashboard `src/features/deals/RepDashboard.jsx`

> Default landing page when `role === "rep"`. Uses `GET /accounts` and `GET /deals`.

- [ ] Fetch all accounts and all deals owned by current user
- [ ] **Accounts section** — card per account showing:
  - Account name
  - Open deal count
  - Highest-stage active deal as a Badge
- [ ] **Active deals section** — table/list with columns:
  - Account name
  - Deal name (links to deal detail)
  - Channel badge (`Direct` blue / `Reseller` purple)
  - Current stage
  - Expected close date
  - Device total (€) and service total (€) in separate columns
  - Stale badge (amber) if `isStale(deal)`
  - Overdue badge (red) if `isOverdue(deal)`
- [ ] "New deal" button → opens deal creation form

---

## 3 · Deal creation form `src/features/deals/DealForm.jsx`

> Modal or page. Calls `POST /deals` on save.

- [ ] Account picker — searchable Select from `GET /accounts`
- [ ] Deal name — text input
- [ ] Channel — radio: Direct / Reseller
- [ ] Stage picker — Select filtered to `validStages(channel)` — updates when channel changes
- [ ] Expected close date — date picker
- [ ] Pilot deal — checkbox
- [ ] Follow-on parent deal — searchable Select of won/active deals on same account (only shown when pilot checkbox is NOT checked); maps to `parent_deal_id`
- [ ] On save: `POST /deals` → redirect to `/deals/{id}`
- [ ] Validation: all required fields, stage must be valid for chosen channel

---

## 4 · Deal detail page `src/features/deals/DealDetail.jsx`

> Route: `/deals/:id`. Loads `GET /deals/{id}`, `GET /deals/{id}/forecast`, `GET /deals/{id}/notes`, `GET /offers` filtered by deal.

### 4a · Header

- [ ] Deal name, account name, channel badge
- [ ] Stage badge + "Advance stage" button → shows only valid next stages for channel (uses `nextStages()`); calls `PATCH /deals/{id}/stage`
- [ ] Expected close date
- [ ] Stale badge (amber) / Overdue badge (red)
- [ ] **3yr total opportunity**: `total_device_value + total_service_value` from deal — show device (€) and service (€) separately, then combined

### 4b · 12-month forecast grid

- [ ] Editable table with columns: Month, Device Units, Unit Price (€), Device Revenue (auto-calc: units × price, live), Service Revenue (€)
- [ ] Auto-calculate device revenue client-side as user types (units × unit price)
- [ ] Totals row at bottom for each column
- [ ] Load existing rows from `GET /deals/{id}/forecast`; pre-fill grid
- [ ] "Save forecast" button → `POST /deals/{id}/forecast` with all rows; only fires on explicit click
- [ ] After save: refresh deal header to show updated totals

### 4c · Offers section

- [ ] List offers linked to this deal from `GET /offers` (filter by `deal_id`)
- [ ] Per offer: version badge (v1, v2…), status badge (color-coded), device total, service total, created date, action button
- [ ] "New offer" button → opens offer builder
- [ ] "View offer" link per row → opens offer detail

### 4d · Notes thread

- [ ] Load `GET /deals/{id}/notes`, display newest first
- [ ] Per note: author name, timestamp, note_type badge, body
- [ ] Add note form at top: textarea + note_type picker (General / Internal) + Post button → `POST /deals/{id}/notes`

---

## 5 · Pipeline view `src/features/deals/Pipeline.jsx`

> Route: `/pipeline`. Accessible from nav. Uses `GET /deals`.

- [ ] Choose: **Kanban board** (columns = stages) OR **sortable list** — pick based on time
- [ ] Per card/row: deal name, account, value (device + service), channel badge, stale/overdue badges
- [ ] Filter bar:
  - Channel: All / Direct / Reseller
  - Stage: All + each stage name
  - Stale only toggle
- [ ] Clicking a card → navigates to deal detail

---

## 6 · Offer builder `src/features/offers/OfferBuilder.jsx`

> Opened from deal detail. Calls `POST /offers` then `POST /offers/{id}/lines` per item, then `POST /offers/{id}/submit`.

- [ ] Load catalog from `GET /catalog`
- [ ] Searchable catalog item picker → adds row to line items table
- [ ] Per line: item name, unit price (read-only snapshot), quantity (input), discount % (input), line total (auto-calc: unit_price × qty × (1 - discount/100), live)
- [ ] Remove line button per row
- [ ] Offer subtotal shown below table (sum of line totals, live)
- [ ] Justification textarea — required if ANY line has discount > 0; enforce client-side before allowing submit
- [ ] "Submit offer" button:
  1. `POST /offers` → get offer id
  2. `POST /offers/{id}/lines` for each line
  3. `POST /offers/{id}/submit` with `{ discount_pct, discount_justification }`
- [ ] After submit: redirect to offer detail view

---

## 7 · Offer detail `src/features/offers/OfferDetail.jsx`

> Route: `/offers/:id`. Loads `GET /offers/{id}` and `GET /offers/{id}/lines`.

- [ ] Status banner at top:
  - `draft` → grey "Draft"
  - `pending_sm` → blue "Awaiting SM approval" + submitted timestamp
  - `pending_finance` → blue "Awaiting Finance approval" + SM approved timestamp
  - `locked` → green "Approved & Locked" banner — entire view read-only
  - `rejected` → amber/red inline callout showing rejection reason (not a modal)
- [ ] Version shown in header (e.g. "Offer v2")
- [ ] Line items table (read-only): item name, qty, unit price, discount %, line total
- [ ] Offer subtotal, discount amount, total value
- [ ] Discount justification shown if present
- [ ] **"Create new version"** button on `locked` or `rejected` offers → `POST /offers` with same account/deal, pre-fills lines from current offer, version = current + 1
- [ ] Resubmit flow on `rejected`: allow editing justification → `POST /offers/{id}/submit`

---

## 8 · P1 stretch — Notifications dot

- [ ] Poll `GET /notifications` every 30s (or on page focus)
- [ ] Show red dot on nav bell icon when unread count > 0
- [ ] Clicking opens a dropdown list of notifications
- [ ] Clicking a notification → `PATCH /notifications/{id}/read` + navigate to relevant offer/deal

---

## API quick reference

| Action | Call |
|--------|------|
| All deals | `GET /deals` |
| Deal detail | `GET /deals/{id}` |
| Create deal | `POST /deals` `{ account_id, name, channel, stage, expected_close_date, is_pilot, parent_deal_id }` |
| Advance stage | `PATCH /deals/{id}/stage` `{ stage, lost_reason? }` |
| Get forecast | `GET /deals/{id}/forecast` |
| Save forecast | `POST /deals/{id}/forecast` `[{ year, month, device_units, device_revenue, service_revenue }]` |
| Get notes | `GET /deals/{id}/notes` |
| Add note | `POST /deals/{id}/notes` `{ body, note_type }` |
| All offers | `GET /offers` |
| Create offer | `POST /offers` `{ account_id, deal_id, currency }` |
| Add line | `POST /offers/{id}/lines` `{ catalog_item_id, quantity, discount_pct }` |
| Submit offer | `POST /offers/{id}/submit` `{ discount_pct, discount_justification? }` |
| Offer lines | `GET /offers/{id}/lines` |
| Catalog | `GET /catalog` |
| Notifications | `GET /notifications` |
| Mark read | `PATCH /notifications/{id}/read` |

All requests need header: `X-User-ID: {current user id from localStorage}`

---

## Suggested build order

1. `src/lib/api.js` + `src/lib/stages.js` + `src/lib/badges.js`
2. Rep dashboard (gives you working data fetch pattern to copy)
3. Deal detail skeleton + forecast grid (biggest piece, start early)
4. Offer builder (depends on deal detail being up)
5. Offer detail status view
6. Pipeline view
7. Deal creation form
8. Notification dot (if time)
