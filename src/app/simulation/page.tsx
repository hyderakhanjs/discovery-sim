"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { GameState, Stakeholder, Question } from "@/types";
import { MEDDPICC_ELEMENTS, MEDDPICC_LABELS, MEDDPICC_MAX } from "@/types";
import {
  createInitialState,
  processQuestionChoice,
  advanceToStakeholder,
  finalizeGame,
} from "@/lib/gameState";
import { meddpiccCoverage } from "@/lib/scoring";
import seedData from "@/data/question_content_seed.json";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const STAKEHOLDERS: Stakeholder[] = seedData.stakeholders as Stakeholder[];

function getStakeholder(id: string): Stakeholder | undefined {
  return STAKEHOLDERS.find((s) => s.id === id);
}

function getQuestion(stakeholderId: string, questionId: string): Question | undefined {
  const s = getStakeholder(stakeholderId);
  return s?.questions.find((q) => q.id === questionId);
}

function getAvailableQuestions(stakeholderId: string, questionIds: string[]): Question[] {
  const s = getStakeholder(stakeholderId);
  if (!s) return [];
  return s.questions.filter((q) => questionIds.includes(q.id));
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── MEDDPICC BAR ─────────────────────────────────────────────────────────────

function MeddpiccBar({
  element,
  score,
  animate = false,
}: {
  element: typeof MEDDPICC_ELEMENTS[number];
  score: number;
  animate?: boolean;
}) {
  const pct = meddpiccCoverage(element, score);
  const color =
    pct >= 80 ? "#00BFB3" : pct >= 50 ? "#0077CC" : pct >= 25 ? "#FEC514" : "#F04E98";

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {MEDDPICC_LABELS[element]}
        </span>
        <span className="text-xs font-mono" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── STAKEHOLDER CARD ─────────────────────────────────────────────────────────

function StakeholderHeader({ stakeholder, turn }: { stakeholder: Stakeholder; turn: number }) {
  const levelColors = ["", "#00BFB3", "#0077CC", "#FEC514", "#F04E98"];
  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
        style={{ background: levelColors[stakeholder.level] ?? "#F04E98", color: stakeholder.level === 3 ? "#000" : "#fff" }}>
        {stakeholder.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white">{stakeholder.name}</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>{stakeholder.title}</div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          Turn {turn} of 5
        </div>
        <div className="flex gap-1 mt-1 justify-end">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: i < turn - 1 ? "#00BFB3" : i === turn - 1 ? "#F04E98" : "var(--border)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION OPTIONS ─────────────────────────────────────────────────────────

function QuestionOptions({
  questions,
  onChoose,
  disabled,
}: {
  questions: Question[];
  onChoose: (q: Question) => void;
  disabled: boolean;
}) {
  const letters = ["A", "B", "C"];
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <button
          key={q.id}
          onClick={() => !disabled && onChoose(q)}
          disabled={disabled}
          className="w-full text-left rounded-xl p-4 border transition-all duration-200 hover:border-pink-500 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex gap-3">
            <span
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: "var(--border)", color: "var(--muted)" }}>
              {letters[i]}
            </span>
            <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
              {q.question_text}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── RESPONSE DISPLAY ─────────────────────────────────────────────────────────

function ResponseDisplay({
  responseText,
  questionType,
  onContinue,
}: {
  responseText: string;
  questionType: string | null;
  onContinue: () => void;
}) {
  const typeConfig = {
    good: { label: "Good question", color: "#00BFB3", bg: "rgba(0,191,179,0.1)" },
    mediocre: { label: "Mediocre question", color: "#FEC514", bg: "rgba(254,197,20,0.1)" },
    trap: { label: "Trap question", color: "#F04E98", bg: "rgba(240,78,152,0.1)" },
    recovery: { label: "Recovery", color: "#0077CC", bg: "rgba(0,119,204,0.1)" },
  };

  // Don't reveal type during play — shown after continue
  const showType = false; // flip to true for debug mode

  return (
    <div className="fade-in">
      <div className="rounded-xl p-5 border mb-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--muted)" }}>
          Response
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {responseText}
        </p>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ background: "var(--accent-blue)", color: "white" }}>
        Continue →
      </button>
    </div>
  );
}

// ─── BRIEFING CARD ────────────────────────────────────────────────────────────

function BriefingCard({ text, onContinue }: { text: string; onContinue: () => void }) {
  return (
    <div className="fade-in">
      <div className="rounded-xl p-6 border mb-5"
        style={{ background: "rgba(254,197,20,0.08)", borderColor: "#FEC514" }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "#FEC514" }}>★</span>
          <span className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#FEC514" }}>
            Insider Briefing Unlocked
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {text}
        </p>
      </div>
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
        style={{ background: "var(--accent-yellow)", color: "#000" }}>
        Continue to Next Stakeholder →
      </button>
    </div>
  );
}

// ─── HANDOFF SCREEN ───────────────────────────────────────────────────────────

function HandoffScreen({
  completedName,
  unlockedStakeholders,
  completedIds,
  onChoose,
}: {
  completedName: string;
  unlockedStakeholders: string[];
  completedIds: string[];
  onChoose: (id: string) => void;
}) {
  const available = unlockedStakeholders.filter((id) => !completedIds.includes(id));
  return (
    <div className="fade-in">
      <div className="rounded-xl p-5 border mb-5"
        style={{ background: "rgba(0,191,179,0.08)", borderColor: "#00BFB3" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: "#00BFB3" }}>
          Conversation Complete
        </div>
        <p className="text-sm" style={{ color: "var(--text)" }}>
          Your conversation with <strong>{completedName}</strong> is done.
        </p>
      </div>

      {available.length > 0 && (
        <>
          <div className="text-sm mb-3" style={{ color: "var(--muted)" }}>
            Who do you want to talk to next?
          </div>
          <div className="space-y-2">
            {available.map((id) => {
              const s = getStakeholder(id);
              if (!s) return null;
              return (
                <button
                  key={id}
                  onClick={() => onChoose(id)}
                  className="w-full text-left rounded-xl p-4 border transition-all hover:border-pink-500"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="font-semibold text-white text-sm">{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{s.title}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Simulation() {
  const router = useRouter();

  // Boot state from first stakeholder
  const [state, setState] = useState<GameState>(() => {
    const first = STAKEHOLDERS.find((s) => s.level === 1);
    if (!first) throw new Error("No Level 1 stakeholders found");
    const turn1Questions = first.questions.filter((q) => q.turn === 1);
    return createInitialState(first.id, turn1Questions.map((q) => q.id));
  });

  // Shuffled questions for current turn (re-shuffle when turn changes)
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const qs = getAvailableQuestions(state.currentStakeholderId, state.availableQuestionIds);
    setShuffledQuestions(shuffleArray(qs));
  }, [state.currentStakeholderId, state.availableQuestionIds]);

  // When game is complete, finalize and go to debrief
  useEffect(() => {
    if (state.phase === "complete" && state.dqi === null) {
      const final = finalizeGame(state);
      // Store in sessionStorage for debrief page
      sessionStorage.setItem("gameResult", JSON.stringify(final));
      router.push("/debrief");
    }
  }, [state.phase, state.dqi, router, state]);

  const currentStakeholder = getStakeholder(state.currentStakeholderId);

  function handleQuestionChoice(question: Question) {
    const next = processQuestionChoice(state, question, STAKEHOLDERS);
    setState(next);
  }

  function handleContinueFromResponse() {
    if (state.phase === "response" && state.lastQuestionType) {
      // If it was a close, move to handoff
      const lastTurn = state.turnHistory[state.turnHistory.length - 1];
      const q = getQuestion(state.currentStakeholderId, lastTurn?.questionId ?? "");
      if (q?.close_type) {
        if (q.triggers_briefing && currentStakeholder?.insider_briefing_for_next) {
          setState((s) => ({
            ...s,
            phase: "briefing",
            insiderBriefing: currentStakeholder.insider_briefing_for_next ?? null,
          }));
        } else {
          setState((s) => ({ ...s, phase: "handoff" }));
        }
      } else {
        // Normal turn — show next questions
        setState((s) => ({ ...s, phase: "question" }));
      }
    }
  }

  function handleBriefingContinue() {
    setState((s) => ({ ...s, phase: "handoff" }));
  }

  function handleChooseNextStakeholder(id: string) {
    const next = advanceToStakeholder(state, id, STAKEHOLDERS);
    setState(next);
  }

  if (!currentStakeholder) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>

      {/* ── Left sidebar: MEDDPICC tracker ── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r p-6"
        style={{ borderColor: "var(--border)" }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-5"
          style={{ color: "var(--muted)" }}>
          MEDDPICC Coverage
        </div>
        {MEDDPICC_ELEMENTS.map((el) => (
          <MeddpiccBar key={el} element={el} score={state.meddpiccScores[el]} />
        ))}

        <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--muted)" }}>
            Progress
          </div>
          {[1, 2, 3, 4].map((level) => {
            const levelStakeholders = STAKEHOLDERS.filter((s) => s.level === level);
            if (levelStakeholders.length === 0) return null;
            const levelColors: Record<number, string> = { 1: "#00BFB3", 2: "#0077CC", 3: "#FEC514", 4: "#F04E98" };
            return (
              <div key={level} className="mb-3">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: levelColors[level], opacity: 0.7 }}>
                  L{level}
                </div>
                {levelStakeholders.map((s) => {
                  const isCompleted = state.completedStakeholders.includes(s.id);
                  const isCurrent = s.id === state.currentStakeholderId;
                  const isUnlocked = state.unlockedStakeholders.includes(s.id) || s.level === 1;
                  return (
                    <div key={s.id} className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: isCompleted ? "#00BFB3" : isCurrent ? "#F04E98" : isUnlocked ? levelColors[level] : "var(--border)",
                          opacity: isUnlocked || isCompleted ? 1 : 0.3,
                        }}
                      />
                      <span className="text-xs truncate"
                        style={{
                          color: isCurrent ? "var(--text)" : isUnlocked || isCompleted ? "var(--muted)" : "var(--border)",
                        }}>
                        {s.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto px-4 py-8">

        <StakeholderHeader
          stakeholder={currentStakeholder}
          turn={state.currentTurn}
        />

        {/* Phase: question */}
        {state.phase === "question" && (
          <div className="fade-in">
            <div className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              Choose your next question:
            </div>
            <QuestionOptions
              questions={shuffledQuestions}
              onChoose={handleQuestionChoice}
              disabled={false}
            />
          </div>
        )}

        {/* Phase: response */}
        {state.phase === "response" && (
          <ResponseDisplay
            responseText={state.lastResponseText}
            questionType={state.lastQuestionType}
            onContinue={handleContinueFromResponse}
          />
        )}

        {/* Phase: briefing */}
        {state.phase === "briefing" && state.insiderBriefing && (
          <>
            <ResponseDisplay
              responseText={state.lastResponseText}
              questionType={state.lastQuestionType}
              onContinue={() => {}}
            />
            <BriefingCard
              text={state.insiderBriefing}
              onContinue={handleBriefingContinue}
            />
          </>
        )}

        {/* Phase: handoff */}
        {state.phase === "handoff" && (
          <HandoffScreen
            completedName={currentStakeholder.name}
            unlockedStakeholders={state.unlockedStakeholders}
            completedIds={state.completedStakeholders}
            onChoose={handleChooseNextStakeholder}
          />
        )}

        {/* Mobile MEDDPICC strip */}
        <div className="lg:hidden mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--muted)" }}>
            MEDDPICC
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            {MEDDPICC_ELEMENTS.map((el) => (
              <MeddpiccBar key={el} element={el} score={state.meddpiccScores[el]} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
