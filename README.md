# Discovery Simulation — Soha Inc.

MEDDPICC discovery training simulation for Elastic Field Engineering.

## What this is

A web app where players navigate a fictional B2C retailer (Soha Inc.) by choosing discovery questions across a ladder of stakeholders. Every choice is scored against MEDDPICC. The debrief shows a Discovery Quality Index and a narrative outcome describing the deal situation the player created.

**Full simulation (this build):** All four levels — 10 stakeholders, 243 questions. No login, no database. Runs entirely in the browser.

---

## Run locally

**Prerequisites:** Node.js 18+

```bash
cd discovery-sim
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and click "Add New Project"
3. Import the repo — Vercel auto-detects Next.js
4. Click Deploy

No environment variables needed for Phase 1.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Home screen
│   ├── briefing/page.tsx     # Pre-simulation briefing
│   ├── simulation/page.tsx   # Core game loop
│   └── debrief/page.tsx      # Results and scoring
├── lib/
│   ├── gameState.ts          # State machine — all game logic lives here
│   ├── scoring.ts            # MEDDPICC scoring, DQI calculation
│   └── narrative.ts          # Six narrative outcome resolution
├── types/index.ts            # All TypeScript types
└── data/
    └── question_content_seed.json   # All questions, responses, and tags
```

---

## Adding content (Levels 2–4)

All questions live in `src/data/question_content_seed.json`. To add Level 2 stakeholders:

1. Add new stakeholder objects to the `stakeholders` array following the same schema
2. Set `"level": 2` on each stakeholder
3. Set `"unlocks"` on Level 1 stakeholders to point to the relevant Level 2 IDs (already set for Alex → john_miller, Jordan → linda_chen, Dev → emily_rivera)
4. The game loop handles multi-level progression automatically

No code changes needed — content is fully data-driven.

---

## Phase 2 roadmap

- Supabase integration (persistent scores, auth)
- Player history screen
- Trainer dashboard with cohort analytics
- Levels 2–4 question content tagged and added

---

## Scoring model

**MEDDPICC Coverage Score (115 pts total)**

| Element | Max |
|---|---|
| Identify Pain | 25 |
| Metrics | 20 |
| Economic Buyer | 15 |
| Decision Criteria | 15 |
| Decision Process | 15 |
| Champion | 15 |
| Competition | 10 |

**Discovery Quality Index (DQI)**
`DQI = (MEDDPICC / 115 × 60) + (Narrative / 100 × 40) + full_sweep_bonus`

Full sweep bonus: +10 if all 7 elements have at least 1 point.

**Six narrative outcomes:** Trusted Partner, Strong Candidate, Technical Win Without the Business Win, Security-Only Deal, Stalled Proposal, Missed Opportunity.
