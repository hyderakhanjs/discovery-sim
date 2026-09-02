"use client";

import { useRouter } from "next/navigation";

const MEDDPICC = [
  { letter: "M", label: "Metrics", desc: "Quantify the business impact — revenue, cost, risk" },
  { letter: "E", label: "Economic Buyer", desc: "Find who controls the budget and what moves them" },
  { letter: "D", label: "Decision Criteria", desc: "Understand how they will evaluate and choose" },
  { letter: "D", label: "Decision Process", desc: "Map the steps, owners, and timeline to a decision" },
  { letter: "P", label: "Identify Pain", desc: "Surface and quantify the problem driving urgency" },
  { letter: "I", label: "Champion", desc: "Activate an internal advocate who sells for you" },
  { letter: "C", label: "Competition", desc: "Know who else is in the conversation" },
];

const STAKEHOLDERS = [
  { level: 1, roles: ["Alex Chen · SRE", "Jordan Lee · SOC Analyst", "Dev Patel · Search Developer"] },
  { level: 2, roles: ["John Miller · Infrastructure Director", "Linda Chen · SOC Lead", "Emily Rivera · Ecommerce Director"] },
  { level: 3, roles: ["Sarah Patel · VP of IT", "Maria Torres · CCO"] },
  { level: 4, roles: ["Priya Desai · CIO", "Mark Reynolds · CFO"] },
];

export default function Briefing() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--accent-pink)" }}>
          Pre-Simulation Briefing
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Before you start
        </h1>
        <p style={{ color: "var(--muted)" }} className="leading-relaxed">
          You are an Elastic field engineer walking into Soha Inc. cold. Your goal
          is to run discovery across four levels of stakeholders using MEDDPICC.
          Every question you ask matters. The quality of your discovery determines
          which deal you end up in.
        </p>
      </div>

      {/* MEDDPICC */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-blue)" }}>
          Your Framework: MEDDPICC
        </h2>
        <div className="space-y-2">
          {MEDDPICC.map(({ letter, label, desc }) => (
            <div key={label}
              className="flex items-start gap-4 rounded-lg p-3 border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="w-8 h-8 rounded font-bold text-sm flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-pink)", color: "white" }}>
                {letter}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stakeholder ladder */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-blue)" }}>
          Stakeholder Ladder
        </h2>
        <div className="space-y-3">
          {STAKEHOLDERS.map(({ level, roles }) => (
            <div key={level} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: level === 1 ? "var(--accent-green)" :
                    level === 2 ? "var(--accent-blue)" :
                    level === 3 ? "var(--accent-yellow)" : "var(--accent-pink)",
                  color: level === 3 ? "#000" : "white"
                }}>
                L{level}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {roles.map(r => (
                  <span key={r} className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--card)" }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Phase 1 unlocks Level 1. Strong closes unlock Level 2 and beyond.
        </p>
      </section>

      {/* Rules */}
      <section className="mb-10 rounded-xl p-5 border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-yellow)" }}>
          How It Works
        </h2>
        <ul className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
          <li>Each conversation is <strong>5 turns</strong>. Use them well.</li>
          <li>Every question is labeled as good, mediocre, or a trap — but <strong>you will not see the labels</strong> until the debrief.</li>
          <li>If you go off track, one follow-up option is always a <strong>recovery question</strong> that costs you a turn but gets you back on the rich path.</li>
          <li>How you close each conversation determines what <strong>context</strong> you carry into the next one.</li>
          <li>At the end, you receive a <strong>Discovery Quality Index</strong> and a narrative outcome describing what deal you ended up in.</li>
        </ul>
      </section>

      <button
        onClick={() => router.push("/simulation")}
        className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-90"
        style={{ background: "var(--accent-pink)", color: "white" }}>
        Begin — Start with Level 1
      </button>
    </main>
  );
}
