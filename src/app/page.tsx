"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}>

      {/* Logo area */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-pink)" }}>
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="text-sm font-medium uppercase tracking-widest"
            style={{ color: "var(--muted)" }}>
            Field Engineering · Discovery Training
          </span>
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          The Soha Inc.<br />
          <span style={{ color: "var(--accent-pink)" }}>Discovery Simulation</span>
        </h1>

        <p className="text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: "var(--muted)" }}>
          A B2C retailer. A Black Friday outage. Four levels of stakeholders who each
          hold a piece of the story. Your job: ask the right questions.
        </p>
      </div>

      {/* Case card */}
      <div className="rounded-xl p-6 mb-8 max-w-lg w-full border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-blue)" }}>
          The Situation
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          Soha Inc. is a mid-market B2C retailer in the middle of a data center migration.
          Their Black Friday outage cost seven figures in a single day. The root cause is
          still unclear. The CFO has a 20% cost reduction mandate. The new CIO has an AI
          agenda to deliver in 18 months. You have a 60-day window before the migration
          closes the door on a platform decision.
        </p>
        <div className="mt-4 pt-4 border-t flex gap-6"
          style={{ borderColor: "var(--border)" }}>
          {[
            { label: "Stakeholders", value: "9" },
            { label: "Levels", value: "4" },
            { label: "Framework", value: "MEDDPICC" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/briefing")}
        className="px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:opacity-90 hover:scale-105"
        style={{ background: "var(--accent-pink)", color: "white" }}>
        Start Simulation
      </button>

      <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
        Phase 1 · Level 1 Stakeholders · No login required
      </p>
    </main>
  );
}
