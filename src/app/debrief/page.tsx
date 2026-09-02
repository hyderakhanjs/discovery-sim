"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameState, MeddpiccElement } from "@/types";
import { MEDDPICC_ELEMENTS, MEDDPICC_LABELS, MEDDPICC_MAX } from "@/types";
import { dqiTier, meddpiccCoverage } from "@/lib/scoring";
import { getOutcomeById } from "@/lib/narrative";

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
