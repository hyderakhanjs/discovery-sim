// ─── MEDDPICC ────────────────────────────────────────────────────────────────

export type MeddpiccElement =
  | "metrics"
  | "economic_buyer"
  | "decision_criteria"
  | "decision_process"
  | "identify_pain"
  | "champion"
  | "competition";

export const MEDDPICC_ELEMENTS: MeddpiccElement[] = [
  "metrics",
  "economic_buyer",
  "decision_criteria",
  "decision_process",
  "identify_pain",
  "champion",
  "competition",
];

export const MEDDPICC_LABELS: Record<MeddpiccElement, string> = {
  metrics: "Metrics",
  economic_buyer: "Economic Buyer",
  decision_criteria: "Decision Criteria",
  decision_process: "Decision Process",
  identify_pain: "Identify Pain",
  champion: "Champion",
  competition: "Competition",
};

export const MEDDPICC_MAX: Record<MeddpiccElement, number> = {
  metrics: 20,
  economic_buyer: 15,
  decision_criteria: 15,
  decision_process: 15,
  identify_pain: 25,
  champion: 15,
  competition: 10,
};

// ─── QUESTION CONTENT ────────────────────────────────────────────────────────

export type QuestionType = "good" | "mediocre" | "trap" | "recovery";
export type CloseType = "full_context_exceptional" | "full_context" | "partial_context";

export interface Question {
  id: string;
  turn: number;
  question_text: string;
  question_type: QuestionType;
  meddpicc_tags: MeddpiccElement[];
  points: number;
  response_text: string;
  triggers_briefing: boolean;
  next_question_ids: string[];
  close_type?: CloseType;
}

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  level: number;
  unlocks: string[];
  insider_briefing_for_next?: string;
  questions: Question[];
}

// ─── GAME STATE ──────────────────────────────────────────────────────────────

export type MeddpiccScores = Record<MeddpiccElement, number>;

export interface TurnRecord {
  stakeholderId: string;
  turnNumber: number;
  questionId: string;
  questionType: QuestionType;
  meddpiccTags: MeddpiccElement[];
  pointsEarned: number;
}

export interface GameState {
  // Progress
  currentStakeholderId: string;
  currentTurn: number;
  completedStakeholders: string[];
  unlockedStakeholders: string[];

  // Scores
  meddpiccScores: MeddpiccScores;
  narrativeScore: number;

  // Narrative engine variables
  accessLevel: 0 | 1 | 2 | 3;
  momentum: number; // -2 to +2
  blindSpots: string[]; // stakeholder IDs with poor/no close

  // Turn history
  turnHistory: TurnRecord[];

  // Available next questions for current conversation
  availableQuestionIds: string[];

  // UI state
  phase: "question" | "response" | "briefing" | "handoff" | "complete";
  lastResponseText: string;
  lastQuestionType: QuestionType | null;
  briefingText: string | null;
  insiderBriefing: string | null; // shown before next stakeholder

  // Final outcome
  outcomeId: number | null; // 1-6
  dqi: number | null;
}

export const INITIAL_MEDDPICC_SCORES: MeddpiccScores = {
  metrics: 0,
  economic_buyer: 0,
  decision_criteria: 0,
  decision_process: 0,
  identify_pain: 0,
  champion: 0,
  competition: 0,
};

// ─── OUTCOME ─────────────────────────────────────────────────────────────────

export interface NarrativeOutcome {
  id: number;
  title: string;
  story: string;
  turningPoint: string;
  alternatePath: string;
}
