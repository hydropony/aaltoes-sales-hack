"""
models.py — HMD Secure CRM · SQLAlchemy ORM Models
═══════════════════════════════════════════════════════════════════════════════
THIS FILE IS THE SHARED CONTRACT.
Person 1 owns edits. Everyone else imports from here.
Do NOT modify without team agreement.

Table map
───────────────────────────────────────────────────────────────────────────────
users                 auth, role, manager hierarchy
accounts              top-level customer record
contacts              people at an account
catalog_items         product + pricing catalog  (Finance-managed)
services              service catalog for case-linking (internal / 3rd-party)
deals                 sales opportunities
deal_forecast_months  36-month rolling revenue forecast per deal
cases                 service / support cases
notes                 timestamped notes — polymorphic on (entity_type, entity_id)
offers                versioned commercial offers built from catalog lines
offer_line_items      lines within an offer
activity_timeline     append-only per-account event log
notifications         in-app notifications per user
"""

from __future__ import annotations
import enum

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Index, Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


# ──────────────────────────────────────────────────────────────────────────────
# Base
# ──────────────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Enumerations  (str mixin → JSON-serialisable everywhere)
# ──────────────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    REP     = "rep"
    TAM     = "tam"
    SM      = "sm"
    FINANCE = "finance"


class AccountStatus(str, enum.Enum):
    ACTIVE   = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"


class DealStage(str, enum.Enum):
    INTEREST_SHOWN       = "interest_shown"
    RFI_ANSWERED         = "rfi_answered"
    RFP_OFFER_GIVEN      = "rfp_offer_given"
    CUSTOMER_TEST        = "customer_test"
    CONTRACT_NEGOTIATION = "contract_negotiation"   # DIRECT channel only
    WON                  = "won"
    LOST                 = "lost"


class DealChannel(str, enum.Enum):
    DIRECT   = "direct"
    RESELLER = "reseller"


class CaseStatus(str, enum.Enum):
    OPEN        = "open"
    IN_PROGRESS = "in_progress"
    ESCALATED   = "escalated"
    RESOLVED    = "resolved"
    CLOSED      = "closed"


class CasePriority(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class OfferStatus(str, enum.Enum):
    DRAFT           = "draft"
    PENDING_SM      = "pending_sm"
    PENDING_FINANCE = "pending_finance"
    LOCKED          = "locked"      # fully approved — immutable
    REJECTED        = "rejected"


class CatalogItemType(str, enum.Enum):
    DEVICE  = "device"
    SERVICE = "service"


class InvoicingModel(str, enum.Enum):
    ONE_OFF           = "one_off"
    FIXED_TERM        = "fixed_term"
    MONTHLY_RECURRING = "monthly_recurring"


class ServiceType(str, enum.Enum):
    INTERNAL    = "internal"
    THIRD_PARTY = "third_party"


class NoteType(str, enum.Enum):
    GENERAL  = "general"    # all roles with account access
    INTERNAL = "internal"   # rep + TAM only
    WORKING  = "working"    # TAM technical notes only


class EntityType(str, enum.Enum):
    ACCOUNT = "account"
    DEAL    = "deal"
    CASE    = "case"
    OFFER   = "offer"
    CONTACT = "contact"
    NOTE    = "note"


# ──────────────────────────────────────────────────────────────────────────────
# Domain constants  — single source of truth, import wherever needed
# ──────────────────────────────────────────────────────────────────────────────

# Default win-probability per stage (used for weighted-pipeline Finance view)
STAGE_WIN_PROBABILITY: dict[str, int] = {
    "interest_shown":       10,
    "rfi_answered":         20,
    "rfp_offer_given":      40,
    "customer_test":        65,
    "contract_negotiation": 80,
    "won":                  100,
    "lost":                 0,
}

# Valid stage sequences per channel
DIRECT_STAGES: list[str] = [
    "interest_shown", "rfi_answered", "rfp_offer_given",
    "customer_test", "contract_negotiation", "won", "lost",
]
RESELLER_STAGES: list[str] = [
    "interest_shown", "rfi_answered", "rfp_offer_given",
    "customer_test", "won", "lost",
]

TERMINAL_STAGES: set[str] = {"won", "lost"}

# Offer approval: these transitions are enforced in routers/offers.py
# draft → pending_sm (discount > 0) or locked (no discount)
# pending_sm → pending_finance (SM approves) or rejected (SM rejects)
# pending_finance → locked (Finance approves) or rejected (Finance rejects)
OFFER_TRANSITIONS: dict[str, list[str]] = {
    "draft":           ["pending_sm", "locked", "rejected"],
    "pending_sm":      ["pending_finance", "rejected"],
    "pending_finance": ["locked", "rejected"],
    "locked":          [],
    "rejected":        [],
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def valid_stages_for_channel(channel: str) -> list[str]:
    """Returns the allowed stage list for a given channel string."""
    return DIRECT_STAGES if channel == "direct" else RESELLER_STAGES


def effective_win_prob(deal) -> float:
    """
    Returns the deal's win_probability override if set;
    otherwise falls back to the stage default from STAGE_WIN_PROBABILITY.
    """
    if deal.win_probability is not None:
        return float(deal.win_probability)
    return float(STAGE_WIN_PROBABILITY.get(deal.stage, 0))


# ──────────────────────────────────────────────────────────────────────────────
# ORM Models
# ──────────────────────────────────────────────────────────────────────────────

class User(Base):
    """
    CRM user. Created on first Azure AD SSO login (Person 4 wires this).
    azure_oid = Entra ID Object ID — immutable identifier.
    role drives the default dashboard and all permission guards.
    """
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True)
    azure_oid  = Column(String(128), unique=True, nullable=False)
    email      = Column(String(256), unique=True, nullable=False)
    full_name  = Column(String(256), nullable=False)
    role       = Column(String(32),  nullable=False)       # UserRole value
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    manager        = relationship("User", remote_side="User.id",
                                   foreign_keys="[User.manager_id]",
                                   backref="reports")
    owned_accounts = relationship("Account", foreign_keys="[Account.owner_id]",
                                   back_populates="owner")
    tam_accounts   = relationship("Account", foreign_keys="[Account.tam_id]",
                                   back_populates="tam")
    owned_deals    = relationship("Deal",    foreign_keys="[Deal.owner_id]",
                                   back_populates="owner")
    assigned_cases = relationship("Case",    foreign_keys="[Case.tam_id]",
                                   back_populates="tam")
    notifications  = relationship("Notification", back_populates="user",
                                   order_by="Notification.created_at.desc()")


class Account(Base):
    """
    Top-level customer or prospect record.
    Contacts, deals, cases, offers, and the activity timeline all hang here.
    channel defaults new deals to direct or reseller.
    """
    __tablename__ = "accounts"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(256), nullable=False)
    industry   = Column(String(128))
    country    = Column(String(64))
    region     = Column(String(64))    # DACH | Nordics | Benelux | …
    channel    = Column(String(16))    # DealChannel default for new deals
    website    = Column(String(256))
    phone      = Column(String(64))
    status     = Column(String(16), default="active")  # AccountStatus
    owner_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    tam_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner    = relationship("User",             foreign_keys=[owner_id],
                             back_populates="owned_accounts")
    tam      = relationship("User",             foreign_keys=[tam_id],
                             back_populates="tam_accounts")
    contacts = relationship("Contact",          back_populates="account",
                             cascade="all, delete-orphan")
    deals    = relationship("Deal",             back_populates="account")
    cases    = relationship("Case",             back_populates="account")
    offers   = relationship("Offer",            back_populates="account")
    timeline = relationship("ActivityTimeline", back_populates="account",
                             order_by="ActivityTimeline.created_at.desc()")


class Contact(Base):
    """Person at a customer account. customer_contact_id on Case points here."""
    __tablename__ = "contacts"

    id         = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    first_name = Column(String(128), nullable=False)
    last_name  = Column(String(128), nullable=False)
    email      = Column(String(256))
    phone      = Column(String(64))
    job_title  = Column(String(128))
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    account = relationship("Account", back_populates="contacts")


class CatalogItem(Base):
    """
    Product + pricing catalog. Finance-managed (role guard on write routes).
    Both physical devices and billable services live in this table.
    Offers are built by picking lines from here.

    For SERVICE items, invoicing_model controls revenue recognition:
      one_off           → single invoice at delivery
      fixed_term        → contract_value spread over term_years
      monthly_recurring → charged per active device per month
    device items leave invoicing_model / term_years NULL.
    """
    __tablename__ = "catalog_items"

    id              = Column(Integer, primary_key=True)
    name            = Column(String(256), nullable=False)
    sku             = Column(String(64),  unique=True, nullable=False)
    item_type       = Column(String(16),  nullable=False)   # CatalogItemType
    description     = Column(Text)
    unit_price      = Column(Float, nullable=False)
    currency        = Column(String(8), default="EUR")
    invoicing_model = Column(String(32), nullable=True)     # InvoicingModel (services)
    term_years      = Column(Integer,    nullable=True)     # fixed_term services only
    is_active       = Column(Boolean, default=True)
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    creator      = relationship("User",          foreign_keys=[created_by])
    offer_lines  = relationship("OfferLineItem", back_populates="catalog_item")
    service_link = relationship("Service",       back_populates="catalog_item",
                                 uselist=False)


class Service(Base):
    """
    Service catalog — used for case management (not offers directly).
    Cases link to services: what is being serviced or what failed.
    3rd-party services must track provider_name so TAMs can escalate correctly.
    catalog_item_id is optional; link it when a 1:1 pricing line exists.
    """
    __tablename__ = "services"

    id              = Column(Integer, primary_key=True)
    name            = Column(String(256), nullable=False)
    description     = Column(Text)
    service_type    = Column(String(16),  nullable=False)   # ServiceType
    provider_name   = Column(String(256), nullable=True)    # 3rd-party only
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    catalog_item = relationship("CatalogItem", back_populates="service_link")
    cases        = relationship("Case",        back_populates="service")


class Deal(Base):
    """
    Sales opportunity.

    channel controls valid stages:
      direct   → DIRECT_STAGES   (includes contract_negotiation)
      reseller → RESELLER_STAGES (contract_negotiation is INVALID)

    IMPORTANT — cached totals:
      total_device_value and total_service_value are SUM caches of
      DealForecastMonth rows. Recompute them (see helpers) whenever
      forecast rows are created, updated, or deleted.

    Pilot / follow-on:
      Pilot deals: is_pilot=True, parent_deal_id=None.
      Follow-on orders: parent_deal_id → the pilot deal's id.

    win_probability:
      None → use STAGE_WIN_PROBABILITY[stage] default.
      Set it to override the default for a specific deal.
      Use effective_win_prob(deal) everywhere — never read the field directly.
    """
    __tablename__ = "deals"

    id                  = Column(Integer, primary_key=True)
    account_id          = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    owner_id            = Column(Integer, ForeignKey("users.id"),    nullable=False)
    name                = Column(String(256), nullable=False)
    channel             = Column(String(16),  nullable=False)               # DealChannel
    stage               = Column(String(32),  nullable=False,
                                  default="interest_shown")                  # DealStage
    win_probability     = Column(Float,  nullable=True)   # None → stage default
    expected_close_date = Column(Date,   nullable=True)

    # Cached totals — must be recomputed when DealForecastMonth rows change
    total_device_value  = Column(Float, default=0.0)
    total_service_value = Column(Float, default=0.0)

    is_pilot       = Column(Boolean, default=False)
    parent_deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True)

    lost_reason     = Column(Text, nullable=True)
    last_updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    account         = relationship("Account", back_populates="deals")
    owner           = relationship("User", foreign_keys=[owner_id],
                                    back_populates="owned_deals")
    updater         = relationship("User", foreign_keys=[last_updated_by])
    forecast_months = relationship(
        "DealForecastMonth", back_populates="deal",
        cascade="all, delete-orphan",
        order_by="DealForecastMonth.year, DealForecastMonth.month",
    )
    parent_deal     = relationship("Deal", remote_side="Deal.id",
                                    foreign_keys="[Deal.parent_deal_id]",
                                    backref="follow_on_deals")
    offers          = relationship("Offer", back_populates="deal")


class DealForecastMonth(Base):
    """
    One row per calendar month per deal for the 3-year rolling forecast.
    Reps enter 12 months initially; rows can extend to 36 months.
    Absolute calendar year/month makes Finance quarterly aggregation trivial.

    device_revenue and service_revenue are kept SEPARATE per brief requirement.
    The API must recompute Deal.total_device_value / total_service_value
    after any write to this table.
    """
    __tablename__ = "deal_forecast_months"
    __table_args__ = (
        UniqueConstraint("deal_id", "year", "month", name="uq_dfm_deal_ym"),
    )

    id              = Column(Integer, primary_key=True)
    deal_id         = Column(Integer, ForeignKey("deals.id"), nullable=False)
    year            = Column(Integer, nullable=False)    # e.g. 2026
    month           = Column(Integer, nullable=False)    # 1–12
    device_units    = Column(Integer, default=0)
    device_revenue  = Column(Float,   default=0.0)
    service_revenue = Column(Float,   default=0.0)      # sum across all invoicing models

    deal = relationship("Deal", back_populates="forecast_months")


class Case(Base):
    """
    Service / support case raised against an account.

    tam_id:         assigned TAM — TAM dashboard sorts by priority + age.
    service_id:     which service this case concerns (can be null for ad-hoc).
    customer_contact_id: person at customer who raised it.
    is_escalated_to_third_party + third_party_ref: track external escalations.
    resolved_at:    set when status transitions to 'resolved' or 'closed'.
    """
    __tablename__ = "cases"

    id                          = Column(Integer, primary_key=True)
    account_id                  = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    tam_id                      = Column(Integer, ForeignKey("users.id"),    nullable=True)
    service_id                  = Column(Integer, ForeignKey("services.id"), nullable=True)
    subject                     = Column(String(512), nullable=False)
    description                 = Column(Text)
    status                      = Column(String(16), default="open",   nullable=False)  # CaseStatus
    priority                    = Column(String(16), default="medium", nullable=False)  # CasePriority
    is_escalated_to_third_party = Column(Boolean, default=False)
    third_party_ref             = Column(String(128), nullable=True)   # external ticket ID
    customer_contact_id         = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    created_by                  = Column(Integer, ForeignKey("users.id"),    nullable=True)
    resolved_at                 = Column(DateTime, nullable=True)
    created_at                  = Column(DateTime, server_default=func.now())
    updated_at                  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    account          = relationship("Account",  back_populates="cases")
    tam              = relationship("User",    foreign_keys=[tam_id],
                                     back_populates="assigned_cases")
    service          = relationship("Service", back_populates="cases")
    customer_contact = relationship("Contact", foreign_keys=[customer_contact_id])
    creator          = relationship("User",    foreign_keys=[created_by])


class Note(Base):
    """
    Timestamped note. Polymorphic via (entity_type, entity_id).
    Query pattern: db.query(Note).filter_by(entity_type="deal", entity_id=deal.id)

    entity_type: 'account' | 'deal' | 'case'

    note_type visibility rules:
      general  → all roles with account access
      internal → rep + TAM only (hidden from Finance)
      working  → TAM only (hidden from Finance and Rep)
    """
    __tablename__ = "notes"
    __table_args__ = (
        Index("ix_note_entity", "entity_type", "entity_id"),
    )

    id          = Column(Integer, primary_key=True)
    entity_type = Column(String(16), nullable=False)       # EntityType
    entity_id   = Column(Integer,    nullable=False)
    author_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    body        = Column(Text, nullable=False)
    note_type   = Column(String(16), default="general")    # NoteType
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    author = relationship("User")


class Offer(Base):
    """
    Versioned commercial offer.  Built by a rep from CatalogItem lines.

    ─── Approval state machine ────────────────────────────────────────────────
    draft
      └─(rep submits, discount_pct > 0) ──► pending_sm
      │                                         ├─(SM rejects)──► rejected ✗
      │                                         └─(SM approves)─► pending_finance
      │                                                                ├─(Finance rejects)─► rejected ✗
      │                                                                └─(Finance approves)─► locked ✓
      │
      └─(rep submits, discount_pct == 0) ─► locked ✓  (no approval chain needed)

    Once LOCKED: immutable. To revise, create a new row with version = prev + 1.
    ───────────────────────────────────────────────────────────────────────────

    discount_justification is REQUIRED whenever discount_pct > 0.
    Financials (subtotal / discount_amount / total_value) are recomputed
    from OfferLineItem rows whenever lines change — see helpers.recalc_offer().
    """
    __tablename__ = "offers"

    id                     = Column(Integer, primary_key=True)
    account_id             = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    deal_id                = Column(Integer, ForeignKey("deals.id"),    nullable=True)
    created_by             = Column(Integer, ForeignKey("users.id"),    nullable=False)
    version                = Column(Integer, default=1)
    status                 = Column(String(24), default="draft", nullable=False)  # OfferStatus
    currency               = Column(String(8),  default="EUR")

    # Financials — recomputed whenever line items change
    subtotal               = Column(Float, default=0.0)
    discount_pct           = Column(Float, default=0.0)
    discount_amount        = Column(Float, default=0.0)
    total_value            = Column(Float, default=0.0)

    discount_justification = Column(Text, nullable=True)   # required when discount_pct > 0

    # SM approval
    sm_approver_id         = Column(Integer, ForeignKey("users.id"), nullable=True)
    sm_approved_at         = Column(DateTime, nullable=True)

    # Finance approval
    finance_approver_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    finance_approved_at    = Column(DateTime, nullable=True)

    # Rejection (SM or Finance)
    rejected_by            = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason       = Column(Text, nullable=True)
    rejected_at            = Column(DateTime, nullable=True)

    locked_at  = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    account          = relationship("Account",       back_populates="offers")
    deal             = relationship("Deal",          back_populates="offers")
    creator          = relationship("User", foreign_keys=[created_by])
    sm_approver      = relationship("User", foreign_keys=[sm_approver_id])
    finance_approver = relationship("User", foreign_keys=[finance_approver_id])
    rejector         = relationship("User", foreign_keys=[rejected_by])
    line_items       = relationship("OfferLineItem", back_populates="offer",
                                     cascade="all, delete-orphan")


class OfferLineItem(Base):
    """
    One catalog line on an offer.
    unit_price is a SNAPSHOT of CatalogItem.unit_price at line-creation time.
    Catalog price changes do NOT retroactively affect submitted/locked offers.
    line_total = unit_price * quantity * (1 - discount_pct / 100)
    """
    __tablename__ = "offer_line_items"

    id              = Column(Integer, primary_key=True)
    offer_id        = Column(Integer, ForeignKey("offers.id"),        nullable=False)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id"), nullable=False)
    quantity        = Column(Integer, default=1)
    unit_price      = Column(Float,   nullable=False)      # snapshot at creation
    discount_pct    = Column(Float,   default=0.0)
    line_total      = Column(Float,   default=0.0)
    created_at      = Column(DateTime, server_default=func.now())

    offer        = relationship("Offer",       back_populates="line_items")
    catalog_item = relationship("CatalogItem", back_populates="offer_lines")


class ActivityTimeline(Base):
    """
    Append-only per-account event log.
    Written automatically by API side-effects — never by users directly.
    Powers the account 'Activity' tab, sorted DESC by created_at.

    event_type naming conventions:
      account_*  → account_created, account_updated
      deal_*     → deal_created, deal_stage_changed, deal_won, deal_lost
      case_*     → case_opened, case_escalated, case_resolved, case_closed
      note_added
      offer_*    → offer_created, offer_submitted, offer_locked, offer_rejected
      contact_added

    Use helpers.add_timeline_event() — never construct this model directly.
    extra: arbitrary JSON for extra context (e.g. {old_stage, new_stage}).
    """
    __tablename__ = "activity_timeline"
    __table_args__ = (
        Index("ix_at_account_created", "account_id", "created_at"),
    )

    id          = Column(Integer, primary_key=True)
    account_id  = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    entity_type = Column(String(16), nullable=False)       # EntityType
    entity_id   = Column(Integer,    nullable=False)
    actor_id    = Column(Integer, ForeignKey("users.id"), nullable=True)   # None = system
    event_type  = Column(String(64),  nullable=False)
    summary     = Column(Text,        nullable=False)      # human-readable one-liner
    extra       = Column(JSON,        nullable=True)       # extra JSON context
    created_at  = Column(DateTime,    server_default=func.now())

    account = relationship("Account", back_populates="timeline")
    actor   = relationship("User")


class Notification(Base):
    """
    In-app notification. No email — per brief constraint.
    Written by the API on key events (offer needs approval, discount approved, etc.).
    Frontend polls GET /notifications (unread) or marks as read.
    """
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    title       = Column(String(256), nullable=False)
    body        = Column(Text, nullable=True)
    entity_type = Column(String(16), nullable=True)
    entity_id   = Column(Integer,    nullable=True)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")
