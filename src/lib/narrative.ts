import type { GameState, NarrativeOutcome } from "@/types";

// ─── SIX NARRATIVE OUTCOMES ──────────────────────────────────────────────────

const OUTCOMES: NarrativeOutcome[] = [
  {
    id: 1,
    title: "The Trusted Partner",
    story:
      "You are building the business case with Sarah and Priya. Mark Reynolds has seen the cost analysis and told Sarah the numbers are defensible. You have a working session on the calendar. The steering committee conversation is not a pitch — it is a presentation of a recommendation the committee has already been prepped for. The competitive dynamic has been addressed. You are not the only vendor in the conversation, but you are the one with a seat at the table.",
    turningPoint:
      "The conversation shifted when you asked about the steering committee rather than recapping what you heard from the team below. That question moved you from reporter to partner.",
    alternatePath:
      "If you had visited Emily Rivera before Sarah Patel, you would have arrived with the search and personalization pain already quantified — strengthening the AI narrative for Priya.",
  },
  {
    id: 2,
    title: "The Strong Candidate",
    story:
      "You have Priya's interest and Sarah's support. Mark Reynolds is engaged but not yet sold on the numbers. The proposal is going into a formal evaluation alongside at least one other vendor. You have a champion but she is operating without full executive air cover. The deal is real and winnable but it is not wrapped up. The next move determines whether you get the co-development relationship or stay in a competitive bake-off.",
    turningPoint:
      "You built technical credibility with the right people, but the economic buyer layer is not fully developed. Mark Reynolds needs more to become a yes.",
    alternatePath:
      "A stronger close with Sarah Patel — specifically the co-development framing — would have given you the insider partnership before going into Level 4.",
  },
  {
    id: 3,
    title: "The Technical Win Without the Business Win",
    story:
      "The technical team loves you. John Miller and Linda Chen are strong advocates. But the business case has not been made and nobody has walked it into the executive suite with conviction. Priya has heard your name but does not have a position on it. Mark Reynolds does not know you exist. The deal is alive but it is sitting at the technical layer waiting for someone to carry it upward. That someone needs to be you or your champion.",
    turningPoint:
      "Great discovery at the practitioner and director level, but the MEDDPICC gaps in Economic Buyer and Metrics mean the story never reached the people who approve budgets.",
    alternatePath:
      "Ask Alex or Jordan: 'If I could help your manager build the business case for this, what number would he lead with?' That question carries the story upward without waiting for the next meeting.",
  },
  {
    id: 4,
    title: "The Security-Only Deal",
    story:
      "You built a strong case for the security and observability consolidation. Linda Chen is a champion and the SOC use case is well understood. But the search and personalization thread was never developed — the AI platform angle is missing from the narrative. The deal is likely to be scoped to security and observability. You will leave Elastic's search and vector capabilities on the table. This is a real deal, but it is half the deal it could have been.",
    turningPoint:
      "The Jordan and Linda path was developed well, but Dev Patel and Emily Rivera were not visited — and with them, the entire revenue-growth thread of the Soha story.",
    alternatePath:
      "Dev Patel's exceptional close would have given you the search and personalization pain quantified before you ever met Maria Torres — changing the entire narrative you could have built for Priya.",
  },
  {
    id: 5,
    title: "The Stalled Proposal",
    story:
      "A proposal went in. Nobody is championing it. Sarah is busy with the migration and does not have the bandwidth to shepherd a vendor through the steering committee without a strong business case already in hand. Mark Reynolds has not seen it. Priya is focused on the AI roadmap conversation she is having with a different vendor. The deal is not dead but it is not moving. It will take a reentry to get it unstuck.",
    turningPoint:
      "The closes ended without co-development relationships — leaving no internal owner for the proposal once it left your hands.",
    alternatePath:
      "At every stakeholder close, the question is: will you carry this story internally? Getting that commitment explicitly changes everything that happens after the meeting ends.",
  },
  {
    id: 6,
    title: "The Missed Opportunity",
    story:
      "You had conversations but you did not have discovery. The information you gathered confirmed what you already knew rather than revealing what you did not. The stakeholders were professional but they did not open up. Nobody is carrying your story internally because you did not give them a story worth carrying. The opportunity exists. The platform problem is real. The budget pressure is real. Another vendor is having the conversation you did not have.",
    turningPoint:
      "The opening questions in each conversation set the tone. Leading with tool inventories and solution pitches rather than business impact questions closed doors before they opened.",
    alternatePath:
      "Start with: 'Walk me through what happened from your seat — not the incident report version.' That one reframe changes the quality of everything that follows.",
  },
];

// ─── OUTCOME RESOLUTION ──────────────────────────────────────────────────────

export function resolveOutcome(state: GameState): NarrativeOutcome {
  const { accessLevel, blindSpots, momentum, completedStakeholders } = state;

  const hasSecurityPath =
    completedStakeholders.includes("jordan_lee") ||
    completedStakeholders.includes("linda_chen");
  const hasSearchPath =
    completedStakeholders.includes("dev_patel") ||
    completedStakeholders.includes("emily_rivera");
  const missingMetricsOrEB =
    blindSpots.includes("metrics_gap") ||
    blindSpots.includes("economic_buyer_gap");

  // Check Outcome 3 first: technical win without business win
  if (accessLevel <= 2 && missingMetricsOrEB && completedStakeholders.length >= 2) {
    return OUTCOMES[2]; // id: 3
  }

  // Check Outcome 4: security-only deal
  if (hasSecurityPath && !hasSearchPath && completedStakeholders.length >= 3) {
    return OUTCOMES[3]; // id: 4
  }

  // Resolve remaining by access + momentum
  if (accessLevel === 3 && blindSpots.length <= 1 && momentum >= 1) {
    return OUTCOMES[0]; // id: 1 — Trusted Partner
  }

  if (accessLevel >= 2 && blindSpots.length <= 2 && momentum >= 0) {
    return OUTCOMES[1]; // id: 2 — Strong Candidate
  }

  if (accessLevel <= 1 || momentum <= -1) {
    return OUTCOMES[4]; // id: 5 — Stalled Proposal
  }

  return OUTCOMES[5]; // id: 6 — Missed Opportunity
}

export function getOutcomeById(id: number): NarrativeOutcome {
  return OUTCOMES.find((o) => o.id === id) ?? OUTCOMES[5];
}
