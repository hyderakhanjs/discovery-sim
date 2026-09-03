"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameState, MeddpiccElement, TurnRecord } from "@/types";
import { MEDDPICC_ELEMENTS, MEDDPICC_LABELS, MEDDPICC_MAX } from "@/types";
import { dqiTier, meddpiccCoverage } from "@/lib/scoring";
import { getOutcomeById } from "@/lib/narrative";
import seedData from "@/data/question_content_seed.json";

// ─── MEDDPICC COVERAGE BAR ───────────────────────────────────────────────────

function DebriefBar({ element, score }: { element: MeddpiccElement; score: number }) {
  const pct = meddpiccCoverage(element, score);
  const color =
    pct >= 80 ? "#00BFB3" : pct >= 50 ? "#0077CC" : pct >= 25 ? "#FEC514" : "#F04E98";
  const flag = pct < 25 ? "⚠ Critical miss" : pct < 50 ? "Needs work" : "";

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-white">{MEDDPICC_LABELS[element]}</span>
        <div className="flex items-center gap-3">
          {flag && (
            <span className="text-xs" style={{ color: pct < 25 ? "#F04E98" : "#FEC514" }}>
              {flag}
            </span>
          )}
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        {score} / {MEDDPICC_MAX[element]} pts
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_STAKEHOLDERS: any[] = (seedData as any).stakeholders;

function lookupQuestion(stakeholderId: string, questionId: string) {
  const s = ALL_STAKEHOLDERS.find((st: { id: string }) => st.id === stakeholderId);
  return s?.questions?.find((q: { id: string }) => q.id === questionId) ?? null;
}

function lookupStakeholderName(id: string): string {
  return ALL_STAKEHOLDERS.find((s: { id: string }) => s.id === id)?.name ?? id;
}

// ─── TURN FEEDBACK ───────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  good:     { label: "High Yield",  color: "#00BFB3", bg: "rgba(0,191,179,0.08)" },
  mediocre: { label: "Mediocre",    color: "#FEC514", bg: "rgba(254,197,20,0.08)" },
  trap:     { label: "Low Yield",   color: "#F04E98", bg: "rgba(240,78,152,0.08)" },
  recovery: { label: "Recovery",    color: "#0077CC", bg: "rgba(0,119,204,0.08)" },
};

function TurnFeedback({ history }: { history: TurnRecord[] }) {
  const [open, setOpen] = useState<string | null>(null);

  // Group by stakeholder in order of first appearance
  const grouped: { stakeholderId: string; turns: TurnRecord[] }[] = [];
  for (const t of history) {
    const last = grouped[grouped.length - 1];
    if (last && last.stakeholderId === t.stakeholderId) {
      last.turns.push(t);
    } else {
      grouped.push({ stakeholderId: t.stakeholderId, turns: [t] });
    }
  }

  return (
    <div className="space-y-3">
      {grouped.map(({ stakeholderId, turns }) => (
        <div key={stakeholderId + turns[0].turnNumber}
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ background: "var(--card)" }}
            onClick={() => setOpen(open === stakeholderId ? null : stakeholderId)}>
            <span className="text-sm font-semibold text-white">
              {lookupStakeholderName(stakeholderId)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {turns.length} question{turns.length !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                {open === stakeholderId ? "▲" : "▼"}
              </span>
            </div>
          </button>

          {open === stakeholderId && (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {turns.map((t) => {
                const q = lookupQuestion(t.stakeholderId, t.questionId);
                const style = TYPE_STYLES[t.questionType] ?? TYPE_STYLES.mediocre;
                return (
                  <div key={t.questionId} className="px-4 py-4"
                    style={{ background: style.bg }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--card)", color: style.color, border: `1px solid ${style.color}` }}>
                        {style.label}
                      </span>
                      <span className="text-xs font-mono" style={{ color: style.color }}>
                        +{t.pointsEarned} pts
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: "var(--text)" }}>
                      &ldquo;{q?.question_text ?? t.questionId}&rdquo;
                    </p>
                    {q?.rationale && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                        {q.rationale}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── QUESTION TYPE SUMMARY ───────────────────────────────────────────────────

function TurnSummary({ history }: { history: GameState["turnHistory"] }) {
  const counts = { good: 0, mediocre: 0, trap: 0, recovery: 0 };
  for (const t of history) counts[t.questionType]++;

  const items = [
    { type: "good", label: "Good questions", color: "#00BFB3" },
    { type: "mediocre", label: "Mediocre questions", color: "#FEC514" },
    { type: "trap", label: "Trap questions", color: "#F04E98" },
    { type: "recovery", label: "Recoveries used", color: "#0077CC" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ type, label, color }) => (
        <div key={type} className="rounded-lg p-3 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-2xl font-bold" style={{ color }}>
            {counts[type]}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN DEBRIEF ─────────────────────────────────────────────────────────────

export default function Debrief() {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("gameResult");
    if (raw) {
      setState(JSON.parse(raw) as GameState);
    } else {
      router.push("/");
    }
  }, [router]);

  if (!state) return null;

  const dqi = state.dqi ?? 0;
  const tier = dqiTier(dqi);
  const outcome = state.outcomeId ? getOutcomeById(state.outcomeId) : null;
  const totalPoints = Object.values(state.meddpiccScores).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--muted)" }}>
          Simulation Complete · Debrief
        </div>

        {/* DQI Score */}
        <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 mb-4"
          style={{ borderColor: tier.color.replace("text-", "").replace("-400", "") }}>
          <span className="text-4xl font-bold text-white">{dqi}</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>/ 100</span>
        </div>

        <div className={`text-2xl font-bold mb-1 ${tier.color}`}>
          {tier.label}
        </div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Discovery Quality Index · {totalPoints} MEDDPICC points earned
        </div>
      </div>

      {/* Narrative Outcome */}
      {outcome && (
        <section className="mb-8 rounded-xl p-6 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--accent-pink)" }}>
            Your Deal
          </div>
          <h2 className="text-xl font-bold text-white mb-3">{outcome.title}</h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text)" }}>
            {outcome.story}
          </p>

          <div className="pt-4 border-t space-y-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "#FEC514" }}>
                The Turning Point
              </div>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {outcome.turningPoint}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "#0077CC" }}>
                The Alternate Path
              </div>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {outcome.alternatePath}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* MEDDPICC breakdown */}
      <section className="mb-8 rounded-xl p-6 border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-5"
          style={{ color: "var(--accent-blue)" }}>
          MEDDPICC Coverage
        </div>
        {MEDDPICC_ELEMENTS.map((el) => (
          <DebriefBar key={el} element={el} score={state.meddpiccScores[el]} />
        ))}
      </section>

      {/* Turn breakdown */}
      <section className="mb-8 rounded-xl p-6 border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-blue)" }}>
          Question Breakdown
        </div>
        <TurnSummary history={state.turnHistory} />
        <div className="mt-4 pt-4 border-t text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <div className="flex justify-between">
            <span>Narrative score</span>
            <span className="text-white font-medium">{state.narrativeScore} / 100</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Momentum</span>
            <span className="text-white font-medium">
              {state.momentum > 0 ? "+" : ""}{state.momentum.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Access level</span>
            <span className="text-white font-medium">{state.accessLevel} / 3</span>
          </div>
        </div>
      </section>

      {/* Turn-by-turn feedback */}
      <section className="mb-8 rounded-xl p-6 border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-5"
          style={{ color: "var(--accent-blue)" }}>
          Question Feedback
        </div>
        <p className="text-xs mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>
          Click a stakeholder to see every question you asked, why it scored the way it did, and what a stronger choice would have looked like.
        </p>
        <TurnFeedback history={state.turnHistory} />
      </section>

      {/* CTA */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            sessionStorage.removeItem("gameResult");
            router.push("/");
          }}
          className="flex-1 py-3 rounded-xl font-semibold border transition-all hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
          Play Again
        </button>
        <button
          onClick={() => router.push("/simulation")}
          className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
          style={{ background: "var(--accent-pink)", color: "white" }}>
          Try Different Path
        </button>
      </div>
    </main>
  );
}
