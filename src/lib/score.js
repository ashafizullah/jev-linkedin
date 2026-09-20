import { CHECK_KEYS, FIT_LEVELS, FUNNEL_STAGES } from "./questions.js";

/** Nilai harapan dari distribusi probabilitas terhadap level berurutan. */
export function expectedLevel(probabilities, order) {
  return order.reduce((total, key, index) => total + index * (probabilities?.[key] ?? 0), 0);
}

function toPercent(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10;
}

function funnelBreakdown(probabilities = {}) {
  const at = (stage) => probabilities[stage] ?? 0;
  return {
    offer: toPercent(at("offer")),
    passScreening: toPercent(at("technical_interview") + at("final_round") + at("offer")),
    shortlisted: toPercent(
      at("recruiter_screen") + at("technical_interview") + at("final_round") + at("offer"),
    ),
  };
}

function verdictLevel({ worthApplying, passScreening }) {
  if (worthApplying >= 0.6 && passScreening >= 50) return "priority";
  if (worthApplying >= 0.6) return "apply";
  if (worthApplying >= 0.4) return "maybe";
  return "skip";
}

/**
 * Laporan sengaja menyimpan kunci dan angka mentah, bukan label yang sudah
 * diterjemahkan. Labelnya dibuat saat render (lihat linkedin.js), supaya hasil
 * yang tersimpan di cache ikut berganti bahasa ketika bahasa diganti.
 */
export function buildReport({ jobId, job, answers, usage, model, analyzedAt, signals }) {
  const fit = answers.fit_overall ?? {};
  const fitScore = expectedLevel(fit.probabilities, FIT_LEVELS);
  const matchPercent = toPercent(fitScore / (FIT_LEVELS.length - 1));

  const outcome = answers.outcome ?? {};
  const funnel = funnelBreakdown(outcome.probabilities);

  const worthApplying = answers.worth_applying?.noul ?? 0;
  const seniority = answers.seniority_fit ?? {};

  const checks = CHECK_KEYS.map((key) => {
    const value = answers[key]?.noul;
    if (typeof value !== "number") return null;
    return { key, probability: toPercent(value), ok: value >= 0.5 };
  }).filter(Boolean);

  const gaps = Object.entries(answers.biggest_gap?.probabilities ?? {})
    .filter(([key, probability]) => key !== "none" && probability >= 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([key, probability]) => ({ key, probability: toPercent(probability) }));

  return {
    jobId,
    job,
    analyzedAt: analyzedAt ?? Date.now(),
    model,
    match: {
      percent: matchPercent,
      level: fit.choice ?? null,
      confidence: toPercent(fit.confidence ?? 0),
      distribution: Object.fromEntries(
        FIT_LEVELS.map((level) => [level, toPercent(fit.probabilities?.[level] ?? 0)]),
      ),
    },
    opening: {
      ...funnel,
      level: outcome.choice ?? null,
      confidence: toPercent(outcome.confidence ?? 0),
      distribution: Object.fromEntries(
        FUNNEL_STAGES.map((stage) => [stage, toPercent(outcome.probabilities?.[stage] ?? 0)]),
      ),
    },
    verdict: { level: verdictLevel({ worthApplying, passScreening: funnel.passScreening }) },
    worthApplying: toPercent(worthApplying),
    signals: signals ?? null,
    seniority: {
      score: Number.isFinite(seniority.score) ? Math.round(seniority.score) : null,
      confidence: toPercent(seniority.confidence ?? 0),
    },
    checks,
    gaps,
    usage: usage ?? null,
  };
}
