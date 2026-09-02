"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { GameState, Stakeholder, Question, ContextState } from "@/types";
import { MEDDPICC_ELEMENTS, MEDDPICC_LABELS } from "@/types";
import {
  createInitialState,
  processQuestionChoice,
  advanceToStakeholder,
  endSimulationEarly,
  finalizeGame,
} from "@/lib/gameState";
import { meddpiccCoverage } from "@/lib/scoring";
import seedData from "@/data/question_content_seed.json";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const STAKEHOLDERS: Stakeholder[] = seedData.stakeholders as Stakeholder[];

const TRACKS = [
  { id: "observability", label: "Observability", color: "#00BFB3" },
  { id: "security",      label: "Security",      color: "#0077CC" },
  { id: "search",        label: "Search/Ecomm",  color: "#FEC514" },
  { id: "platform",      label: "Platform",      color: "#F04E98" },
] as const;

function getStakeholder(id: string): Stakeholder | undefined {
  return STAKEHOLDERS.find((s) => s.id === id);
}

function getQuestion(stakeholderId: string, questionId: string): Question | undefined {
  return getStakeholder(stakeholderId)?.questions.find((q) => q.id === questionId);
}

function getAvailableQuestions(stakeholderId: string, questionIds: string[]): Question[] {
  const s = getStakeholder(stakeholderId);
  if (!s) return [];
  return s.questions.filter((q) => questionIds.includes(q.id));
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── STAKEHOLDER BACKGROUNDS ─────────────────────────────────────────────────

const STAKEHOLDER_BACKGROUNDS: Record<string, string> = {
  alex_chen:      "Alex manages production deployments and on-call rotations. He filed the Black Friday incident report and has the raw logs.",
  jordan_lee:     "Jordan monitors security alerts and handles incident response. She recently flagged unusual data exfiltration patterns no one has acted on.",
  dev_patel:      "Dev built Soha's product search and recommendation engine. He knows exactly where performance breaks under load — and what it costs.",
  john_miller:    "John owns the data center migration timeline. He's under pressure to cut costs while the new CIO reshapes the entire roadmap.",
  linda_chen:     "Linda is building the case for a security platform consolidation. She's frustrated that three separate tools don't talk to each other.",
  emily_rivera:   "Emily owns revenue for digital channels. The Black Friday outage hit her P&L directly — she has the exact numbers and the board wants answers.",
  maria_torres:   "Maria is connecting search performance to customer lifetime value. She needs a story that resonates at the board level.",
  sarah_patel:    "Sarah is the broker between engineering and the C-suite. She controls access to Priya and Mark — and she'll test you before she lets you in.",
  priya_desai:    "Priya has an 18-month AI mandate and a migration to close. She needs one platform that can do it all — and she's already talking to competitors.",
  mark_reynolds:  "Mark is scrutinizing every vendor contract. He wants a 20% cost reduction and will push for a competitive bake-off if he doesn't see a clear ROI story.",
};

// ─── RELATIONSHIP LINES ───────────────────────────────────────────────────────

// [fromId, toId, strokeColor, dashed?]
const RELATIONSHIPS: Array<[string, string, string, boolean]> = [
  ["alex_chen",    "john_miller",   "#00BFB3", false],
  ["jordan_lee",   "linda_chen",    "#0077CC", false],
  ["dev_patel",    "emily_rivera",  "#FEC514", false],
  ["emily_rivera", "maria_torres",  "#FEC514", false],
  ["john_miller",  "sarah_patel",   "rgba(160,160,160,0.45)", true],
  ["linda_chen",   "sarah_patel",   "rgba(160,160,160,0.45)", true],
  ["maria_torres", "sarah_patel",   "rgba(160,160,160,0.45)", true],
  ["sarah_patel",  "priya_desai",   "#F04E98", false],
  ["sarah_patel",  "mark_reynolds", "#F04E98", false],
];

// ─── STAKEHOLDER MAP (2D GRID) ────────────────────────────────────────────────

function StakeholderMap({
  contextStates,
  completedIds,
  currentId,
  completedName,
  onChoose,
  onEnd,
}: {
  contextStates: Record<string, ContextState>;
  completedIds: string[];
  currentId: string;
  completedName?: string;
  onChoose: (id: string) => void;
  onEnd: (penalized: boolean) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color: string; dashed: boolean }>>([]);

  // Compute SVG line coordinates from actual DOM positions
  useEffect(() => {
    function compute() {
      const container = gridRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const computed = RELATIONSHIPS.map(([fromId, toId, color, dashed]) => {
        const fromEl = container.querySelector<HTMLElement>(`[data-sid="${fromId}"]`);
        const toEl = container.querySelector<HTMLElement>(`[data-sid="${toId}"]`);
        if (!fromEl || !toEl) return null;
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        return {
          x1: fr.left + fr.width / 2 - rect.left,
          y1: fr.top + fr.height / 2 - rect.top,
          x2: tr.left + tr.width / 2 - rect.left,
          y2: tr.top + tr.height / 2 - rect.top,
          color, dashed,
        };
      }).filter(Boolean) as typeof lines;
      setLines(computed);
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  const hasTraversedBranch = completedIds.some(
    (id) => (STAKEHOLDERS.find((s) => s.id === id)?.level ?? 0) >= 2
  );

  function handleReadyToSolution() {
    if (!hasTraversedBranch) setShowWarning(true);
    else onEnd(false);
  }

  return (
    <div className="fade-in">
      {completedName && (
        <div className="rounded-xl p-4 border mb-4"
          style={{ background: "rgba(0,191,179,0.08)", borderColor: "#00BFB3" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#00BFB3" }}>
            Conversation Complete
          </div>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            Done with <strong>{completedName}</strong>. Who do you want to talk to next?
          </p>
        </div>
      )}

      {!completedName && (
        <div className="mb-4">
          <p className="text-sm font-medium" style={{ color: "#00BFB3" }}>
            Start anywhere — top-down, bottom-up, or lateral.
          </p>
        </div>
      )}

      {/* Hover background panel */}
      <div className="rounded-lg px-4 py-2.5 mb-4 text-xs border" style={{ minHeight: "38px", background: "rgba(255,255,255,0.03)", borderColor: "var(--border)" }}>
        {hoveredId && STAKEHOLDER_BACKGROUNDS[hoveredId]
          ? <span style={{ color: "var(--muted)" }}>{STAKEHOLDER_BACKGROUNDS[hoveredId]}</span>
          : <span style={{ color: "var(--border)" }}>Hover a persona to learn about them</span>
        }
      </div>

      {/* Grid with SVG relationship overlay */}
      <div style={{ overflowX: "auto" }}>
        <div ref={gridRef} style={{ position: "relative", minWidth: "1400px" }}>

          {/* SVG lines — absolutely fills the grid content area */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
            {lines.map((l, i) => (
              <line key={i}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.color}
                strokeWidth={l.dashed ? 1.5 : 2.5}
                strokeDasharray={l.dashed ? "6 4" : undefined}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* CSS grid: level col + 4 track cols */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 1fr 1fr 1fr",
            gap: "16px",
            position: "relative",
          }}>
            {[1, 2, 3, 4].map((level) => (
              <React.Fragment key={level}>
                <div style={{ display: "flex", alignItems: "center", fontSize: "11px", fontWeight: 700, color: "var(--muted)" }}>
                  L{level}
                </div>
                {TRACKS.map((track) => {
                  const stakeholdersInCell = STAKEHOLDERS.filter(
                    (st) => st.level === level && st.track === track.id
                  );
                  if (stakeholdersInCell.length === 0) return <div key={`${level}-${track.id}`} />;
                  return (
                    <div key={`${level}-${track.id}`} style={{ display: "flex", gap: "4px" }}>
                      {stakeholdersInCell.map((s) => {
                        const isCompleted = completedIds.includes(s.id);
                        const isCurrent = s.id === currentId && !isCompleted;
                        const ctx = contextStates[s.id] ?? "cold";
                        return (
                          <button
                            key={s.id}
                            data-sid={s.id}
                            onClick={() => !isCompleted && onChoose(s.id)}
                            onMouseEnter={() => setHoveredId(s.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            disabled={isCompleted}
                            className="text-left rounded-lg border transition-all duration-200 disabled:cursor-default hover:scale-[1.02]"
                            style={{
                              flex: 1, padding: "16px 14px",
                              background: isCompleted ? "rgba(0,191,179,0.08)" : isCurrent ? "rgba(240,78,152,0.1)" : "var(--card)",
                              borderColor: isCompleted ? "#00BFB3" : isCurrent ? "#F04E98" : ctx === "primed" ? "#F04E98" : ctx === "warm" ? track.color : "var(--border)",
                              opacity: isCompleted ? 0.65 : 1,
                            }}>
                            <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.3, marginBottom: "4px", color: isCompleted ? "#00BFB3" : "var(--text)" }}>
                              {s.name}{isCompleted && " ✓"}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.title}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Early exit warning */}
      {showWarning && (
        <div className="mt-5 rounded-xl p-5 border"
          style={{ background: "rgba(240,78,152,0.08)", borderColor: "#F04E98" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#F04E98" }}>
            Discovery Incomplete
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
            You haven&apos;t explored any vertical branches yet. Going to solution now will cost you
            <strong style={{ color: "#F04E98" }}> −20 DQI points</strong> in your final score. Are you sure?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowWarning(false)}
              className="flex-1 py-2.5 rounded-xl text-sm border transition-all hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
              Keep Discovering
            </button>
            <button onClick={() => onEnd(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#F04E98", color: "white" }}>
              Proceed Anyway
            </button>
          </div>
        </div>
      )}

      {/* Ready to Solution */}
      {completedIds.length > 0 && !showWarning && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={handleReadyToSolution}
            className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90 text-sm"
            style={{ background: "var(--accent-pink)", color: "white" }}>
            Ready to Solution! →
          </button>
          <p className="text-xs text-center mt-2" style={{ color: "var(--muted)" }}>
            {completedIds.length} of {STAKEHOLDERS.length} stakeholders completed
          </p>
        </div>
      )}
    </div>
  );
}

// ─── MEDDPICC BAR ─────────────────────────────────────────────────────────────

function MeddpiccBar({ element, score }: { element: typeof MEDDPICC_ELEMENTS[number]; score: number }) {
  const pct = meddpiccCoverage(element, score);
  const color = pct >= 80 ? "#00BFB3" : pct >= 50 ? "#0077CC" : pct >= 25 ? "#FEC514" : "#F04E98";
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{MEDDPICC_LABELS[element]}</span>
        <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── STAKEHOLDER HEADER ───────────────────────────────────────────────────────

function StakeholderHeader({ stakeholder, turn, contextState }: { stakeholder: Stakeholder; turn: number; contextState: ContextState }) {
  const trackColor = TRACKS.find((t) => t.id === stakeholder.track)?.color ?? "#F04E98";
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
        style={{ background: trackColor, color: stakeholder.track === "search" ? "#000" : "#fff" }}>
        {stakeholder.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white">{stakeholder.name}</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>{stakeholder.title}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>Turn {turn} of 5</div>
        <div className="flex gap-1 mt-1 justify-end">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background: i < turn - 1 ? "#00BFB3" : i === turn - 1 ? "#F04E98" : "var(--border)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION OPTIONS ─────────────────────────────────────────────────────────

function QuestionOptions({ questions, onChoose, disabled }: { questions: Question[]; onChoose: (q: Question) => void; disabled: boolean }) {
  const letters = ["A", "B", "C"];
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <button key={q.id} onClick={() => !disabled && onChoose(q)} disabled={disabled}
          className="w-full text-left rounded-xl p-4 border transition-all duration-200 hover:border-pink-500 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: "var(--border)", color: "var(--muted)" }}>
              {letters[i]}
            </span>
            <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{q.question_text}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── RESPONSE DISPLAY ─────────────────────────────────────────────────────────

function ResponseDisplay({ responseText, onContinue }: { responseText: string; questionType: string | null; onContinue: () => void }) {
  return (
    <div className="fade-in">
      <div className="rounded-xl p-5 border mb-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>Response</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{responseText}</p>
      </div>
      <button onClick={onContinue} className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ background: "var(--accent-blue)", color: "white" }}>
        Continue →
      </button>
    </div>
  );
}

// ─── BRIEFING CARD ────────────────────────────────────────────────────────────

function BriefingCard({ text, onContinue }: { text: string; onContinue: () => void }) {
  return (
    <div className="fade-in mt-4">
      <div className="rounded-xl p-6 border mb-5" style={{ background: "rgba(254,197,20,0.08)", borderColor: "#FEC514" }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "#FEC514" }}>★</span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FEC514" }}>Insider Briefing Unlocked</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{text}</p>
      </div>
      <button onClick={onContinue} className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ background: "var(--accent-yellow)", color: "#000" }}>
        Continue →
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Simulation() {
  const router = useRouter();

  const [state, setState] = useState<GameState>(() => {
    const first = STAKEHOLDERS[0];
    if (!first) throw new Error("No stakeholders found");
    const turn1Questions = first.questions.filter((q) => q.turn === 1);
    // Start in handoff phase so player picks first stakeholder from the map
    const initial = createInitialState(first.id, turn1Questions.map((q) => q.id), STAKEHOLDERS);
    return { ...initial, phase: "handoff" };
  });

  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [lastCompletedName, setLastCompletedName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const qs = getAvailableQuestions(state.currentStakeholderId, state.availableQuestionIds);
    setShuffledQuestions(shuffleArray(qs));
  }, [state.currentStakeholderId, state.availableQuestionIds]);

  // Route to debrief when complete
  useEffect(() => {
    if (state.phase === "complete" && state.dqi === null) {
      const final = finalizeGame(state);
      sessionStorage.setItem("gameResult", JSON.stringify(final));
      router.push("/debrief");
    }
  }, [state.phase, state.dqi, router, state]);

  const currentStakeholder = getStakeholder(state.currentStakeholderId);
  const currentContextState = state.stakeholderContextStates[state.currentStakeholderId] ?? "cold";

  function handleQuestionChoice(question: Question) {
    const next = processQuestionChoice(state, question, STAKEHOLDERS);
    setState(next);
  }

  function handleContinueFromResponse() {
    if (state.phase !== "response") return;
    const lastTurn = state.turnHistory[state.turnHistory.length - 1];
    const q = getQuestion(state.currentStakeholderId, lastTurn?.questionId ?? "");
    if (q?.close_type) {
      if (q.triggers_briefing && currentStakeholder?.insider_briefing_for_next) {
        setState((s) => ({ ...s, phase: "briefing", insiderBriefing: currentStakeholder.insider_briefing_for_next ?? null }));
      } else {
        setLastCompletedName(currentStakeholder?.name);
        setState((s) => ({ ...s, phase: "handoff" }));
      }
    } else {
      setState((s) => ({ ...s, phase: "question" }));
    }
  }

  function handleBriefingContinue() {
    setLastCompletedName(currentStakeholder?.name);
    setState((s) => ({ ...s, phase: "handoff" }));
  }

  function handleChooseNextStakeholder(id: string) {
    setLastCompletedName(undefined);
    const next = advanceToStakeholder(state, id, STAKEHOLDERS);
    setState(next);
  }

  function handleEndCall() {
    setLastCompletedName(undefined);
    setState((s) => ({ ...s, phase: "handoff" }));
  }

  function handleEndSimulation(penalized: boolean) {
    const base = penalized
      ? { ...state, narrativeScore: Math.max(0, state.narrativeScore - 20) }
      : state;
    const ended = endSimulationEarly(base);
    setState(ended);
  }

  if (!currentStakeholder) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>

      {/* ── Left sidebar: MEDDPICC tracker ── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r p-5"
        style={{ borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--muted)" }}>
          MEDDPICC
        </div>
        {MEDDPICC_ELEMENTS.map((el) => (
          <MeddpiccBar key={el} element={el} score={state.meddpiccScores[el]} />
        ))}

        <div className="mt-5 pt-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <div className="flex justify-between mb-1">
            <span>Completed</span>
            <span className="text-white">{state.completedStakeholders.length} / {STAKEHOLDERS.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Momentum</span>
            <span style={{ color: state.momentum >= 0 ? "#00BFB3" : "#F04E98" }}>
              {state.momentum > 0 ? "+" : ""}{state.momentum.toFixed(1)}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto px-4 py-8">

        {/* Show stakeholder header only when in a conversation */}
        {(state.phase === "question" || state.phase === "response" || state.phase === "briefing") && (
          <StakeholderHeader
            stakeholder={currentStakeholder}
            turn={state.currentTurn}
            contextState={currentContextState}
          />
        )}

        {state.phase === "question" && (
          <div className="fade-in">
            <div className="text-sm mb-5" style={{ color: "var(--muted)" }}>Choose your next question:</div>
            <QuestionOptions questions={shuffledQuestions} onChoose={handleQuestionChoice} disabled={false} />
            <div className="mt-5">
              <button
                onClick={handleEndCall}
                className="w-full py-2.5 rounded-xl text-sm border transition-all hover:opacity-80"
                style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--card)" }}>
                End Call
              </button>
            </div>
          </div>
        )}

        {state.phase === "response" && (
          <ResponseDisplay
            responseText={state.lastResponseText}
            questionType={state.lastQuestionType}
            onContinue={handleContinueFromResponse}
          />
        )}

        {state.phase === "briefing" && state.insiderBriefing && (
          <>
            <ResponseDisplay
              responseText={state.lastResponseText}
              questionType={state.lastQuestionType}
              onContinue={() => {}}
            />
            <BriefingCard text={state.insiderBriefing} onContinue={handleBriefingContinue} />
          </>
        )}

        {state.phase === "handoff" && (
          <StakeholderMap
            contextStates={state.stakeholderContextStates}
            completedIds={state.completedStakeholders}
            currentId={state.currentStakeholderId}
            completedName={lastCompletedName}
            onChoose={handleChooseNextStakeholder}
            onEnd={handleEndSimulation}
          />
        )}

        {/* Mobile MEDDPICC strip */}
        {state.phase !== "handoff" && (
          <div className="lg:hidden mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              MEDDPICC
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              {MEDDPICC_ELEMENTS.map((el) => (
                <MeddpiccBar key={el} element={el} score={state.meddpiccScores[el]} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Right sidebar: Case study ── */}
      <aside className="hidden xl:flex flex-col w-64 flex-shrink-0 border-l p-6"
        style={{ borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-blue)" }}>
          The Situation
        </div>

        <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--muted)" }}>
          Soha Inc. is a mid-market B2C retailer in the middle of a data center migration.
          Their Black Friday outage cost <strong style={{ color: "var(--text)" }}>seven figures in a single day</strong>.
          The root cause is still unclear.
        </p>

        <div className="space-y-3 mb-5">
          {[
            { label: "CFO Mandate", value: "20% cost reduction" },
            { label: "CIO Agenda", value: "AI platform in 18 months" },
            { label: "Decision Window", value: "60 days" },
            { label: "Trigger Event", value: "Black Friday outage" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-3 border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{label}</div>
              <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--accent-yellow)" }}>
            What&apos;s at Stake
          </div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            The migration closes the door on a platform decision in 60 days. Miss this window
            and the opportunity locks out for 18–24 months.
          </p>
          <a
            href="#"
            className="flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{ color: "var(--accent-blue)", fontSize: "13px", fontWeight: 500 }}>
            <span>📄</span>
            <span>Read the Soha Inc. case study →</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
