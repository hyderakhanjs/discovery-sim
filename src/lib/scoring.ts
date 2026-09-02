import type {
  GameState,
  Question,
  MeddpiccScores,
  MeddpiccElement,
  CloseType,
  MEDDPICC_MAX,
} from "@/types";
import { MEDDPICC_MAX as MAX } from "@/types";

// ─── MEDDPICC UPDATE ─────────────────────────────────────────────────────────

export function applyMeddpiccPoints(
  current: MeddpiccScores,
  question: Question
): MeddpiccScores {
  const updated = { ...current };
  for (const element of question.meddpicc_tags) {
    const cap = MAX[element];
    updated[element] = Math.min(cap, updated[element] + question.points);
  }
  return updated;
}

// ─── NARRATIVE SCORE ─────────────────────────────────────────────────────────

export function applyNarrativeScore(
  current: number,
  closeType: CloseType | undefined,
  recoveryUsed: boolean
): number {
  let delta = 0;
  if (closeType === "full_context_exceptional") delta = 25;
  else if (closeType === "full_context") delta = 20;
  else if (closeType === "partial_context") delta = 10;
  if (recoveryUsed) delta = Math.max(0, delta - 5);
  return Math.min(100, current + delta);
}

// ─── MOMENTUM ────────────────────────────────────────────────────────────────

export function updateMomentum(
  current: number,
  closeType: CloseType | undefined,
  trapTaken: boolean,
  recoveryUsed: boolean
): number {
  let delta = 0;
  if (closeType === "full_context_exceptional") delta += 1;
  else if (closeType === "full_context") delta += 0.5;
  else if (closeType === "partial_context") delta -= 0.5;
  if (trapTaken) delta -= 0.5;
  if (recoveryUsed) delta -= 0.25;
  return Math.max(-2, Math.min(2, current + delta));
}

// ─── ACCESS LEVEL ────────────────────────────────────────────────────────────

export function computeAccessLevel(
  completedStakeholders: string[],
  closeTypes: Map<string, CloseType>
): 0 | 1 | 2 | 3 {
  const highestLevel = completedStakeholders.reduce((max, id) => {
    // Level determined by stakeholder level in data, approximated here by naming
    if (id.includes("priya") || id.includes("mark")) return Math.max(max, 3);
    if (id.includes("sarah") || id.includes("maria")) return Math.max(max, 2);
    if (id.includes("miller") || id.includes("linda") || id.includes("emily"))
      return Math.max(max, 1);
    return max;
  }, 0);

  const lastClose = Array.from(closeTypes.values()).pop();
  if (lastClose === "full_context_exceptional") return Math.min(3, highestLevel + 1) as 0 | 1 | 2 | 3;
  if (lastClose === "full_context") return highestLevel as 0 | 1 | 2 | 3;
  return Math.max(0, highestLevel - 1) as 0 | 1 | 2 | 3;
}

// ─── DQI CALCULATION ─────────────────────────────────────────────────────────

export function calculateDQI(
  meddpiccScores: MeddpiccScores,
  narrativeScore: number
): number {
  const totalMax = Object.values(MAX).reduce((a, b) => a + b, 0); // 115
  const totalEarned = Object.values(meddpiccScores).reduce((a, b) => a + b, 0);
  const meddpiccPct = totalEarned / totalMax;
  const narrativePct = narrativeScore / 100;
  const dqi = meddpiccPct * 60 + narrativePct * 40;
  return Math.round(dqi);
}

// ─── FULL SWEEP BONUS ────────────────────────────────────────────────────────

export function fullSweepBonus(meddpiccScores: MeddpiccScores): number {
  const allCovered = Object.values(meddpiccScores).every((v) => v > 0);
  return allCovered ? 10 : 0;
}

// ─── DQI TIER LABEL ──────────────────────────────────────────────────────────

export function dqiTier(dqi: number): { label: string; color: string } {
  if (dqi >= 90) return { label: "Elite Discovery", color: "text-yellow-400" };
  if (dqi >= 75) return { label: "Strong Discovery", color: "text-green-400" };
  if (dqi >= 60) return { label: "Developing", color: "text-blue-400" };
  return { label: "Needs Work", color: "text-red-400" };
}

// ─── MEDDPICC COVERAGE % ─────────────────────────────────────────────────────

export function meddpiccCoverage(
  element: MeddpiccElement,
  score: number
): number {
  return Math.round((score / MAX[element]) * 100);
}
