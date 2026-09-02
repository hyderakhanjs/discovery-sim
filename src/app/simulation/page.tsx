"use client";

import { useState, useEffect } from "react";
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

// ─── CONTEXT STATE BADGE ──────────────────────────────────────────────────────

function ContextBadge({ state }: { state: ContextState }) {
  const cfg = {
    cold:   { label: "cold",   color: "var(--muted)",   dot: "var(--border)" },
    warm:   { label: "warm",   color: "#FEC514",        dot: "#FEC514" },
    primed: { label: "primed", color: "#F04E98",        dot: "#F04E98" },
  };
  const { label, color, dot } = cfg[state];
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      <span className="text-xs" style={{ color }}>{label}</span>
    </span>
  );
}

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
  onEnd: () => void;
}) {
  return (
    <div className="fade-in">
      {completedName && (
        <div className="rounded-xl p-4 border mb-6"
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
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--muted)" }}>
            Choose your starting point
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Start anywhere — top-down, bottom-up, or lateral. Context builds as you go.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--border)" }} /> cold — limited depth
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FEC514" }} /> warm — full questions
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F04E98" }} /> primed — bonus points
        </span>
      </div>

      {/* 2D grid: tracks × levels */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: "480px" }}>
          <thead>
            <tr>
              <th className="text-left pb-2 pr-3 text-xs font-semibold uppercase tracking-wider w-8"
                style={{ color: "var(--muted)" }}>
                Lvl
              </th>
              {TRACKS.map((t) => (
                <th key={t.id} className="text-left pb-2 px-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: t.color }}>
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((level) => (
              <tr key={level}>
                <td className="pr-3 py-2 text-xs font-bold" style={{ color: "var(--muted)" }}>
                  L{level}
                </td>
                {TRACKS.map((track) => {
                  const s = STAKEHOLDERS.find(
                    (st) => st.level === level && st.track === track.id
                  );
                  if (!s) {
                    return <td key={track.id} className="px-2 py-2" />;
                  }
                  const isCompleted = completedIds.includes(s.id);
                  const isCurrent = s.id === currentId && !completedIds.includes(s.id);
                  const ctx = contextStates[s.id] ?? "cold";

                  return (
                    <td key={track.id} className="px-2 py-2">
                      <button
                        onClick={() => !isCompleted && onChoose(s.id)}
                        disabled={isCompleted}
                        className="w-full text-left rounded-lg p-3 border transition-all duration-200 disabled:cursor-default"
                        style={{
                          background: isCompleted
                            ? "rgba(0,191,179,0.08)"
                            : isCurrent
                            ? "rgba(240,78,152,0.1)"
                            : "var(--card)",
                          borderColor: isCompleted
                            ? "#00BFB3"
                            : isCurrent
                            ? "#F04E98"
                            : ctx === "primed"
                            ? "#F04E98"
                            : ctx === "warm"
                            ? track.color
                            : "var(--border)",
                          opacity: isCompleted ? 0.6 : 1,
                        }}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-semibold text-xs leading-tight"
                            style={{ color: isCompleted ? "#00BFB3" : "var(--text)" }}>
                            {s.name}
                            {isCompleted && " ✓"}
                          </span>
                        </div>
                        <div className="text-xs truncate mb-1.5" style={{ color: "var(--muted)" }}>
                          {s.title}
                        </div>
                        {!isCompleted && <ContextBadge state={ctx} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* End simulation */}
      {completedIds.length > 0 && (
        <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onEnd}
            className="w-full py-3 rounded-xl font-semibold border transition-all hover:opacity-80 text-sm"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--card)" }}>
            End Simulation & See Results →
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
        <ContextBadge state={contextState} />
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

  function handleEndSimulation() {
    const ended = endSimulationEarly(state);
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
    </div>
  );
}
