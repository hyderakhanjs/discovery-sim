import type {
  GameState,
  Question,
  Stakeholder,
  MeddpiccElement,
  CloseType,
  TurnRecord,
} from "@/types";
import { INITIAL_MEDDPICC_SCORES, MEDDPICC_MAX } from "@/types";
import {
  applyMeddpiccPoints,
  applyNarrativeScore,
  updateMomentum,
  calculateDQI,
  fullSweepBonus,
} from "./scoring";
import { resolveOutcome } from "./narrative";

// ─── INITIAL STATE ───────────────────────────────────────────────────────────

export function createInitialState(firstStakeholderId: string, firstTurnQuestionIds: string[]): GameState {
  return {
    currentStakeholderId: firstStakeholderId,
    currentTurn: 1,
    completedStakeholders: [],
    unlockedStakeholders: [firstStakeholderId],

    meddpiccScores: { ...INITIAL_MEDDPICC_SCORES },
    narrativeScore: 0,

    accessLevel: 0,
    momentum: 0,
    blindSpots: [],

    turnHistory: [],
    availableQuestionIds: firstTurnQuestionIds,

    phase: "question",
    lastResponseText: "",
    lastQuestionType: null,
    briefingText: null,
    insiderBriefing: null,

    outcomeId: null,
    dqi: null,
  };
}

// ─── CHOOSE QUESTION ─────────────────────────────────────────────────────────

export interface TurnResult {
  nextState: GameState;
}

export function processQuestionChoice(
  state: GameState,
  question: Question,
  allStakeholders: Stakeholder[]
): GameState {
  // 1. Apply MEDDPICC points
  const newMeddpicc = applyMeddpiccPoints(state.meddpiccScores, question);

  // 2. Record turn
  const turnRecord: TurnRecord = {
    stakeholderId: state.currentStakeholderId,
    turnNumber: state.currentTurn,
    questionId: question.id,
    questionType: question.question_type,
    meddpiccTags: question.meddpicc_tags,
    pointsEarned: question.points,
  };

  // 3. Update narrative score if this is a close (turn 5)
  const isClose = question.close_type !== undefined;
  const recoveryUsed = state.turnHistory.some(
    (t) =>
      t.stakeholderId === state.currentStakeholderId &&
      t.questionType === "recovery"
  );
  const newNarrative = isClose
    ? applyNarrativeScore(state.narrativeScore, question.close_type, recoveryUsed)
    : state.narrativeScore;

  // 4. Update momentum if close
  const newMomentum = isClose
    ? updateMomentum(state.momentum, question.close_type, false, recoveryUsed)
    : question.question_type === "trap"
    ? updateMomentum(state.momentum, undefined, true, false)
    : state.momentum;

  // 5. Determine phase
  let nextPhase: GameState["phase"] = "response";
  let briefingText: string | null = null;
  let insiderBriefing: string | null = null;

  if (isClose) {
    // Conversation complete — check for insider briefing
    if (question.triggers_briefing) {
      const currentStakeholder = allStakeholders.find(
        (s) => s.id === state.currentStakeholderId
      );
      insiderBriefing = currentStakeholder?.insider_briefing_for_next ?? null;
      nextPhase = insiderBriefing ? "briefing" : "handoff";
    } else {
      nextPhase = "handoff";
    }
  }

  // 6. Update access level based on close type
  let newAccessLevel = state.accessLevel;
  if (isClose) {
    if (question.close_type === "full_context_exceptional")
      newAccessLevel = Math.min(3, state.accessLevel + 1) as 0 | 1 | 2 | 3;
    else if (question.close_type === "full_context")
      newAccessLevel = Math.max(state.accessLevel, 1) as 0 | 1 | 2 | 3;
  }

  // 7. Update blind spots: if partial close, record this stakeholder
  const newBlindSpots = [...state.blindSpots];
  if (isClose && question.close_type === "partial_context") {
    if (!newBlindSpots.includes(state.currentStakeholderId)) {
      newBlindSpots.push(state.currentStakeholderId);
    }
  }
  // Flag MEDDPICC gaps as blind spots
  if (newMeddpicc.metrics < MEDDPICC_MAX.metrics * 0.25) {
    if (!newBlindSpots.includes("metrics_gap")) newBlindSpots.push("metrics_gap");
  }
  if (newMeddpicc.economic_buyer < MEDDPICC_MAX.economic_buyer * 0.25) {
    if (!newBlindSpots.includes("economic_buyer_gap"))
      newBlindSpots.push("economic_buyer_gap");
  }

  // 8. Compute next question IDs (for next turn)
  const nextQuestionIds = isClose ? [] : question.next_question_ids;

  // 9. Handle completed stakeholder and unlocking
  let completedStakeholders = [...state.completedStakeholders];
  let unlockedStakeholders = [...state.unlockedStakeholders];
  if (isClose) {
    completedStakeholders = [...completedStakeholders, state.currentStakeholderId];
    const stakeholder = allStakeholders.find(
      (s) => s.id === state.currentStakeholderId
    );
    if (stakeholder) {
      for (const id of stakeholder.unlocks) {
        if (!unlockedStakeholders.includes(id)) {
          unlockedStakeholders.push(id);
        }
      }
    }
  }

  // 10. Check if game is complete (all Level 1 stakeholders done for Phase 1)
  const level1Stakeholders = allStakeholders
    .filter((s) => s.level === 1)
    .map((s) => s.id);
  const allLevel1Done = level1Stakeholders.every((id) =>
    completedStakeholders.includes(id)
  );
  if (allLevel1Done && isClose) {
    nextPhase = "complete";
  }

  const nextState: GameState = {
    ...state,
    meddpiccScores: newMeddpicc,
    narrativeScore: newNarrative,
    accessLevel: newAccessLevel,
    momentum: newMomentum,
    blindSpots: newBlindSpots,
    turnHistory: [...state.turnHistory, turnRecord],
    availableQuestionIds: nextQuestionIds,
    currentTurn: isClose ? 1 : state.currentTurn + 1,
    completedStakeholders,
    unlockedStakeholders,
    phase: nextPhase,
    lastResponseText: question.response_text,
    lastQuestionType: question.question_type,
    briefingText,
    insiderBriefing,
    outcomeId: nextPhase === "complete" ? null : state.outcomeId,
    dqi: null,
  };

  return nextState;
}

// ─── ADVANCE TO NEXT STAKEHOLDER ─────────────────────────────────────────────

export function advanceToStakeholder(
  state: GameState,
  stakeholderId: string,
  allStakeholders: Stakeholder[]
): GameState {
  const stakeholder = allStakeholders.find((s) => s.id === stakeholderId);
  if (!stakeholder) return state;

  const turn1Questions = stakeholder.questions.filter((q) => q.turn === 1);

  return {
    ...state,
    currentStakeholderId: stakeholderId,
    currentTurn: 1,
    availableQuestionIds: turn1Questions.map((q) => q.id),
    phase: "question",
    lastResponseText: "",
    lastQuestionType: null,
    briefingText: null,
    insiderBriefing: null,
  };
}

// ─── FINALIZE GAME ───────────────────────────────────────────────────────────

export function finalizeGame(state: GameState): GameState {
  const bonus = fullSweepBonus(state.meddpiccScores);
  const rawDqi = calculateDQI(state.meddpiccScores, state.narrativeScore);
  const dqi = Math.min(100, rawDqi + bonus);
  const outcome = resolveOutcome(state);

  return {
    ...state,
    dqi,
    outcomeId: outcome.id,
    phase: "complete",
  };
}
