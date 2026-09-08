import type { GameState, NarrativeOutcome, CloseType } from "@/types";

// ─── TRACK MEMBERSHIP ────────────────────────────────────────────────────────

const TRACK_MEMBERS: Record<string, string[]> = {
  observability: ["alex_chen", "john_miller", "sarah_patel"],
  security: ["jordan_lee", "linda_chen", "rachel_kim"],
  search: ["dev_patel", "emily_rivera", "maria_torres"],
  platform: ["priya_desai", "mark_reynolds"],
};

// Senior (L3) stakeholder per non-platform track
const SENIOR_STAKEHOLDER: Record<string, string> = {
  observability: "sarah_patel",
  security: "rachel_kim",
  search: "maria_torres",
};

// ─── ADEQUACY CHECK ───────────────────────────────────────────────────────────

function isAdequateClose(closeType: CloseType | undefined): boolean {
  return closeType === "full_context" || closeType === "full_context_exceptional";
}

function getAdequateTracks(state: GameState): Set<string> {
  const adequate = new Set<string>();
  const completed = new Set(state.completedStakeholders);
  const closeTypes = state.stakeholderCloseTypes;

  // Observability / Security / Search: ≥3 members completed + senior with full_context or better
  for (const track of ["observability", "security", "search"]) {
    const members = TRACK_MEMBERS[track];
    const completedCount = members.filter((id) => completed.has(id)).length;
    const senior = SENIOR_STAKEHOLDER[track];
    if (completedCount >= 3 && isAdequateClose(closeTypes[senior])) {
      adequate.add(track);
    }
  }

  // Platform: both Priya AND Mark completed with full_context or better
  if (
    isAdequateClose(closeTypes["priya_desai"]) &&
    isAdequateClose(closeTypes["mark_reynolds"])
  ) {
    adequate.add("platform");
  }

  return adequate;
}

// ─── NINE NARRATIVE OUTCOMES ──────────────────────────────────────────────────

const OUTCOMES: NarrativeOutcome[] = [
  // ── TIER 1 ──────────────────────────────────────────────────────────────────
  {
    id: 1,
    title: "The Full Platform Win",
    story:
      "You built the complete Elastic story for Soha Inc. The observability consolidation addresses the Black Friday gap with a shared data model and a cost case Sarah Patel can defend. The security story replaces Splunk on a timeline that works for Rachel Kim and the board — before the February renewal forces a bad decision. The search and personalization thread gives Priya the AI platform narrative she can walk into the 18-month roadmap. Mark Reynolds has seen the cost modelling and the 20% reduction number is defensible. The steering committee presentation is not a pitch — it is a ratification. You are the recommended vendor, not one of three options on a shortlist.",
    turningPoint:
      "You did not stop at the first yes. Every time you closed one thread, you opened the next conversation with context from the last. The question that changed everything was asking Sarah Patel about the data centre migration window — it told you exactly how much time you had before the platform door closed.",
    alternatePath:
      "You had the full deal. The one thing to watch: the implementation sequencing conversation with Priya is the next step. The win is real — don't let it make you stop listening.",
  },

  // ── TIER 2 ──────────────────────────────────────────────────────────────────
  {
    id: 2,
    title: "The Ops Consolidation Win",
    story:
      "You built a strong case for the observability and security consolidation. The Black Friday narrative is intact. Rachel Kim understands what a single data model means for the SOC. Sarah Patel has the vendor rationalisation story, and the Splunk renewal pressure has been converted into a forcing function that works in your favour. But the search and personalization thread was never developed — Maria Torres doesn't know who you are, and the AI platform angle is absent from the Priya conversation. You will close an ops consolidation deal. Elastic's search capabilities will not be in scope. The deal is worth winning. It is also worth less than it could have been.",
    turningPoint:
      "The security-to-observability connection was well made. The turn you missed was not following Dev Patel's close into the revenue-growth thread — that conversation would have changed what you could put in front of Priya.",
    alternatePath:
      "Dev Patel's exceptional close gives you the search and personalization pain quantified before you meet Maria Torres. That changes the entire narrative you can build for the CIO roadmap.",
  },
  {
    id: 3,
    title: "The AI Platform Win",
    story:
      "You built the AI roadmap story for Priya Desai and grounded it in search and personalization pain. Maria Torres gave you the commercial thread — the recommendation engine gaps and their revenue impact. Mark Reynolds has seen the cost case. The CIO roadmap conversation happened at the right level with the right framing. But the observability and security threads are underdeveloped — Sarah Patel and Rachel Kim were not fully engaged, and the Splunk replacement angle is still open for Datadog. You have a real deal, led by the AI platform opportunity. The ops consolidation is someone else's to win.",
    turningPoint:
      "Getting to Priya with the AI platform story already framed was the right move. The gap is that you left the Splunk renewal on the table. Datadog is likely in that conversation already.",
    alternatePath:
      "Alex Chen's conversation, done early, gives you the Black Friday cost data that makes the observability side of the Priya story concrete — and gives Sarah Patel a reason to champion you before the security review begins.",
  },
  {
    id: 4,
    title: "The Developer Platform Deal",
    story:
      "You built two strong technical threads — observability and search — and connected them through the developer experience story. John Miller and Emily Rivera both have enough to carry this internally. The engineering narrative is coherent and well-supported. But the security story was not built, and Rachel Kim is evaluating a different vendor for the SOC consolidation. The Splunk renewal will close without you in that room. Priya has a partial picture — strong on the tech side, thin on the cost and compliance angles. You have a deal in observability and search that is credible and fundable. The security and cost consolidation narratives were left on the table.",
    turningPoint:
      "The developer-experience frame was strong. It left the CISO out of the conversation, which means the board-level cost story never came together.",
    alternatePath:
      "Jordan Lee's conversation, done before Linda Chen, gives you the SOC analyst pain that Rachel Kim needs to hear from someone inside her own team. One conversation there changes the entire security thread.",
  },
  {
    id: 5,
    title: "The Security-Led Transformation",
    story:
      "You built the security and cost consolidation story and landed it with Priya and Mark. Rachel Kim is a strong champion. The Splunk replacement has a clear cost case. Mark Reynolds can defend the vendor rationalisation number to the board. But the observability thread was thin — Alex Chen and John Miller were not fully engaged — and the AI platform story is underdeveloped. Priya sees a security-led consolidation, not an AI enablement platform. The deal is real. It is security-scoped. Elastic's observability and search capabilities will not be part of the first contract.",
    turningPoint:
      "Getting to the CFO with the cost narrative was well-timed. The gap is that Priya's AI roadmap conversation needs more than security to be complete — and you didn't have the observability data to make it concrete.",
    alternatePath:
      "Sarah Patel, primed by Alex and John's context, gives you the infrastructure story that makes observability part of the Priya conversation — and strengthens the cost consolidation argument Mark Reynolds needs.",
  },
  {
    id: 6,
    title: "The Partial Win",
    story:
      "You developed two of Soha's four technical threads well enough to build a credible proposal. The stakeholders in those areas have a clear picture of what Elastic can do and enough internal context to carry the story forward. But significant discovery gaps remain in the other areas. The complete consolidation story was not built, and the deal you will land reflects what you actually uncovered. You have a real opportunity here, scoped to where you did the work.",
    turningPoint:
      "Strong execution in two areas, incomplete coverage in the other two. The deal will reflect the conversations you had — and the ones you didn't.",
    alternatePath:
      "Every unstaked thread is an opening for a competitor. One strong question per stakeholder in each undeveloped track is enough to know whether there is a thread worth pulling. You didn't need to go deep — you needed to go wide enough to spot the opening.",
  },

  // ── TIER 3 ──────────────────────────────────────────────────────────────────
  {
    id: 7,
    title: "The Point Solution",
    story:
      "You built a compelling case in one area of Soha's technology stack. That stakeholder group understands what Elastic can do and someone in that team has enough to take this forward internally. But the rest of the organisation is in the dark. The deal you'll land is scoped to a single use case — valuable, but not the consolidation story that would move Elastic to primary vendor. Three other threads remain open for whoever has those conversations.",
    turningPoint:
      "Deep in one area, absent from three others. Real momentum with the stakeholders you spent time with. Zero awareness everywhere else.",
    alternatePath:
      "One strong question per stakeholder in each of the other three tracks is enough to know if there is a thread worth pulling. You didn't need to go deep — you needed to go wide enough to find the opening that connects the tracks.",
  },

  // ── TIER 4 ──────────────────────────────────────────────────────────────────
  {
    id: 8,
    title: "The Stalled Proposal",
    story:
      "You had conversations but you did not build anything. The stakeholders were professional. Nobody is carrying your story internally because the story was never told clearly enough to repeat. A proposal may still go in — but it will be evaluated cold, without a champion, without a cost case, against vendors who had the conversation you did not. The opportunity is still there. It will take a re-entry to unlock it.",
    turningPoint:
      "Discovery without a close is noise. The conversations happened but nothing moved forward — no internal owner, no shared narrative, no next step.",
    alternatePath:
      "At the end of every conversation, ask: \"If I could help you build the case for this internally, what number would you put on the problem?\" That question creates an owner. Without an owner, proposals stall at the inbox.",
  },
  {
    id: 9,
    title: "The Missed Opportunity",
    story:
      "You had access to some of the most important stakeholders at Soha Inc. and you did not use it. The information exists. The problems are real. The Splunk renewal is in February. The data centre migration window closes in 60 days. The budget pressure is real. Another vendor is inside having the conversation you did not have. The opportunity is not gone — Soha still needs a solution — but you are not in the running for it.",
    turningPoint:
      "Great discovery starts before the first question. Knowing what you are looking for and why is what separates a productive conversation from a pleasant one.",
    alternatePath:
      "\"Walk me through what happened from your seat — not the incident report version.\" That one question, in any conversation, changes the quality of everything that follows.",
  },
];

// ─── OUTCOME RESOLUTION ──────────────────────────────────────────────────────

export function resolveOutcome(state: GameState): NarrativeOutcome {
  const adequate = getAdequateTracks(state);
  const count = adequate.size;

  const hasObs = adequate.has("observability");
  const hasSec = adequate.has("security");
  const hasSearch = adequate.has("search");
  const hasPlat = adequate.has("platform");

  // Tier 1: all 4 tracks adequately covered
  if (count >= 4) {
    return OUTCOMES[0]; // id: 1 — Full Platform Win
  }

  // Tier 2: 2-3 tracks adequately covered
  // Route by which tracks are present (first matching condition wins)
  if (count >= 2) {
    if (hasObs && hasSec) return OUTCOMES[1]; // id: 2 — Ops Consolidation Win
    if (hasSearch && hasPlat) return OUTCOMES[2]; // id: 3 — AI Platform Win
    if (hasObs && hasSearch) return OUTCOMES[3]; // id: 4 — Developer Platform Deal
    if (hasSec && hasPlat) return OUTCOMES[4]; // id: 5 — Security-Led Transformation
    return OUTCOMES[5]; // id: 6 — Partial Win (other combos: obs+plat, sec+search)
  }

  // Tier 3: exactly 1 track adequately covered
  if (count === 1) {
    return OUTCOMES[6]; // id: 7 — Point Solution
  }

  // Tier 4: no track adequately covered
  // Stalled if at least 2 conversations were had; Missed Opportunity if very little activity
  if (state.completedStakeholders.length >= 2) {
    return OUTCOMES[7]; // id: 8 — Stalled Proposal
  }
  return OUTCOMES[8]; // id: 9 — Missed Opportunity
}

export function getOutcomeById(id: number): NarrativeOutcome {
  return OUTCOMES.find((o) => o.id === id) ?? OUTCOMES[8];
}
