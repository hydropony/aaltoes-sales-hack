/**
 * badges.js — Deal status badge helpers
 * ──────────────────────────────────────
 * Vanilla-JS date helpers — no external dependency required.
 */

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * True when the deal has not been updated in 14+ days.
 * Used for amber "Stale" badge on dashboard/pipeline cards.
 */
export const isStale = (deal) =>
  daysBetween(new Date(deal.updated_at), new Date()) >= 14;

/**
 * True when expected close date has passed and deal is still active.
 * Used for red "Overdue" badge.
 */
export const isOverdue = (deal) =>
  deal.expected_close_date &&
  new Date() > new Date(deal.expected_close_date) &&
  deal.stage !== "won" &&
  deal.stage !== "lost";
