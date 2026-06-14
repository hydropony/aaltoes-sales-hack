/**
 * stages.js — Deal stage constants & helpers
 * ────────────────────────────────────────────
 * Single source of truth for pipeline stages.
 * Mirrors the backend DealStage enum + DIRECT_STAGES / RESELLER_STAGES.
 */

export const STAGES = {
  direct: [
    "Interest Shown",
    "RFI Answered",
    "RFP/Offer Given",
    "Customer Test",
    "Contract Negotiation",
    "Won",
    "Lost",
  ],
  reseller: [
    "Interest Shown",
    "RFI Answered",
    "RFP/Offer Given",
    "Customer Test",
    "Won",
    "Lost",
  ],
};

/** Maps human-readable stage labels → backend API enum values. */
export const STAGE_API = {
  "Interest Shown": "interest_shown",
  "RFI Answered": "rfi_answered",
  "RFP/Offer Given": "rfp_offer_given",
  "Customer Test": "customer_test",
  "Contract Negotiation": "contract_negotiation",
  Won: "won",
  Lost: "lost",
};

/** Maps backend API enum values → human-readable labels. */
export const STAGE_LABEL = Object.fromEntries(
  Object.entries(STAGE_API).map(([k, v]) => [v, k])
);

/** Ordered list of all valid stage API values for display purposes. */
export const STAGE_ORDER = [
  "interest_shown",
  "rfi_answered",
  "rfp_offer_given",
  "customer_test",
  "contract_negotiation",
  "won",
  "lost",
];

/**
 * Returns the valid human-readable stage names for a given channel.
 * @param {string} channel — "direct" or "reseller"
 */
export const validStages = (channel) => STAGES[channel] ?? STAGES.direct;

/**
 * Returns the valid API stage values that come AFTER the current stage.
 * Used to populate the "Advance stage" dropdown.
 * @param {string} channel — "direct" or "reseller"
 * @param {string} currentStage — current API stage value (e.g. "interest_shown")
 */
export const nextStages = (channel, currentStage) => {
  const list = validStages(channel).map((s) => STAGE_API[s]);
  const idx = list.indexOf(currentStage);
  return list.slice(idx + 1); // everything after current
};
