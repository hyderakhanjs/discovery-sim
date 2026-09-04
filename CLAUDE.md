# Discovery Sim — Project Context for Claude

## What This Is

A browser-based technical discovery simulation for Elastic Field Engineers (FEs). Players navigate a 2D org chart of 11 stakeholders at a fictional B2C retailer (Soha Inc.) and conduct discovery conversations. The simulation teaches MEDDPICC-based discovery by rewarding smart question sequencing, penalising pitching before listening, and debriefing every conversation in real time.

Built for use by Nick (Global Head of FE) and Johnny. Intended for FE training: one live facilitated call + post-work self-play. Deployed on Vercel.

**Stack:** Next.js 14.1.0 App Router · TypeScript · Tailwind CSS · Vercel

---

## Repository Layout

```
src/
  app/
    page.tsx              — Home / landing page (start screen)
    simulation/page.tsx   — Main game UI (all phases)
    debrief/page.tsx      — End-of-game results page
  lib/
    gameState.ts          — State machine, context computation, turn processing
    scoring.ts            — DQI formula, MEDDPICC points, momentum, narrative score
    narrative.ts          — 6 outcome definitions + resolveOutcome() routing
  types/index.ts          — All shared TypeScript types
  data/
    question_content_seed.json — All 11 stakeholders + 264 questions with full content
```

---

## The Fictional Customer: Soha Inc.

Mid-market B2C retailer, $420M ARR. Key facts:
- **Black Friday outage** cost $1.2M in a single day. Root cause still unclear.
- **Data centre migration to AWS** — 60-day decision window before it closes the platform door for 18–24 months.
- **CIO mandate (Priya Desai):** AI platform in 18 months.
- **CFO mandate (Mark Reynolds):** 20% cost reduction on all vendor contracts.
- **Splunk renewal in February** — forcing function for the security/observability consolidation story.
- Three separate observability/security tools with no shared data model.

---

## Stakeholder Map

| ID | Name | Title | Level | Track |
|----|------|-------|-------|-------|
| alex_chen | Alex Chen | Senior SRE | 1 | observability |
| jordan_lee | Jordan Lee | SOC Analyst | 1 | security |
| dev_patel | Dev Patel | Search Developer | 1 | search |
| john_miller | John Miller | Infrastructure Director | 2 | observability |
| linda_chen | Linda Chen | SOC Lead | 2 | security |
| emily_rivera | Emily Rivera | Ecommerce Director | 2 | search |
| sarah_patel | Sarah Patel | VP of IT | 3 | observability |
| rachel_kim | Rachel Kim | CISO | 3 | security |
| maria_torres | Maria Torres | Chief Commercial Officer | 3 | search |
| priya_desai | Priya Desai | CIO | 4 | platform |
| mark_reynolds | Mark Reynolds | CFO | 4 | platform |

**Platform track has only 2 stakeholders (both L4).** All other tracks have 3 stakeholders (L1–L3). L4 boxes are rendered centred below the 4-track grid.

---

## Navigation Model: Free-Roam with Context States

Players can visit any stakeholder in any order. Prior conversations change the quality of future ones via `context_sources`:

```typescript
type ContextState = "cold" | "warm" | "primed"
const CONTEXT_MULTIPLIERS = { cold: 0.65, warm: 1.0, primed: 1.2 }
```

Each stakeholder has `context_sources.warm[]` (any one → warm) and `context_sources.primed[]` (all required → primed). Points earned are scaled by the multiplier. Going in cold is possible but costly.

---

## Game Phase Flow

```
handoff (map) → question → response → meeting_debrief → handoff (map) → ...
                                            ↑
                              also triggered by End Call
```

- **handoff:** 2D org chart. Player picks next stakeholder.
- **question:** 3 question options (shuffled). Turn 1–5.
- **response:** Stakeholder responds. Player reads, hits Continue.
- **meeting_debrief:** Shows every question asked in the just-completed conversation with rationale (high yield / mediocre / low yield) and insider briefing if unlocked. Triggered by both Close and End Call. If End Call with zero questions asked, still shows (with empty-state message).
- **complete:** Triggers finalizeGame() → sessionStorage → redirect to /debrief.

**End Call mid-conversation:** Returns to meeting_debrief (not handoff). Stakeholder not marked completed. −20 narrative penalty applied if player exits without completing any vertical branch.

---

## Scoring System

### MEDDPICC Elements and Caps
| Element | Cap |
|---------|-----|
| identify_pain | 25 |
| metrics | 20 |
| economic_buyer | 15 |
| decision_criteria | 15 |
| decision_process | 15 |
| champion | 15 |
| competition | 10 |
| **Total** | **115** |

### Level-Based Tag Rules
- **L1 (practitioners):** Tags limited to `identify_pain`, `metrics`, `decision_criteria`, `champion`, `competition`. NO `economic_buyer` or `decision_process`. Good questions: 3–5 pts (5 for pure identify_pain, 3 for pain+secondary, 2 for secondary only). Mediocre: 1pt. Recovery: 2pt.
- **L2 (directors):** All tags valid. Good: 4–5 pts. Mediocre: 2pt. Recovery: 2pt.
- **L3 (VPs):** All tags valid. Good: 5 pts. Mediocre: 2pt. Recovery: 3pt.
- **L4 (C-suite):** All tags valid. Good: 5 pts. Mediocre: 2pt. Recovery: 3pt.

### DQI Formula
```
dqi = (meddpiccEarned / 115) * 50 + (narrativeScore / 100) * 50
dqi += 10 if all 7 MEDDPICC elements covered (full sweep bonus)
max DQI = 100
```

### DQI Tiers
| Score | Label |
|-------|-------|
| 90+ | Elite Discovery |
| 75+ | Strong Discovery |
| 60+ | Developing |
| <60 | Needs Work |

### Narrative Score
- `full_context_exceptional` close: +25
- `full_context` close: +20
- `partial_context` close: +10
- Recovery used before close: −5
- Early exit without branch: −20

---

## Question Rationale System

Every question in the seed JSON has a `rationale` field explaining why it scores the way it does. This surfaces in:
1. **Meeting debrief** (after each conversation) — shown inline per question
2. **Final debrief** (/debrief) — collapsible section per stakeholder with full turn history + rationale

Question types: `good` (high yield) · `mediocre` · `trap` (low yield / 0 pts) · `recovery`

---

## Outcomes (6 total — in `src/lib/narrative.ts`)

Current routing logic uses `accessLevel`, `blindSpots`, `momentum`, and `completedStakeholders`. This routing is **pending a full rebuild** based on the track-coverage model below.

### Planned Outcome Model (NOT YET IMPLEMENTED)
**Tier 1 — All 4 tracks adequately covered:** Full platform win.
**Tier 2 — Any 2 tracks adequately covered:** Partial deal (3–4 outcome variants by which tracks).
**Tier 3 — Any 1 track adequately covered:** Point solution.
**Tier 4 — No track adequately covered:** Deal fails.

**"Adequately covered" definition (pending):**
- Observability / Security / Search: ≥3 stakeholders completed + senior stakeholder with `full_context` or better
- Platform: both Priya AND Mark completed with `full_context` or better

This rebuild is the **next major task**.

---

## UI Layout

```
[Left sidebar: MEDDPICC tracker, 56px wide, lg:flex hidden]
[Main content: max-w-2xl mx-auto px-4 py-8]
[Right sidebar: case study panel, w-64, xl:flex hidden]
```

Org chart grid: `gridTemplateColumns: "40px 1fr 1fr 1fr 1fr"` (level label + 4 tracks).
L4 row: `gridColumn: "span 4"` with `justifyContent: "center"` — Priya and Mark centred below all tracks.

Case study link opens a modal (`showCaseStudy` state). Modal contains full Soha Inc. background, stakeholder index, and "What Great Discovery Looks Like" (FE-framed, no "rep" language).

---

## Pending Work (priority order)

1. **Outcome routing rebuild** — implement track-coverage model (see above). Requires updating `src/lib/narrative.ts` and possibly `src/lib/gameState.ts`.
2. **Vercel KV integration** — user confirmed Vercel KV for persistence.
   - Name/email capture form on home page (`src/app/page.tsx`)
   - Store name/email in `sessionStorage` through to debrief
   - API route `POST /api/results` → save to KV, `GET /api/results` → fetch all
   - `/admin` page — table of all completions (DQI, outcome, MEDDPICC gaps, name, email, timestamp)
   - Requires: `npx vercel env pull .env.local` after connecting KV in Vercel dashboard
3. **T5 trap question rewrites** — currently too similar across stakeholders (all variations of "let me put together a proposal"). Need to be more stakeholder-specific to be genuine temptations.
4. **Competition question audit** — Sarah Patel T2 still has a trap tagged `competition` that should be reviewed.

---

## Git / Deployment

- GitHub repo connected to Vercel — push to main triggers auto-deploy
- TypeScript check before every push: `npx tsc --noEmit`
- Git config must be set in terminal (not in bash sandbox — permissions issue):
  ```bash
  git config user.email "hyder.khan@elastic.co"
  git config user.name "Hyder Khan"
  ```
- Push command:
  ```bash
  cd ~/Library/Application\ Support/Claude/local-agent-mode-sessions/e2eb646e-560e-4bab-8ee9-cd4229828ee6/5b1bd22b-b3c1-4f10-ac3b-a3b268f4b9c2/local_d5937b4b-a9a6-46cc-a4f0-3f1fb919a280/outputs/discovery-sim
  git add -A && git commit -m "..." && git push
  ```

---

## Design Decisions (and why)

| Decision | Rationale |
|----------|-----------|
| Free-roam navigation | Real discovery is non-linear. Rigid unlock chains teach order, not judgement. |
| Context multipliers not shown to player | Surfacing cold/warm/primed labels felt gamey. The mechanic works without the UI label. |
| DQI 50/50 MEDDPICC vs narrative | Equal weight because asking the right questions AND closing well both matter equally for FEs. |
| Meeting debrief after every call | Learning happens in the moment. Waiting until the end debrief is too late to connect feedback to behaviour. |
| L4 centred below grid | Priya and Mark are platform-track but represent the executive layer the whole org reports into. Visual positioning reflects organisational reality. |
| No rigid level progression | FEs encounter senior stakeholders early. The sim should reward preparation, not punish curiosity. |
| FE not "rep" language throughout | This is for Field Engineers. Sales language was specifically removed from case study and outcomes. |

---

## People

- **Hyder Khan** — builder (hyder.khan@elastic.co)
- **Nick** — Global Head of FE, requested the roleplay mechanic, primary stakeholder
- **Johnny** — co-reviewer, training delivery
