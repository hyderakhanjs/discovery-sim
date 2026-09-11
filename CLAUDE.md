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
    briefing/page.tsx     — Pre-game briefing ("How it Works" + case study context)
    simulation/page.tsx   — Main game UI (all phases)
    debrief/page.tsx      — End-of-game results page
  lib/
    gameState.ts          — State machine, context computation, turn processing
    scoring.ts            — DQI formula, MEDDPICC points, momentum, narrative score
    narrative.ts          — 9 outcome definitions + resolveOutcome() routing
  types/index.ts          — All shared TypeScript types
  data/
    question_content_seed.json — All 11 stakeholders + questions with full content
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
- **question:** 4 question options per turn (one of each type: good/mediocre/trap/irrelevant), shuffled. Turn 1–4. Turn 5 is always a close (all close options shown).
- **response:** Stakeholder responds. Player reads, hits Continue.
- **meeting_debrief:** Shows every question asked in the just-completed conversation with rationale (High Yield / Medium Yield / Low Yield / Irrelevant) and insider briefing if unlocked. Shows ALL 4 options that were presented that turn (not just the chosen one), with type labels and rationale for each. Triggered by both Close and End Call.
- **complete:** Triggers finalizeGame() → sessionStorage → redirect to /debrief.

**End Call mid-conversation:** Returns to meeting_debrief (not handoff). Stakeholder not marked completed. −20 narrative penalty applied if player exits without completing any vertical branch.

---

## 4-Type Question Model

Every turn 1–4 presents exactly **4 options**, one of each type. Labels are hidden during gameplay and revealed only in the debrief.

| Type | Label in Debrief | Points | Purpose |
|------|-----------------|--------|---------|
| `good` | High Yield | 3–5 pts (varies by level) | The ideal question for this moment |
| `mediocre` | Medium Yield | 1–2 pts | Surface-level but plausible — safe but weak |
| `trap` | Low Yield | 0 pts | Looks reasonable, actively harmful (e.g. premature pitch) |
| `irrelevant` | Irrelevant | 0 pts | Off-topic for this stakeholder/moment |

Turn 5 is a close — all options are close variants (`close_type` field), no type labelling. Player picks one.

**Implementation note:** `QuestionOptions` component gets a `key={`${state.currentStakeholderId}-${state.currentTurn}`}` prop to force remount on every turn/stakeholder change. This is critical — without it, the internal `useState(() => fisherYates(questions))` only initialises on mount and the shuffle goes stale.

---

## Competition Questions: Scope Rules

Competition (`competition` MEDDPICC tag) is scoped to **L1 and L2 only**.

- **L1 (practitioners):** Ask about tool frustrations and what peers at other companies used. Grounded in personal experience, not vendor strategy.
- **L2 (directors/managers):** Ask about vendor renewal timelines, cost growth, and alternatives considered at programme level.
- **L3/L4:** Competition tag is stripped. These stakeholders discuss strategy, budget, and platform — not competitive tooling. Any pre-existing competition-tagged questions at L3/L4 have had the tag removed (questions kept, tag deleted).

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
- **L1 (practitioners):** Tags limited to `identify_pain`, `metrics`, `decision_criteria`, `champion`, `competition`. NO `economic_buyer` or `decision_process`. Good: 3–5 pts. Mediocre: 1 pt. Trap: 0 pts. Irrelevant: 0 pts. Recovery: 2 pts.
- **L2 (managers/directors):** All tags valid. Good: 4–5 pts. Mediocre: 2 pts. Trap: 0 pts. Irrelevant: 0 pts. Recovery: 2 pts.
- **L3 (VPs):** All tags valid. Good: 5 pts. Mediocre: 2 pts. Trap: 0 pts. Irrelevant: 0 pts. Recovery: 3 pts.
- **L4 (C-suite):** All tags valid. Good: 5 pts. Mediocre: 2 pts. Trap: 0 pts. Irrelevant: 0 pts. Recovery: 3 pts.

### MEDDPICC Bars
Bars show fill colour + `score / max pts` only. **No percentage label** — removed from both the sidebar during simulation and the debrief page.

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

1. **Meeting debrief** (after each conversation) — all 4 options shown per turn, each with its type label, "← you chose this" marker if chosen, question text, and rationale.
2. **Final debrief** (`/debrief`) — collapsible section per stakeholder showing full turn history. Same 4-option-per-turn layout with rationale.

### TurnRecord (tracks shown options)

```typescript
export interface TurnRecord {
  stakeholderId: string;
  turnNumber: number;
  questionId: string;         // the question the player chose
  questionType: QuestionType;
  meddpiccTags: MeddpiccElement[];
  pointsEarned: number;
  shownQuestionIds: string[]; // all 4 options presented this turn
}
```

`shownQuestionIds` is populated in `simulation/page.tsx` by passing `shuffledQuestions.map(q => q.id)` into `processQuestionChoice`.

---

## Outcomes (9 total — in `src/lib/narrative.ts`)

Routing uses `accessLevel`, `blindSpots`, `momentum`, and `completedStakeholders`. Nine outcomes cover the full range of discovery quality and track coverage.

### Outcome Model
**Tier 1 — All 4 tracks adequately covered:** Full platform win.
**Tier 2 — Any 2+ tracks adequately covered:** Partial deal (variants by which tracks).
**Tier 3 — Any 1 track adequately covered:** Point solution.
**Tier 4 — No track adequately covered:** Deal fails.

**"Adequately covered" definition:**
- Observability / Security / Search: ≥3 stakeholders completed + senior stakeholder with `full_context` or better
- Platform: both Priya AND Mark completed with `full_context` or better

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

## Design Reference Document

`/outputs/build_design_doc.js` — Node.js script that generates `discovery_sim_design_reference.docx` from the seed JSON. Run it with:

```bash
cd /tmp/docbuild   # needs docx npm package; set up there
cp <outputs>/build_design_doc.js .
cp -r <outputs>/discovery-sim/src/data ./discovery-sim/src/
node build_design_doc.js
```

Section 7 of the doc pulls **all questions** from `question_content_seed.json` per stakeholder, grouped by turn and type, with full rationale. Regenerate the doc whenever seed data changes.

---

## Pending Work (priority order)

1. **Vercel KV integration** — user confirmed Vercel KV for persistence.
   - Name/email capture form on home page (`src/app/page.tsx`)
   - Store name/email in `sessionStorage` through to debrief
   - API route `POST /api/results` → save to KV, `GET /api/results` → fetch all
   - `/admin` page — table of all completions (DQI, outcome, MEDDPICC gaps, name, email, timestamp)
   - Requires: `npx vercel env pull .env.local` after connecting KV in Vercel dashboard
2. **T5 trap question rewrites** — currently too similar across stakeholders (all variations of "let me put together a proposal"). Need to be more stakeholder-specific to be genuine temptations.
3. **CLAUDE.md sync with seed** — after any bulk seed change, regenerate the design doc and verify question counts.

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
| All 4 options shown in debrief | Players should see what they missed — not just what they chose. Comparing options is where the learning happens. |
| Labels hidden during gameplay | Showing "High Yield / Trap" during play removes the decision challenge. Revealing after is the pedagogical moment. |
| Competition scoped to L1/L2 | Practitioners and managers encounter competitive tools. VPs and C-suite discuss strategy and budget — competition emerges from context, not direct questions. |
| No percentage on MEDDPICC bars | Percentage creates false precision and distracts. Score vs cap is sufficient. |
| L4 centred below grid | Priya and Mark are platform-track but represent the executive layer the whole org reports into. Visual positioning reflects organisational reality. |
| No rigid level progression | FEs encounter senior stakeholders early. The sim should reward preparation, not punish curiosity. |
| FE not "rep" language throughout | This is for Field Engineers. Sales language was specifically removed from case study and outcomes. |
| key prop on QuestionOptions | Forces remount on turn/stakeholder change so fisherYates shuffle re-runs. Without this, the internal useState only initialises on mount and questions go stale. |

---

## People

- **Hyder Khan** — builder (hyder.khan@elastic.co)
- **Nick** — Global Head of FE, requested the roleplay mechanic, primary stakeholder
- **Johnny** — co-reviewer, training delivery
