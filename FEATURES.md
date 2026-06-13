# Feature Tracker

## Summary

| # | Feature | Owner | Backend | Frontend | Done |
|---|---------|-------|---------|----------|------|
| 1 | Account & contact management | P2 | ✅ | 🚧 | ⬜ |
| 2 | Case management | P2 | ✅ | 🚧 | ⬜ |
| 3 | Deal pipeline + stages | P3 | ✅ | ⬜ | ⬜ |
| 4 | Offer creation + storage | P3 | ✅ | ⬜ | ⬜ |
| 5 | Offer approval workflow | P3 + P4 | ✅ | ⬜ | ⬜ |
| 6 | Product + pricing catalog | P4 | ✅ | ⬜ | ⬜ |
| 7 | Service catalog | P2 | ✅ | ⬜ | ⬜ |
| 8 | Role-based access | P4 | ⬜ | ⬜ | ⬜ |
| 9 | Personal dashboard (per role) | P2 + P3 + P4 | — | ⬜ | ⬜ |
| 10 | Case & deal notes | P2 + P3 | ✅ | 🚧 | ⬜ |

**Legend:** ✅ done · ⬜ not started · 🚧 in progress · — not applicable

---

## P1 — Backend / Data (you)

Backend is the shared foundation. All routes are live at `http://localhost:8000/docs`.

- [x] SQLAlchemy models (`SQL.py`) — shared contract for the whole team
- [x] Database init + seed script (`database.py`, `seed.py`)
- [x] All CRUD routes wired in `main.py`
- [x] Offer approval state machine (backend logic)
- [x] Deal stage validation per channel (direct / reseller)
- [x] Forecast upsert with auto-recalc of deal totals
- [x] Activity timeline written on all mutations
- [ ] Role guard middleware (coordinate with P4 when auth is ready)

---

## P2 — Account & Case views

**Routes to consume:** `GET /accounts`, `GET /accounts/{id}`, `GET /accounts/{id}/contacts`, `GET /accounts/{id}/cases`, `GET /accounts/{id}/timeline`, `GET /accounts/{id}/notes`, `GET /cases`, `GET /cases/{id}`, `POST /cases`, `PATCH /cases/{id}`, `GET/POST /cases/{id}/notes`

### 1 · Account & contact management
> Accounts hold contacts, deals, cases, activity timeline.

- [x] Account list page (name, status, region, owner)
- [x] Account detail page — tabbed: Overview / Deals / Cases / Timeline / Notes
- [x] Contacts list on account detail
- [ ] Add contact form

### 2 · Case management
> Status, priority, linked service, threaded notes.

- [x] Case list (sorted by priority + age)
- [ ] TAM dashboard: all assigned cases, sorted by priority + age
- [ ] Create case form (subject, description, priority, contact, service)
- [x] Case detail: status badge, priority, escalation flag
- [x] Update case status (PATCH `/cases/{id}`)
- [x] Threaded notes on case detail

### 7 · Service catalog (read-only, cases)
> Cases link to a service.

- [ ] Service dropdown in create-case form (populated from `GET /catalog` filtered to `item_type=service`)

### 9 · TAM dashboard
> TAM lands on their open cases sorted by priority + age.

- [ ] Default view for role `tam`: assigned cases, open/escalated first
- [x] Case age indicator (days since opened)

### 10 · Case & deal notes (case side)
> Timestamped, visible to everyone with access.

- [x] Note thread on case detail (timestamp)
- [x] Add note form (body)
- [ ] note_type badge + picker

---

## P3 — Deal Pipeline & Offer flow

**Routes to consume:** `GET /deals`, `GET /deals/{id}`, `POST /deals`, `PATCH /deals/{id}/stage`, `GET/POST /deals/{id}/forecast`, `GET/POST /deals/{id}/notes`, `GET /offers`, `POST /offers`, `POST /offers/{id}/lines`, `POST /offers/{id}/submit`, `POST /offers/{id}/approve`, `POST /offers/{id}/reject`

### 3 · Deal pipeline + stages
> HMD stages. Direct/reseller flag. 3-yr time-phased forecast.

- [ ] Deal creation form (account, name, channel, stage, expected close date, pilot flag)
- [ ] Pipeline board or list view — columns/rows by stage
- [ ] Stage picker — only shows valid stages for the deal's channel
- [ ] Stale deal indicator — badge when `updated_at` is 14+ days ago
- [ ] 12-month forecast grid (month-by-month: device units, device revenue, service revenue)
- [ ] Deal totals display (`total_device_value`, `total_service_value`)

### 4 · Offer creation + storage
> Build from catalog. Versioned. Stored on account.

- [ ] Offer builder: pick catalog items, set quantity + per-line discount
- [ ] Line total + offer subtotal calculated client-side (mirrors backend)
- [ ] Offer list on account detail (version, status, total)

### 5 · Offer approval workflow (rep side)
> Discounts → SM then Finance. Justification required. Locked.

- [ ] Submit offer form — discount %, justification (required if discount > 0)
- [ ] Offer status shown to rep (draft / pending SM / pending Finance / locked / rejected)
- [ ] Rejection reason displayed when status = rejected

### 9 · Rep dashboard
> Rep lands on their accounts + deal status.

- [ ] Default view for role `rep`: their accounts list + active deals with stage badges

### 10 · Deal notes
> Timestamped, visible to everyone with access.

- [ ] Note thread on deal detail
- [ ] Add note form

---

## P4 — Catalog, Finance view, Auth & Roles

**Routes to consume:** `GET /catalog`, `POST /catalog`, `PATCH /catalog/{id}/retire`, `GET /offers`, `POST /offers/{id}/approve`, `POST /offers/{id}/reject`, `GET /notifications`, `PATCH /notifications/{id}/read`

### 5 · Offer approval workflow (SM + Finance side)
> SM approves first, then Finance.

- [ ] SM approval screen: offer summary + line items, approve / reject with reason
- [ ] Finance approval screen: same layout, final approve / reject
- [ ] Notification badge in nav (unread count from `GET /notifications?user_id=`)
- [ ] Mark notification as read on open

### 6 · Product + pricing catalog
> Finance-managed. Add/update/retire without a developer.

- [ ] Catalog list page (name, SKU, type, unit price, status)
- [ ] Add catalog item form (Finance role only)
- [ ] Edit catalog item (price / description updates)
- [ ] Retire item (`PATCH /catalog/{id}/retire`) — soft delete, not shown to reps

### 8 · Role-based access
> Rep / TAM / SM / Finance. Each lands on the right default view on login.
> **Auth approach: fake auth (no Azure AD).** User switcher dropdown in the nav lets you pick any seeded user. Selected user stored in `localStorage`, sent as `X-User-ID` header on every request. Backend reads the header to identify the current user and enforce role checks.

- [x] User switcher dropdown in nav (lists all users from `GET /users`, shows name + role)
- [x] Store selected `user_id` in `localStorage` on pick
- [x] Attach `X-User-ID` header to every API call (set in a central API client/fetch wrapper)
- [x] On app load, read `localStorage` → redirect to role default view
- [x] Route guard — redirect unauthenticated users to the user picker
- [x] API middleware — role check on write routes (catalog write: finance only, offer approval: sm/finance only)

### 9 · Finance + Manager dashboards
> Weighted pipeline, time-phased forecast, team pipeline.

- [ ] Finance dashboard: weighted pipeline (value × win_probability), forecast by quarter (3 yr), filter by stage/period
- [ ] Manager (SM) dashboard: full team pipeline, overdue deals, quarter forecast (committed / at-risk / gap)
