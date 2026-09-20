import assert from "node:assert/strict";
import test from "node:test";

import { FIT_LEVELS, FUNNEL_STAGES } from "../src/lib/questions.js";
import { buildReport, expectedLevel } from "../src/lib/score.js";

const ANSWERS = {
  fit_overall: {
    type: "choice",
    choice: "fair",
    confidence: 0.26,
    probabilities: { fair: 0.41, very_poor: 0.02, excellent: 0.01, poor: 0.3, good: 0.26 },
  },
  biggest_gap: {
    type: "choice",
    choice: "location",
    confidence: 0.9,
    probabilities: { location: 0.7, experience_years: 0.1, tech_stack: 0.04, none: 0.16 },
  },
  outcome: {
    type: "choice",
    choice: "auto_reject",
    confidence: 0.95,
    probabilities: {
      auto_reject: 0.97,
      recruiter_screen: 0.03,
      technical_interview: 0,
      final_round: 0,
      offer: 0,
    },
  },
  worth_applying: { type: "noul", noul: 0.08 },
  meets_experience: { type: "noul", noul: 0.97 },
  meets_location: { type: "noul", noul: 0.06 },
  meets_language: { type: "noul", noul: 0.77 },
  has_domain_experience: { type: "noul", noul: 0.77 },
  has_required_tech: { type: "noul", noul: 0.5 },
  seniority_fit: {
    type: "score",
    score: 2.05,
    confidence: 0.96,
    legend: { 0: "Junior", 1: "Agak junior", 2: "Pas", 3: "Agak senior", 4: "Senior" },
    probabilities: { 0: 0, 1: 0, 2: 0.95, 3: 0.05, 4: 0 },
  },
};

const JOB = { title: "Full Stack Engineer", company: "BJAK", location: "Singapura", url: "https://x" };
const SIGNALS = { applicants: 39, postedDaysAgo: 1, postedLabel: "1 hari yang lalu", connections: null };

test("expectedLevel menghitung nilai harapan dari distribusi", () => {
  assert.equal(expectedLevel({ a: 1, b: 0, c: 0 }, ["a", "b", "c"]), 0);
  assert.equal(expectedLevel({ a: 0, b: 0, c: 1 }, ["a", "b", "c"]), 2);
  assert.equal(expectedLevel({ a: 0.5, b: 0.5 }, ["a", "b"]), 0.5);
  assert.equal(expectedLevel(undefined, ["a", "b"]), 0);
});

test("match percent = nilai harapan level dibagi jumlah level maksimum", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "jev-latest" });
  // 0.02*0 + 0.30*1 + 0.41*2 + 0.26*3 + 0.01*4 = 1.94 dari maksimum 4
  assert.equal(report.match.percent, 48.5);
  assert.equal(report.match.level, "fair");
});

test("laporan menyimpan kunci, bukan label terjemahan", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  // Kalau label ikut tersimpan, hasil cache tidak akan bisa berganti bahasa.
  assert.ok(!("label" in report.match));
  assert.ok(!("label" in report.opening));
  assert.ok(!("label" in report.verdict));
  assert.ok(!("label" in report.seniority));
  assert.ok(report.checks.every((check) => !("label" in check)));
  assert.ok(report.gaps.every((gap) => !("label" in gap)));
  assert.equal(report.verdict.level, "skip");
});

test("sinyal mentah diteruskan apa adanya supaya diformat saat render", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m", signals: SIGNALS });
  assert.deepEqual(report.signals, SIGNALS);

  const without = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  assert.equal(without.signals, null);
});

test("distribusi match selalu memuat semua level", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  assert.deepEqual(Object.keys(report.match.distribution), FIT_LEVELS);
  assert.deepEqual(Object.keys(report.opening.distribution), FUNNEL_STAGES);
});

test("peluang lolos screening menjumlahkan tahap interview teknis ke atas", () => {
  const report = buildReport({
    jobId: "1",
    job: JOB,
    model: "m",
    answers: {
      ...ANSWERS,
      outcome: {
        ...ANSWERS.outcome,
        probabilities: {
          auto_reject: 0.5,
          recruiter_screen: 0.2,
          technical_interview: 0.15,
          final_round: 0.1,
          offer: 0.05,
        },
      },
    },
  });
  assert.equal(report.opening.passScreening, 30);
  assert.equal(report.opening.offer, 5);
  assert.equal(report.opening.shortlisted, 50);
});

test("keputusan akhir mengikuti ambang batas yang sudah ditentukan", () => {
  const skip = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  assert.equal(skip.verdict.level, "skip");

  const priority = buildReport({
    jobId: "1",
    job: JOB,
    model: "m",
    answers: {
      ...ANSWERS,
      worth_applying: { type: "noul", noul: 0.9 },
      outcome: {
        ...ANSWERS.outcome,
        probabilities: {
          auto_reject: 0.1,
          recruiter_screen: 0.2,
          technical_interview: 0.4,
          final_round: 0.2,
          offer: 0.1,
        },
      },
    },
  });
  assert.equal(priority.verdict.level, "priority");
});

test("cek syarat hanya memuat pertanyaan yang benar-benar dijawab", () => {
  const report = buildReport({
    jobId: "1",
    job: JOB,
    model: "m",
    answers: { ...ANSWERS, has_required_tech: undefined },
  });
  assert.equal(report.checks.length, 4);
  assert.ok(!report.checks.some((check) => check.key === "has_required_tech"));

  const location = report.checks.find((check) => check.key === "meets_location");
  assert.equal(location.ok, false);
  assert.equal(location.probability, 6);
});

test("penyebab ditolak diurutkan menurun dan membuang kategori none", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  assert.deepEqual(
    report.gaps.map((gap) => gap.key),
    ["location", "experience_years"],
  );
  assert.equal(report.gaps[0].probability, 70);
});

test("seniority disimpan sebagai indeks level", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: ANSWERS, model: "m" });
  assert.equal(report.seniority.score, 2);
});

test("jawaban kosong tidak membuat crash", () => {
  const report = buildReport({ jobId: "1", job: JOB, answers: {}, model: "m" });
  assert.equal(report.match.percent, 0);
  assert.equal(report.match.level, null);
  assert.equal(report.opening.offer, 0);
  assert.equal(report.verdict.level, "skip");
  assert.equal(report.seniority.score, null);
  assert.deepEqual(report.checks, []);
  assert.deepEqual(report.gaps, []);
});
