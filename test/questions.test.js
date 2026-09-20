import assert from "node:assert/strict";
import test from "node:test";

import { setLocale } from "../src/lib/i18n.js";
import {
  buildQuestions,
  buildState,
  CHECK_KEYS,
  FIT_LEVELS,
  FUNNEL_STAGES,
  GAP_KEYS,
} from "../src/lib/questions.js";
import "../src/shared/signals.js";

const PROFILE = {
  headline: "Full Stack Developer",
  experienceYears: "4",
  location: "Batam, Indonesia",
  languages: "Indonesia, Inggris",
  education: "S1 Teknik Informatika",
  skills: "TypeScript, React, Node.js",
  cvText: "Pengalaman membangun checkout flow dengan Node dan React.",
};

const JOB = {
  title: "Full Stack Engineer",
  company: "BJAK",
  location: "Singapura",
  workMode: "Jarak Jauh",
  employmentType: "Penuh waktu",
  description: "We need a full stack engineer with 3+ years building product features.",
};

const SIGNALS = {
  applicants: 39,
  earlyApplicant: false,
  postedLabel: "1 hari yang lalu",
  postedDaysAgo: 1,
  connections: 1,
  activelyReviewing: false,
  easyApply: false,
  promoted: true,
};

const EMPTY_SIGNALS = {
  applicants: null,
  earlyApplicant: false,
  postedLabel: null,
  postedDaysAgo: null,
  connections: null,
  activelyReviewing: false,
  easyApply: false,
  promoted: false,
};

test.beforeEach(() => setLocale("id"));

test("state memisahkan kandidat dan lowongan", () => {
  const state = buildState({ job: JOB, profile: PROFILE });
  assert.deepEqual(Object.keys(state), ["kandidat", "lowongan"]);
  assert.match(state.kandidat, /Batam, Indonesia/);
  assert.match(state.kandidat, /TypeScript, React, Node\.js/);
  assert.match(state.lowongan, /BJAK/);
  assert.match(state.lowongan, /3\+ years/);
});

test("kunci state ikut berganti bahasa", () => {
  setLocale("en");
  const state = buildState({ job: JOB, profile: PROFILE });
  assert.deepEqual(Object.keys(state), ["candidate", "job"]);
  assert.match(state.candidate, /Location: Batam, Indonesia/);
  assert.match(state.job, /Company: BJAK/);
});

test("field profil yang kosong tidak ditulis ke state", () => {
  const state = buildState({ job: JOB, profile: { ...PROFILE, education: "" } });
  assert.ok(!state.kandidat.includes("Pendidikan tertinggi"), "field kosong ikut terkirim");
  assert.ok(!state.kandidat.includes("undefined"));
});

test("preferensi lamaran tidak lagi ikut dikirim ke model", () => {
  const state = buildState({
    job: JOB,
    profile: { ...PROFILE, workAuthorization: "WNI", expectedSalary: "SGD 6.000", notes: "x" },
  });
  for (const label of ["Izin kerja", "Ekspektasi gaji", "Catatan tambahan"]) {
    assert.ok(!state.kandidat.includes(label), `${label} masih ikut terkirim`);
  }
});

test("teks panjang dipotong supaya tidak membanjiri state", () => {
  const state = buildState({
    job: { ...JOB, description: "x".repeat(20_000) },
    profile: { ...PROFILE, cvText: "y".repeat(20_000) },
  });
  assert.ok(state.kandidat.length < 7_000);
  assert.ok(state.lowongan.length < 7_000);
});

test("state memuat sinyal peluang hanya kalau ada yang benar-benar terbaca", () => {
  const withSignals = buildState({ job: { ...JOB, signals: SIGNALS }, profile: PROFILE });
  assert.ok("sinyal_peluang" in withSignals);
  assert.match(withSignals.sinyal_peluang, /39 orang sudah mengklik Lamar/);
  assert.match(withSignals.sinyal_peluang, /Koneksi di perusahaan: 1 orang/);

  setLocale("en");
  const english = buildState({ job: { ...JOB, signals: SIGNALS }, profile: PROFILE });
  assert.ok("opportunity_signals" in english);
  assert.match(english.opportunity_signals, /39 people have clicked apply/);

  assert.ok(
    !("opportunity_signals" in buildState({ job: { ...JOB, signals: EMPTY_SIGNALS }, profile: PROFILE })),
  );
  assert.ok(!("sinyal_peluang" in buildState({ job: JOB, profile: PROFILE })));
});

test("pertanyaan memuat choice, noul, dan score sesuai tipe Jev", () => {
  const questions = buildQuestions({ job: JOB });
  assert.equal(questions.fit_overall.type, "choice");
  assert.deepEqual(Object.keys(questions.fit_overall.criteria), FIT_LEVELS);
  assert.equal(questions.outcome.type, "choice");
  assert.deepEqual(Object.keys(questions.outcome.criteria), FUNNEL_STAGES);
  assert.equal(questions.worth_applying.type, "noul");
  assert.equal(questions.seniority_fit.type, "score");
  assert.ok(questions.seniority_fit.criteria.length >= 2, "score wajib punya minimal dua level");
});

test("kriteria penyebab ditolak memuat semua kategori termasuk persaingan", () => {
  const { criteria } = buildQuestions({ job: JOB }).biggest_gap;
  assert.deepEqual(Object.keys(criteria).sort(), [...GAP_KEYS].sort());
  assert.ok(criteria.competition.length > 10);
});

test("setiap pertanyaan punya instructions yang tidak kosong", () => {
  for (const [key, question] of Object.entries(buildQuestions({ job: JOB }))) {
    assert.ok(question.instructions?.trim().length > 10, `${key} tanpa instructions`);
    assert.ok(["choice", "noul", "score"].includes(question.type), `${key} tipe tidak dikenal`);
  }
});

test("instruksi pertanyaan ikut berganti bahasa", () => {
  const id = buildQuestions({ job: JOB });
  assert.match(id.fit_overall.instructions, /seberapa cocok/i);

  setLocale("en");
  const en = buildQuestions({ job: JOB });
  assert.match(en.fit_overall.instructions, /how well does the candidate/i);
  assert.equal(en.seniority_fit.criteria.length, 5);
  assert.equal(en.meets_location.type, "noul");
});

test("pertanyaan penyebab ditolak dilewati kalau deskripsi tidak terbaca", () => {
  const questions = buildQuestions({ job: { ...JOB, description: "   " } });
  assert.ok(!("biggest_gap" in questions));
  assert.ok("fit_overall" in questions);
  assert.equal(questions.fit_overall.criteria.good.length > 0, true);
});

test("kelima cek syarat selalu dikirim", () => {
  const questions = buildQuestions({ job: JOB });
  for (const key of CHECK_KEYS) {
    assert.equal(questions[key].type, "noul", `${key} harus noul`);
    assert.ok(questions[key].criteria.true && questions[key].criteria.false);
  }
});
