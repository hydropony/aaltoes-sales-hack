from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db, create_db
from SQL import (
    User, Account, Contact, CatalogItem, Service,
    Deal, DealForecastMonth, Case, Note, Offer, OfferLineItem,
    ActivityTimeline, Notification,
    OFFER_TRANSITIONS, valid_stages_for_channel,
)


# ── Startup ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    yield

app = FastAPI(title="HMD Secure CRM", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORM):
    id: int
    email: str
    full_name: str
    role: str


class ContactOut(ORM):
    id: int
    account_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    is_primary: bool

class ContactIn(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    is_primary: bool = False


class AccountOut(ORM):
    id: int
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    channel: Optional[str] = None
    status: str
    owner_id: Optional[int] = None
    tam_id: Optional[int] = None

class AccountIn(BaseModel):
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    channel: str = "direct"
    status: str = "prospect"
    owner_id: Optional[int] = None
    tam_id: Optional[int] = None


class ForecastMonthOut(ORM):
    id: int
    deal_id: int
    year: int
    month: int
    device_units: int
    device_revenue: float
    service_revenue: float

class ForecastMonthIn(BaseModel):
    year: int
    month: int
    device_units: int = 0
    device_revenue: float = 0.0
    service_revenue: float = 0.0


class DealOut(ORM):
    id: int
    account_id: int
    owner_id: int
    name: str
    channel: str
    stage: str
    win_probability: Optional[float] = None
    expected_close_date: Optional[date] = None
    total_device_value: float
    total_service_value: float
    is_pilot: bool
    created_at: datetime
    updated_at: datetime

class DealIn(BaseModel):
    account_id: int
    name: str
    channel: str = "direct"
    stage: str = "interest_shown"
    expected_close_date: Optional[date] = None
    is_pilot: bool = False
    parent_deal_id: Optional[int] = None

class StageUpdate(BaseModel):
    stage: str
    lost_reason: Optional[str] = None


class NoteOut(ORM):
    id: int
    entity_type: str
    entity_id: int
    author_id: int
    body: str
    note_type: str
    created_at: datetime

class NoteIn(BaseModel):
    body: str
    note_type: str = "general"


class CaseOut(ORM):
    id: int
    account_id: int
    account_name: Optional[str] = None
    tam_id: Optional[int] = None
    subject: str
    description: Optional[str] = None
    status: str
    priority: str
    is_escalated_to_third_party: bool
    third_party_ref: Optional[str] = None
    customer_contact_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

class CaseIn(BaseModel):
    account_id: int
    tam_id: Optional[int] = None
    service_id: Optional[int] = None
    subject: str
    description: Optional[str] = None
    priority: str = "medium"
    customer_contact_id: Optional[int] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    tam_id: Optional[int] = None
    is_escalated_to_third_party: Optional[bool] = None
    third_party_ref: Optional[str] = None


class CatalogItemOut(ORM):
    id: int
    name: str
    sku: str
    item_type: str
    description: Optional[str] = None
    unit_price: float
    currency: str
    invoicing_model: Optional[str] = None
    term_years: Optional[int] = None
    is_active: bool

class CatalogItemIn(BaseModel):
    name: str
    sku: str
    item_type: str
    description: Optional[str] = None
    unit_price: float
    currency: str = "EUR"
    invoicing_model: Optional[str] = None
    term_years: Optional[int] = None

class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    invoicing_model: Optional[str] = None
    term_years: Optional[int] = None


class OfferLineItemOut(ORM):
    id: int
    catalog_item_id: int
    quantity: int
    unit_price: float
    discount_pct: float
    line_total: float

class OfferLineItemIn(BaseModel):
    catalog_item_id: int
    quantity: int
    discount_pct: float = 0.0


class OfferOut(ORM):
    id: int
    account_id: int
    account_name: Optional[str] = None
    deal_id: Optional[int] = None
    deal_name: Optional[str] = None
    created_by: int
    version: int
    status: str
    currency: str
    subtotal: float
    discount_pct: float
    discount_amount: float
    total_value: float
    discount_justification: Optional[str] = None
    sm_approver_id: Optional[int] = None
    sm_approved_at: Optional[datetime] = None
    finance_approver_id: Optional[int] = None
    finance_approved_at: Optional[datetime] = None
    rejected_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

class OfferIn(BaseModel):
    account_id: int
    deal_id: Optional[int] = None
    currency: str = "EUR"
    discount_justification: Optional[str] = None

class OfferSubmit(BaseModel):
    discount_pct: float = 0.0
    discount_justification: Optional[str] = None

class OfferReject(BaseModel):
    reason: str


class TimelineEventOut(ORM):
    id: int
    account_id: int
    entity_type: str
    entity_id: int
    actor_id: Optional[int] = None
    event_type: str
    summary: str
    created_at: datetime


class NotificationOut(ORM):
    id: int
    user_id: int
    title: str
    body: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _recalc_offer(offer: Offer, db: Session):
    subtotal = sum(li.line_total for li in offer.line_items)
    discount_amount = round(subtotal * offer.discount_pct / 100, 2)
    offer.subtotal = subtotal
    offer.discount_amount = discount_amount
    offer.total_value = round(subtotal - discount_amount, 2)


def _recalc_deal_totals(deal: Deal, db: Session):
    rows = db.query(DealForecastMonth).filter_by(deal_id=deal.id).all()
    deal.total_device_value = sum(r.device_revenue for r in rows)
    deal.total_service_value = sum(r.service_revenue for r in rows)


def _timeline(db, account_id, entity_type, entity_id, actor_id, event_type, summary, extra=None):
    db.add(ActivityTimeline(
        account_id=account_id, entity_type=entity_type, entity_id=entity_id,
        actor_id=actor_id, event_type=event_type, summary=summary, extra=extra,
    ))


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_current_user(x_user_id: int = Header(...), db: Session = Depends(get_db)) -> User:
    """Read X-User-ID header and return the matching user. 401 if missing or invalid."""
    user = db.get(User, x_user_id)
    if not user:
        raise HTTPException(401, "Invalid X-User-ID")
    return user


def require_role(*roles: str):
    """Return a dependency that enforces the current user has one of the given roles."""
    def guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return current_user
    return guard


@app.get("/auth/users", response_model=list[UserOut])
def auth_users(db: Session = Depends(get_db)):
    """List all active users — used by the frontend user-switcher dropdown."""
    return db.query(User).filter_by(is_active=True).all()


@app.get("/auth/me", response_model=UserOut)
def auth_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user


# ── Users ─────────────────────────────────────────────────────────────────────

@app.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ── Accounts ──────────────────────────────────────────────────────────────────

@app.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()

@app.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    return account

@app.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(body: AccountIn, db: Session = Depends(get_db)):
    account = Account(**body.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

@app.get("/accounts/{account_id}/contacts", response_model=list[ContactOut])
def list_contacts(account_id: int, db: Session = Depends(get_db)):
    return db.query(Contact).filter_by(account_id=account_id).all()

@app.post("/accounts/{account_id}/contacts", response_model=ContactOut, status_code=201)
def create_contact(account_id: int, body: ContactIn, db: Session = Depends(get_db)):
    contact = Contact(account_id=account_id, **body.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@app.get("/accounts/{account_id}/deals", response_model=list[DealOut])
def account_deals(account_id: int, db: Session = Depends(get_db)):
    return db.query(Deal).filter_by(account_id=account_id).all()

@app.get("/accounts/{account_id}/cases", response_model=list[CaseOut])
def account_cases(account_id: int, db: Session = Depends(get_db)):
    return db.query(Case).filter_by(account_id=account_id).all()

@app.get("/accounts/{account_id}/timeline", response_model=list[TimelineEventOut])
def account_timeline(account_id: int, db: Session = Depends(get_db)):
    return (db.query(ActivityTimeline)
              .filter_by(account_id=account_id)
              .order_by(ActivityTimeline.created_at.desc())
              .all())

@app.get("/accounts/{account_id}/notes", response_model=list[NoteOut])
def account_notes(account_id: int, db: Session = Depends(get_db)):
    return (db.query(Note)
              .filter_by(entity_type="account", entity_id=account_id)
              .order_by(Note.created_at.desc())
              .all())

@app.post("/accounts/{account_id}/notes", response_model=NoteOut, status_code=201)
def add_account_note(account_id: int, body: NoteIn, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    note = Note(entity_type="account", entity_id=account_id,
                author_id=current_user.id, **body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


# ── Deals ─────────────────────────────────────────────────────────────────────

@app.get("/deals", response_model=list[DealOut])
def list_deals(db: Session = Depends(get_db)):
    return db.query(Deal).all()

@app.get("/deals/{deal_id}", response_model=DealOut)
def get_deal(deal_id: int, db: Session = Depends(get_db)):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(404, "Deal not found")
    return deal

@app.post("/deals", response_model=DealOut, status_code=201)
def create_deal(body: DealIn, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    valid = valid_stages_for_channel(body.channel)
    if body.stage not in valid:
        raise HTTPException(400, f"Stage '{body.stage}' invalid for channel '{body.channel}'")
    deal = Deal(owner_id=current_user.id, **body.model_dump())
    db.add(deal)
    db.flush()
    _timeline(db, deal.account_id, "deal", deal.id, current_user.id,
              "deal_created", f"Deal '{deal.name}' created")
    db.commit()
    db.refresh(deal)
    return deal

@app.patch("/deals/{deal_id}/stage", response_model=DealOut)
def update_stage(deal_id: int, body: StageUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(404, "Deal not found")
    valid = valid_stages_for_channel(deal.channel)
    if body.stage not in valid:
        raise HTTPException(400, f"Stage '{body.stage}' invalid for channel '{deal.channel}'")
    old_stage = deal.stage
    deal.stage = body.stage
    deal.last_updated_by = current_user.id
    if body.stage == "lost":
        deal.lost_reason = body.lost_reason
    _timeline(db, deal.account_id, "deal", deal.id, current_user.id,
              f"deal_{body.stage}" if body.stage in ("won", "lost") else "deal_stage_changed",
              f"Stage changed: {old_stage} → {body.stage}",
              extra={"old_stage": old_stage, "new_stage": body.stage})
    db.commit()
    db.refresh(deal)
    return deal

@app.get("/deals/{deal_id}/forecast", response_model=list[ForecastMonthOut])
def get_forecast(deal_id: int, db: Session = Depends(get_db)):
    return (db.query(DealForecastMonth)
              .filter_by(deal_id=deal_id)
              .order_by(DealForecastMonth.year, DealForecastMonth.month)
              .all())

@app.post("/deals/{deal_id}/forecast", response_model=list[ForecastMonthOut])
def upsert_forecast(deal_id: int, rows: list[ForecastMonthIn], db: Session = Depends(get_db)):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(404, "Deal not found")
    for r in rows:
        existing = (db.query(DealForecastMonth)
                      .filter_by(deal_id=deal_id, year=r.year, month=r.month)
                      .first())
        if existing:
            existing.device_units    = r.device_units
            existing.device_revenue  = r.device_revenue
            existing.service_revenue = r.service_revenue
        else:
            db.add(DealForecastMonth(deal_id=deal_id, **r.model_dump()))
    db.flush()
    _recalc_deal_totals(deal, db)
    db.commit()
    return (db.query(DealForecastMonth)
              .filter_by(deal_id=deal_id)
              .order_by(DealForecastMonth.year, DealForecastMonth.month)
              .all())

@app.get("/deals/{deal_id}/notes", response_model=list[NoteOut])
def deal_notes(deal_id: int, db: Session = Depends(get_db)):
    return (db.query(Note)
              .filter_by(entity_type="deal", entity_id=deal_id)
              .order_by(Note.created_at.desc())
              .all())

@app.post("/deals/{deal_id}/notes", response_model=NoteOut, status_code=201)
def add_deal_note(deal_id: int, body: NoteIn, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    note = Note(entity_type="deal", entity_id=deal_id,
                author_id=current_user.id, **body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


# ── Cases ─────────────────────────────────────────────────────────────────────

def _case_out(case: Case) -> CaseOut:
    out = CaseOut.model_validate(case)
    out.account_name = case.account.name if case.account else None
    return out

@app.get("/cases", response_model=list[CaseOut])
def list_cases(db: Session = Depends(get_db)):
    return [_case_out(c) for c in db.query(Case).all()]

@app.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return _case_out(case)

@app.post("/cases", response_model=CaseOut, status_code=201)
def create_case(body: CaseIn, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    case = Case(created_by=current_user.id, **body.model_dump())
    db.add(case)
    db.flush()
    _timeline(db, case.account_id, "case", case.id, current_user.id,
              "case_opened", f"Case opened: {case.subject}")
    db.commit()
    db.refresh(case)
    return case

@app.patch("/cases/{case_id}", response_model=CaseOut)
def update_case(case_id: int, body: CaseUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    if body.status in ("resolved", "closed") and not case.resolved_at:
        case.resolved_at = datetime.utcnow()
        _timeline(db, case.account_id, "case", case.id, current_user.id,
                  f"case_{body.status}", f"Case {body.status}: {case.subject}")
    db.commit()
    db.refresh(case)
    return case

@app.get("/cases/{case_id}/notes", response_model=list[NoteOut])
def case_notes(case_id: int, db: Session = Depends(get_db)):
    return (db.query(Note)
              .filter_by(entity_type="case", entity_id=case_id)
              .order_by(Note.created_at.desc())
              .all())

@app.post("/cases/{case_id}/notes", response_model=NoteOut, status_code=201)
def add_case_note(case_id: int, body: NoteIn, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    note = Note(entity_type="case", entity_id=case_id,
                author_id=current_user.id, **body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


# ── Catalog ───────────────────────────────────────────────────────────────────

@app.get("/catalog", response_model=list[CatalogItemOut])
def list_catalog(db: Session = Depends(get_db)):
    return db.query(CatalogItem).filter_by(is_active=True).all()

@app.get("/catalog/{item_id}", response_model=CatalogItemOut)
def get_catalog_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(CatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found")
    return item

@app.post("/catalog", response_model=CatalogItemOut, status_code=201)
def create_catalog_item(body: CatalogItemIn, db: Session = Depends(get_db),
                         current_user: User = Depends(require_role("finance"))):
    item = CatalogItem(created_by=current_user.id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.patch("/catalog/{item_id}", response_model=CatalogItemOut)
def update_catalog_item(item_id: int, body: CatalogItemUpdate, db: Session = Depends(get_db),
                         current_user: User = Depends(require_role("finance"))):
    item = db.get(CatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item

@app.patch("/catalog/{item_id}/retire", response_model=CatalogItemOut)
def retire_catalog_item(item_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(require_role("finance"))):
    item = db.get(CatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found")
    item.is_active = False
    db.commit()
    db.refresh(item)
    return item


# ── Offers ────────────────────────────────────────────────────────────────────

def _offer_out(offer: Offer) -> OfferOut:
    out = OfferOut.model_validate(offer)
    out.account_name = offer.account.name if offer.account else None
    out.deal_name = offer.deal.name if offer.deal else None
    return out

@app.get("/offers", response_model=list[OfferOut])
def list_offers(db: Session = Depends(get_db)):
    return [_offer_out(o) for o in db.query(Offer).all()]

@app.get("/offers/{offer_id}", response_model=OfferOut)
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    return _offer_out(offer)

@app.get("/offers/{offer_id}/lines", response_model=list[OfferLineItemOut])
def get_offer_lines(offer_id: int, db: Session = Depends(get_db)):
    return db.query(OfferLineItem).filter_by(offer_id=offer_id).all()

@app.post("/offers", response_model=OfferOut, status_code=201)
def create_offer(body: OfferIn, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    offer = Offer(created_by=current_user.id, **body.model_dump())
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer

@app.post("/offers/{offer_id}/lines", response_model=OfferLineItemOut, status_code=201)
def add_offer_line(offer_id: int, body: OfferLineItemIn, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    if offer.status != "draft":
        raise HTTPException(400, "Cannot modify a non-draft offer")
    item = db.get(CatalogItem, body.catalog_item_id)
    if not item:
        raise HTTPException(404, "Catalog item not found")
    line_total = round(item.unit_price * body.quantity * (1 - body.discount_pct / 100), 2)
    line = OfferLineItem(
        offer_id=offer_id, catalog_item_id=body.catalog_item_id,
        quantity=body.quantity, unit_price=item.unit_price,
        discount_pct=body.discount_pct, line_total=line_total,
    )
    db.add(line)
    db.flush()
    _recalc_offer(offer, db)
    db.commit()
    db.refresh(line)
    return line

@app.post("/offers/{offer_id}/submit", response_model=OfferOut)
def submit_offer(offer_id: int, body: OfferSubmit, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    if offer.status != "draft":
        raise HTTPException(400, f"Cannot submit offer in status '{offer.status}'")
    offer.discount_pct           = body.discount_pct
    offer.discount_justification = body.discount_justification
    _recalc_offer(offer, db)
    if body.discount_pct > 0:
        if not body.discount_justification:
            raise HTTPException(400, "discount_justification required when discount_pct > 0")
        offer.status = "pending_sm"
    else:
        offer.status    = "locked"
        offer.locked_at = datetime.utcnow()
    _timeline(db, offer.account_id, "offer", offer.id, current_user.id,
              "offer_submitted", f"Offer v{offer.version} submitted ({offer.status})")
    db.commit()
    db.refresh(offer)
    return offer

@app.post("/offers/{offer_id}/approve", response_model=OfferOut)
def approve_offer(offer_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role("sm", "finance"))):
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    if offer.status == "pending_sm":
        offer.status         = "pending_finance"
        offer.sm_approver_id = current_user.id
        offer.sm_approved_at = datetime.utcnow()
        summary = f"Offer v{offer.version} approved by SM — sent to Finance"
    elif offer.status == "pending_finance":
        offer.status              = "locked"
        offer.finance_approver_id = current_user.id
        offer.finance_approved_at = datetime.utcnow()
        offer.locked_at           = datetime.utcnow()
        summary = f"Offer v{offer.version} approved by Finance — locked"
    else:
        raise HTTPException(400, f"Offer in status '{offer.status}' cannot be approved")
    _timeline(db, offer.account_id, "offer", offer.id, current_user.id,
              "offer_approved", summary)
    db.commit()
    db.refresh(offer)
    return offer

@app.post("/offers/{offer_id}/reject", response_model=OfferOut)
def reject_offer(offer_id: int, body: OfferReject, db: Session = Depends(get_db),
                 current_user: User = Depends(require_role("sm", "finance"))):
    offer = db.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Offer not found")
    if offer.status not in ("pending_sm", "pending_finance"):
        raise HTTPException(400, f"Offer in status '{offer.status}' cannot be rejected")
    offer.status           = "rejected"
    offer.rejected_by      = current_user.id
    offer.rejection_reason = body.reason
    offer.rejected_at      = datetime.utcnow()
    _timeline(db, offer.account_id, "offer", offer.id, current_user.id,
              "offer_rejected", f"Offer v{offer.version} rejected: {body.reason}")
    db.commit()
    db.refresh(offer)
    return offer


# ── Notifications ─────────────────────────────────────────────────────────────

@app.get("/notifications", response_model=list[NotificationOut])
def get_notifications(db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    return (db.query(Notification)
              .filter_by(user_id=current_user.id, is_read=False)
              .order_by(Notification.created_at.desc())
              .all())

@app.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    n = db.get(Notification, notification_id)
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n
