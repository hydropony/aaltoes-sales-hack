"""
seed.py — populate crm.db with realistic demo data.
Run AFTER database.py has created the tables:

    uv run python database.py
    uv run python seed.py
"""

from datetime import datetime, date, timedelta
from database import SessionLocal, create_db
from SQL import (
    User, Account, Contact, CatalogItem, Service,
    Deal, DealForecastMonth, Case, Note, Offer, OfferLineItem,
    ActivityTimeline, Notification,
)

NOW = datetime.utcnow()
DAYS = lambda n: NOW - timedelta(days=n)


def seed():
    create_db()
    db = SessionLocal()

    # ── Users ────────────────────────────────────────────────────────────────
    carol = User(azure_oid="oid-carol", email="carol.lund@hmd.com",
                 full_name="Carol Lund", role="sm")
    alice = User(azure_oid="oid-alice", email="alice.virtanen@hmd.com",
                 full_name="Alice Virtanen", role="rep")
    bob   = User(azure_oid="oid-bob",   email="bob.makinen@hmd.com",
                 full_name="Bob Mäkinen", role="tam")
    dave  = User(azure_oid="oid-dave",  email="dave.korhonen@hmd.com",
                 full_name="Dave Korhonen", role="finance")

    db.add_all([carol, alice, bob, dave])
    db.flush()

    alice.manager_id = carol.id
    bob.manager_id   = carol.id

    # ── Catalog items ─────────────────────────────────────────────────────────
    shield_pro = CatalogItem(
        name="HMD Shield Pro", sku="HMD-SP-001", item_type="device",
        description="Rugged 5G enterprise smartphone with hardware security module.",
        unit_price=899.0, currency="EUR", created_by=dave.id,
    )
    rugged_x = CatalogItem(
        name="HMD Rugged X", sku="HMD-RX-002", item_type="device",
        description="IP68 field device, drop-tested to MIL-STD-810H.",
        unit_price=699.0, currency="EUR", created_by=dave.id,
    )
    mdm_saas = CatalogItem(
        name="HMD Secure Connect", sku="HMD-SC-SVC-001", item_type="service",
        description="Cloud MDM — per active device per month.",
        unit_price=15.0, currency="EUR",
        invoicing_model="monthly_recurring", created_by=dave.id,
    )
    enterprise_mdm = CatalogItem(
        name="HMD Enterprise MDM Suite", sku="HMD-MDM-3Y", item_type="service",
        description="On-prem MDM license, 3-year fixed term.",
        unit_price=50_000.0, currency="EUR",
        invoicing_model="fixed_term", term_years=3, created_by=dave.id,
    )
    data_guardian = CatalogItem(
        name="HMD Data Guardian", sku="HMD-DG-OO", item_type="service",
        description="One-off data-at-rest encryption deployment.",
        unit_price=25_000.0, currency="EUR",
        invoicing_model="one_off", created_by=dave.id,
    )
    db.add_all([shield_pro, rugged_x, mdm_saas, enterprise_mdm, data_guardian])
    db.flush()

    # ── Services (for cases) ──────────────────────────────────────────────────
    svc_mdm    = Service(name="MDM Support", service_type="internal",
                          catalog_item_id=enterprise_mdm.id)
    svc_net    = Service(name="Network Integration", service_type="third_party",
                          provider_name="Ericsson")
    svc_repair = Service(name="Device Repair", service_type="internal")
    db.add_all([svc_mdm, svc_net, svc_repair])
    db.flush()

    # ── Accounts ──────────────────────────────────────────────────────────────
    nokia = Account(
        name="Nokia Corporation", industry="Telecommunications",
        country="Finland", region="Nordics", channel="direct",
        website="https://nokia.com", status="active",
        owner_id=alice.id, tam_id=bob.id,
    )
    kone = Account(
        name="KONE Oyj", industry="Industrial Equipment",
        country="Finland", region="Nordics", channel="direct",
        website="https://kone.com", status="active",
        owner_id=alice.id, tam_id=bob.id,
    )
    wartsila = Account(
        name="Wärtsilä Group", industry="Marine & Energy",
        country="Finland", region="Nordics", channel="reseller",
        website="https://wartsila.com", status="active",
        owner_id=alice.id, tam_id=bob.id,
    )
    fortum = Account(
        name="Fortum Energy", industry="Energy",
        country="Finland", region="Nordics", channel="direct",
        website="https://fortum.com", status="prospect",
        owner_id=alice.id, tam_id=bob.id,
    )
    stora = Account(
        name="Stora Enso", industry="Paper & Packaging",
        country="Finland", region="Nordics", channel="reseller",
        website="https://storaenso.com", status="active",
        owner_id=alice.id, tam_id=bob.id,
    )
    neste = Account(
        name="Neste Corporation", industry="Oil & Gas",
        country="Finland", region="Nordics", channel="direct",
        website="https://neste.com", status="active",
        owner_id=alice.id, tam_id=bob.id,
    )
    db.add_all([nokia, kone, wartsila, fortum, stora, neste])
    db.flush()

    # ── Contacts ──────────────────────────────────────────────────────────────
    nokia_c1 = Contact(account_id=nokia.id, first_name="Mikael", last_name="Heikkinen",
                        email="m.heikkinen@nokia.com", job_title="Head of IT", is_primary=True)
    nokia_c2 = Contact(account_id=nokia.id, first_name="Sanna", last_name="Rantanen",
                        email="s.rantanen@nokia.com", job_title="Procurement Manager")
    kone_c1  = Contact(account_id=kone.id,  first_name="Juhani", last_name="Lahtinen",
                        email="j.lahtinen@kone.com", job_title="CTO", is_primary=True)
    wart_c1  = Contact(account_id=wartsila.id, first_name="Elina", last_name="Salminen",
                        email="e.salminen@wartsila.com", job_title="IT Director", is_primary=True)
    db.add_all([nokia_c1, nokia_c2, kone_c1, wart_c1])
    db.flush()

    # ── Deals ─────────────────────────────────────────────────────────────────
    # Nokia: contract_negotiation, STALE (last updated 16 days ago) — direct
    deal_nokia = Deal(
        account_id=nokia.id, owner_id=alice.id,
        name="Nokia HQ Device Refresh 2026",
        channel="direct", stage="contract_negotiation",
        win_probability=80.0,
        expected_close_date=date(2026, 8, 31),
        total_device_value=359_600.0, total_service_value=54_000.0,
        last_updated_by=alice.id,
        updated_at=DAYS(16),
    )
    # KONE: customer_test, direct
    deal_kone = Deal(
        account_id=kone.id, owner_id=alice.id,
        name="KONE Elevator Field Devices Pilot",
        channel="direct", stage="customer_test",
        expected_close_date=date(2026, 9, 15),
        total_device_value=139_800.0, total_service_value=18_000.0,
        is_pilot=True, last_updated_by=alice.id,
        updated_at=DAYS(3),
    )
    # Wärtsilä: rfp_offer_given, reseller
    deal_wart = Deal(
        account_id=wartsila.id, owner_id=alice.id,
        name="Wärtsilä Marine Ops Devices",
        channel="reseller", stage="rfp_offer_given",
        expected_close_date=date(2026, 10, 1),
        total_device_value=209_700.0, total_service_value=0.0,
        last_updated_by=alice.id, updated_at=DAYS(5),
    )
    # Fortum: interest_shown, direct
    deal_fortum = Deal(
        account_id=fortum.id, owner_id=alice.id,
        name="Fortum Field Engineer Rollout",
        channel="direct", stage="interest_shown",
        expected_close_date=date(2026, 12, 1),
        total_device_value=0.0, total_service_value=0.0,
        last_updated_by=alice.id, updated_at=DAYS(2),
    )
    # Stora Enso: won, reseller
    deal_stora = Deal(
        account_id=stora.id, owner_id=alice.id,
        name="Stora Enso Warehouse Devices 2025",
        channel="reseller", stage="won",
        win_probability=100.0,
        expected_close_date=date(2025, 12, 15),
        total_device_value=174_750.0, total_service_value=22_500.0,
        last_updated_by=alice.id, updated_at=DAYS(30),
    )
    # Neste: rfi_answered, direct
    deal_neste = Deal(
        account_id=neste.id, owner_id=alice.id,
        name="Neste Refinery Secure Devices",
        channel="direct", stage="rfi_answered",
        expected_close_date=date(2026, 11, 1),
        total_device_value=0.0, total_service_value=0.0,
        last_updated_by=alice.id, updated_at=DAYS(7),
    )
    db.add_all([deal_nokia, deal_kone, deal_wart, deal_fortum, deal_stora, deal_neste])
    db.flush()

    # Forecast months — Nokia (months 1–12 from now)
    base_year, base_month = NOW.year, NOW.month
    def ym(offset):
        m = base_month + offset - 1
        return base_year + m // 12, m % 12 + 1

    for i in range(1, 13):
        y, m = ym(i)
        db.add(DealForecastMonth(
            deal_id=deal_nokia.id, year=y, month=m,
            device_units=25, device_revenue=22_475.0, service_revenue=4_500.0,
        ))

    # Forecast months — KONE (months 1–6)
    for i in range(1, 7):
        y, m = ym(i)
        db.add(DealForecastMonth(
            deal_id=deal_kone.id, year=y, month=m,
            device_units=20, device_revenue=17_980.0, service_revenue=3_000.0,
        ))

    # Forecast months — Stora Enso (historical, won)
    for i in range(-5, 1):
        y, m = ym(i) if i != 0 else (NOW.year, NOW.month)
        db.add(DealForecastMonth(
            deal_id=deal_stora.id, year=y, month=m,
            device_units=25, device_revenue=17_475.0, service_revenue=3_750.0,
        ))

    db.flush()

    # ── Offers ────────────────────────────────────────────────────────────────
    # Nokia offer: PENDING FINANCE (sm already approved, waiting on finance)
    offer_nokia = Offer(
        account_id=nokia.id, deal_id=deal_nokia.id, created_by=alice.id,
        version=1, status="pending_finance", currency="EUR",
        subtotal=413_600.0, discount_pct=10.0,
        discount_amount=41_360.0, total_value=372_240.0,
        discount_justification="Strategic account renewal; 10% discount to lock 3-yr commitment before competitor RFP closes.",
        sm_approver_id=carol.id, sm_approved_at=DAYS(2),
    )
    db.add(offer_nokia)
    db.flush()

    db.add(OfferLineItem(
        offer_id=offer_nokia.id, catalog_item_id=shield_pro.id,
        quantity=400, unit_price=899.0, discount_pct=10.0,
        line_total=323_640.0,
    ))
    db.add(OfferLineItem(
        offer_id=offer_nokia.id, catalog_item_id=mdm_saas.id,
        quantity=400, unit_price=15.0, discount_pct=10.0,
        line_total=5_400.0,
    ))
    db.add(OfferLineItem(
        offer_id=offer_nokia.id, catalog_item_id=enterprise_mdm.id,
        quantity=1, unit_price=50_000.0, discount_pct=10.0,
        line_total=45_000.0,
    ))

    # KONE offer: draft
    offer_kone = Offer(
        account_id=kone.id, deal_id=deal_kone.id, created_by=alice.id,
        version=1, status="draft", currency="EUR",
        subtotal=157_800.0, discount_pct=0.0,
        discount_amount=0.0, total_value=157_800.0,
    )
    db.add(offer_kone)
    db.flush()

    db.add(OfferLineItem(
        offer_id=offer_kone.id, catalog_item_id=rugged_x.id,
        quantity=200, unit_price=699.0, discount_pct=0.0, line_total=139_800.0,
    ))
    db.add(OfferLineItem(
        offer_id=offer_kone.id, catalog_item_id=mdm_saas.id,
        quantity=200, unit_price=15.0, discount_pct=0.0, line_total=18_000.0,
    ))
    db.flush()

    # ── Cases ─────────────────────────────────────────────────────────────────
    case_nokia = Case(
        account_id=nokia.id, tam_id=bob.id, service_id=svc_mdm.id,
        subject="MDM enrollment failure — Nokia HQ batch",
        description="~120 Shield Pro units failing MDM enrollment after firmware update v2.4.1. Blocking go-live.",
        status="in_progress", priority="critical",
        is_escalated_to_third_party=False,
        customer_contact_id=nokia_c1.id, created_by=bob.id,
        created_at=DAYS(4), updated_at=DAYS(1),
    )
    case_kone = Case(
        account_id=kone.id, tam_id=bob.id, service_id=svc_net.id,
        subject="Network integration timeout during pilot",
        description="Devices lose connection to Ericsson gateway intermittently in basement floors.",
        status="open", priority="high",
        is_escalated_to_third_party=True, third_party_ref="ERI-2026-44821",
        customer_contact_id=kone_c1.id, created_by=bob.id,
        created_at=DAYS(6), updated_at=DAYS(6),
    )
    case_wart = Case(
        account_id=wartsila.id, tam_id=bob.id, service_id=svc_repair.id,
        subject="3x Rugged X screen damage — marine environment",
        description="Salt ingress caused touchscreen failure on 3 units aboard M/S Finlandia.",
        status="resolved", priority="medium",
        customer_contact_id=wart_c1.id, created_by=bob.id,
        created_at=DAYS(20), resolved_at=DAYS(14), updated_at=DAYS(14),
    )
    db.add_all([case_nokia, case_kone, case_wart])
    db.flush()

    # ── Notes ─────────────────────────────────────────────────────────────────
    db.add(Note(entity_type="case", entity_id=case_nokia.id, author_id=bob.id,
                body="Reproduced on 5 units. Firmware rollback to v2.3.9 unblocks enrollment. Escalating to engineering.",
                note_type="internal", created_at=DAYS(3)))
    db.add(Note(entity_type="case", entity_id=case_nokia.id, author_id=bob.id,
                body="Engineering confirmed bug in v2.4.1 SCEP handler. Patch ETA: 48h. Will deploy to staging first.",
                note_type="internal", created_at=DAYS(1)))
    db.add(Note(entity_type="case", entity_id=case_kone.id, author_id=bob.id,
                body="Ericsson opened ticket ERI-2026-44821. Waiting on site survey from their team.",
                note_type="general", created_at=DAYS(5)))
    db.add(Note(entity_type="case", entity_id=case_wart.id, author_id=bob.id,
                body="Replacement units shipped DHL 1Z999AA10123456784. Customer confirmed receipt.",
                note_type="general", created_at=DAYS(15)))
    db.add(Note(entity_type="deal",    entity_id=deal_nokia.id, author_id=alice.id,
                body="Legal review of MSA taking longer than expected. Procurement confirmed budget is approved.",
                note_type="internal", created_at=DAYS(10)))
    db.add(Note(entity_type="account", entity_id=nokia.id, author_id=alice.id,
                body="QBR scheduled for July 15. Mikael wants exec summary on device security posture.",
                note_type="general", created_at=DAYS(8)))

    # ── Activity timeline ─────────────────────────────────────────────────────
    events = [
        ActivityTimeline(account_id=nokia.id, entity_type="deal", entity_id=deal_nokia.id,
                         actor_id=alice.id, event_type="deal_created",
                         summary="Deal 'Nokia HQ Device Refresh 2026' created by Alice Virtanen",
                         created_at=DAYS(45)),
        ActivityTimeline(account_id=nokia.id, entity_type="deal", entity_id=deal_nokia.id,
                         actor_id=alice.id, event_type="deal_stage_changed",
                         summary="Stage advanced to Contract Negotiation",
                         extra={"old_stage": "customer_test", "new_stage": "contract_negotiation"},
                         created_at=DAYS(16)),
        ActivityTimeline(account_id=nokia.id, entity_type="offer", entity_id=offer_nokia.id,
                         actor_id=alice.id, event_type="offer_submitted",
                         summary="Offer v1 submitted for SM approval (10% discount)",
                         created_at=DAYS(4)),
        ActivityTimeline(account_id=nokia.id, entity_type="offer", entity_id=offer_nokia.id,
                         actor_id=carol.id, event_type="offer_approved",
                         summary="Offer v1 approved by Carol Lund (SM) — sent to Finance",
                         created_at=DAYS(2)),
        ActivityTimeline(account_id=nokia.id, entity_type="case", entity_id=case_nokia.id,
                         actor_id=bob.id, event_type="case_opened",
                         summary="Critical case opened: MDM enrollment failure — Nokia HQ batch",
                         created_at=DAYS(4)),
        ActivityTimeline(account_id=kone.id, entity_type="deal", entity_id=deal_kone.id,
                         actor_id=alice.id, event_type="deal_created",
                         summary="Pilot deal 'KONE Elevator Field Devices Pilot' created",
                         created_at=DAYS(30)),
        ActivityTimeline(account_id=kone.id, entity_type="case", entity_id=case_kone.id,
                         actor_id=bob.id, event_type="case_opened",
                         summary="High-priority case opened: Network integration timeout during pilot",
                         created_at=DAYS(6)),
        ActivityTimeline(account_id=wartsila.id, entity_type="case", entity_id=case_wart.id,
                         actor_id=bob.id, event_type="case_resolved",
                         summary="Case resolved: 3x Rugged X screen damage — replacement units delivered",
                         created_at=DAYS(14)),
        ActivityTimeline(account_id=stora.id, entity_type="deal", entity_id=deal_stora.id,
                         actor_id=alice.id, event_type="deal_won",
                         summary="Deal won: Stora Enso Warehouse Devices 2025",
                         created_at=DAYS(30)),
    ]
    db.add_all(events)

    # ── Notifications ─────────────────────────────────────────────────────────
    db.add(Notification(
        user_id=dave.id,
        title="Offer awaiting Finance approval",
        body="Nokia HQ Device Refresh 2026 — offer v1 (€372,240 after 10% discount) needs your approval.",
        entity_type="offer", entity_id=offer_nokia.id, is_read=False,
    ))
    db.add(Notification(
        user_id=alice.id,
        title="SM approved your offer",
        body="Carol Lund approved the Nokia offer. Awaiting Finance sign-off.",
        entity_type="offer", entity_id=offer_nokia.id, is_read=True,
    ))
    db.add(Notification(
        user_id=alice.id,
        title="Deal stale: Nokia HQ Device Refresh",
        body="No activity in 16 days. Update the deal or add a note.",
        entity_type="deal", entity_id=deal_nokia.id, is_read=False,
    ))

    db.commit()
    db.close()
    print("Seed complete.")
    print("  Users:    alice (rep), bob (tam), carol (sm), dave (finance)")
    print("  Accounts: Nokia, KONE, Wärtsilä, Fortum, Stora Enso, Neste")
    print("  Deals:    6 across all stages (Nokia stale at 16d, KONE pilot, Stora won)")
    print("  Offers:   Nokia pending Finance approval, KONE draft")
    print("  Cases:    Nokia critical/in-progress, KONE high/open, Wärtsilä resolved")


if __name__ == "__main__":
    seed()
