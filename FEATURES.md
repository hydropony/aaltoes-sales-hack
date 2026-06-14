# Feature Tracker

## Summary

| # | Feature | Owner | Backend | Frontend | Done |
|---|---------|-------|---------|----------|------|
| 1 | Account & contact management | P2 | ✅ | ✅ | ✅ |
| 2 | Case management | P2 | ✅ | ✅ | ✅ |
| 3 | Deal pipeline + stages | P3 | ✅ | ✅ | ✅ |
| 4 | Offer creation + storage | P3 | ✅ | ✅ | ✅ |
| 5 | Offer approval workflow | P3 + P4 | ✅ | ✅ | ✅ |
| 6 | Product + pricing catalog | P4 | ✅ | ✅ | ✅ |
| 7 | Service catalog | P2 | ✅ | ✅ | ✅ |
| 8 | Role-based access | P4 | ✅ | ✅ | ✅ |
| 9 | Personal dashboard (per role) | P2 + P3 + P4 | — | ✅ | ✅ |
| 10 | Case & deal notes | P2 + P3 | ✅ | ✅ | ✅ |

**Legend:** ✅ done · ⬜ not started · 🚧 in progress · — not applicable

---

## P1 — Backend / Data (you)

- [x] SQLAlchemy models (`SQL.py`) — shared contract for the whole team
- [x] Database init + seed script (`database.py`, `seed.py`)
- [x] All CRUD routes wired in `main.py`
- [x] Offer approval state machine (backend logic)
- [x] Deal stage validation per channel (direct / reseller)
- [x] Forecast upsert with auto-recalc of deal totals
- [x] Activity timeline written on all mutations
- [x] Role guard middleware (require_role on catalog write + offer approve/reject)
- [x] `PATCH /catalog/{id}` — edit catalog item price/description

---

## P2 — Account & Case views

### 1 · Account & contact management ✅
- [x] Account list page (name, status, region, owner)
- [x] Create account form
- [x] Account detail page — tabbed: Overview / Contacts / Deals / Cases / Timeline / Notes
- [x] Contacts list on account detail
- [x] Add contact form
- [x] Timeline tab: role-based grouping (TAM→by case, SM→by deal, others→flat), full date+time

### 2 · Case management ✅
- [x] Case list (sorted by priority + age, company column, colored status badges, critical priority highlighted)
- [x] TAM dashboard: assigned cases sorted by priority + age, open/escalated first
- [x] Create case form (subject, description, priority, contact, service)
- [x] Case detail: status badge, priority, escalation flag
- [x] Update case status (PATCH `/cases/{id}`)
- [x] Threaded notes on case detail

### 7 · Service catalog (read-only, cases) ✅
- [x] Service dropdown in create-case form (populated from `GET /catalog`, `item_type=service`)

### 9 · TAM dashboard ✅
- [x] Default view for role `tam`: assigned cases, open/escalated first, age indicator

### 10 · Case & deal notes (case side) ✅
- [x] Note thread on case detail (timestamp)
- [x] Add note form, note_type badge + picker

---

## P3 — Deal Pipeline & Offer flow

### 3 · Deal pipeline + stages ✅
- [x] Deal creation form (account, name, channel, stage, expected close date)
- [x] Pipeline board — kanban columns by stage, channel + stale filters
- [x] Stage picker — only shows valid next stages for the deal's channel
- [x] Stale deal indicator + overdue badge
- [x] 12-month forecast grid (device units, unit price, device revenue, service revenue)
- [x] Deal totals display (`total_device_value`, `total_service_value`)

### 4 · Offer creation + storage 🚧
- [x] Offer builder: pick catalog items, set quantity + per-line discount
- [x] Line total + offer subtotal calculated client-side
- [x] Offer list page (wired to real API, role-aware approval queue banner)
- [x] Offers tab on account detail — deal, version, total, status, created, View button

### 5 · Offer approval workflow ✅
- [x] Submit offer form — discount %, justification required if discount > 0
- [x] Offer status shown to rep (draft / pending SM / pending Finance / locked / rejected)
- [x] Rejection reason displayed when status = rejected
- [x] SM approval screen in OfferDetail: review + approve / reject with reason
- [x] Finance approval screen in OfferDetail: same flow, final decision
- [x] Notification bell in nav (unread count, polling every 30s, mark as read on click)

### 9 · Rep dashboard ✅
- [x] Default view for role `rep`: accounts grid (open deal count + highest stage) + active deals table

### 10 · Deal notes ✅
- [x] Note thread on deal detail
- [x] Add note form

---

## P4 — Catalog, Finance view, Auth & Roles

### 5 · Offer approval workflow (SM + Finance side) ✅
- [x] Approve / reject buttons in OfferDetail (visible to correct role based on offer status)
- [x] Notification bell in nav — unread badge, dropdown panel, mark as read

### 6 · Product + pricing catalog 🚧
- [x] Catalog list page (name, SKU, type, unit price, invoicing model)
- [x] Add catalog item form (Finance role only)
- [x] Backend `PATCH /catalog/{id}` for price/description edits
- [x] Edit catalog item in UI — inline edit row (name, price, description, invoicing, term)
- [x] Retire item — soft delete, removed from active list

### 8 · Role-based access ✅
- [x] User switcher dropdown (lists all seeded users with name + role)
- [x] `X-User-ID` header on every API call, stored in `localStorage`
- [x] Redirect to role-default view on login and app load
- [x] Route guard — unauthenticated users → user picker
- [x] API role guards (catalog write: finance only; offer approve/reject: sm/finance only)

### 9 · Finance + SM dashboards ✅
- [x] Finance dashboard: weighted pipeline (value × win_probability), forecast summary, offer queue
- [x] SM dashboard: full team pipeline, overdue/stale deals, quarter forecast
