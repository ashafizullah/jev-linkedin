import "../shared/signals.js";
import { t } from "./i18n.js";

export const FIT_LEVELS = ["very_poor", "poor", "fair", "good", "excellent"];

export const FUNNEL_STAGES = [
  "auto_reject",
  "recruiter_screen",
  "technical_interview",
  "final_round",
  "offer",
];

export const SENIORITY_LEVELS = [0, 1, 2, 3, 4];

/** Pertanyaan noul ya/tidak tentang syarat lowongan, urut sesuai tampilan. */
export const CHECK_KEYS = [
  "meets_experience",
  "meets_location",
  "meets_language",
  "has_domain_experience",
  "has_required_tech",
];

/**
 * Kategori penyebab ditolak. Kuncinya dipakai di laporan, labelnya diterjemahkan
 * saat render supaya hasil yang sudah di-cache ikut berganti bahasa.
 */
export const GAP_KEYS = [
  "experience_years",
  "tech_stack",
  "domain_industry",
  "seniority",
  "location",
  "language",
  "education",
  "competition",
  "none",
];

const CV_LIMIT = 6000;
const DESCRIPTION_LIMIT = 6000;

function clip(text, limit) {
  const value = (text ?? "").trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n[...]`;
}

function field(label, value) {
  const text = String(value ?? "").trim();
  return text ? `${label}: ${text}` : null;
}

/**
 * Jev menilai `state` terhadap pertanyaan. State dibentuk sebagai objek
 * terstruktur supaya kandidat dan lowongan jelas terpisah di mata model, dan
 * seluruh labelnya mengikuti bahasa extension.
 */
export function buildState({ job, profile }) {
  const candidate = [
    field(t("state.headline"), profile.headline),
    field(t("state.experienceYears"), profile.experienceYears),
    field(t("state.location"), profile.location),
    field(t("state.languages"), profile.languages),
    field(t("state.education"), profile.education),
    field(t("state.skills"), profile.skills),
  ]
    .filter(Boolean)
    .join("\n");

  const state = {
    [t("state.candidateKey")]: [candidate, `${t("state.cvContent")}:`, clip(profile.cvText, CV_LIMIT)]
      .filter(Boolean)
      .join("\n\n"),
    [t("state.jobKey")]: [
      field(t("state.position"), job.title),
      field(t("state.company"), job.company),
      field(t("state.jobLocation"), job.location),
      field(t("state.workMode"), job.workMode),
      field(t("state.employmentType"), job.employmentType),
      `${t("state.description")}:`,
      clip(job.description, DESCRIPTION_LIMIT),
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const signals = globalThis.JevSignals.signalLines(job.signals);
  if (signals.length) state[t("state.signalsKey")] = signals.join("\n");

  return state;
}

/**
 * Pertanyaan sengaja dipecah jadi potongan kecil dan spesifik. Jev adalah model
 * "gut-check": satu pertanyaan = satu penilaian. Kombinasinya dilakukan di score.js.
 */
export function buildQuestions({ job }) {
  const hasRequirements = Boolean((job.description ?? "").trim());

  const gapCriteria = Object.fromEntries(
    GAP_KEYS.filter((key) => key !== "none").map((key) => [key, t(`question.gap.${key}`)]),
  );
  gapCriteria.none = hasRequirements ? t("question.gap.none") : t("question.gap.noneThin");

  const yesNo = (group) => ({
    true: t(`question.${group}.true`),
    false: t(`question.${group}.false`),
  });

  const questions = {
    fit_overall: {
      type: "choice",
      instructions: t("question.fitOverall.instructions"),
      criteria: Object.fromEntries(
        FIT_LEVELS.map((level) => [level, t(`question.fitOverall.${level}`)]),
      ),
    },
    biggest_gap: {
      type: "choice",
      instructions: t("question.biggestGap.instructions"),
      criteria: gapCriteria,
    },
    outcome: {
      type: "choice",
      instructions: t("question.outcome.instructions"),
      criteria: Object.fromEntries(
        FUNNEL_STAGES.map((stage) => [stage, t(`question.outcome.${stage}`)]),
      ),
    },
    worth_applying: {
      type: "noul",
      instructions: t("question.worthApplying.instructions"),
      criteria: yesNo("worthApplying"),
    },
    meets_experience: {
      type: "noul",
      instructions: t("question.meetsExperience.instructions"),
      criteria: yesNo("meetsExperience"),
    },
    meets_location: {
      type: "noul",
      instructions: t("question.meetsLocation.instructions"),
      criteria: yesNo("meetsLocation"),
    },
    meets_language: {
      type: "noul",
      instructions: t("question.meetsLanguage.instructions"),
      criteria: yesNo("meetsLanguage"),
    },
    has_domain_experience: {
      type: "noul",
      instructions: t("question.hasDomainExperience.instructions"),
      criteria: yesNo("hasDomainExperience"),
    },
    has_required_tech: {
      type: "noul",
      instructions: t("question.hasRequiredTech.instructions"),
      criteria: yesNo("hasRequiredTech"),
    },
    seniority_fit: {
      type: "score",
      instructions: t("question.seniorityFit.instructions"),
      criteria: SENIORITY_LEVELS.map((level) => t(`question.seniorityFit.${level}`)),
    },
  };

  if (!hasRequirements) delete questions.biggest_gap;
  return questions;
}
