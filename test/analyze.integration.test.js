import assert from "node:assert/strict";
import test from "node:test";

import { analyzeJob } from "../src/lib/analyze.js";
import { JevError, evaluate, listModels } from "../src/lib/jev.js";

const apiKey = process.env.JEV_API_KEY ?? "";
const baseUrl = process.env.JEV_BASE_URL ?? "https://api.typesafe.ai/v1";
const model = process.env.JEV_MODEL ?? "jev-latest";
const live = { baseUrl, apiKey, model, skip: apiKey ? false : "JEV_API_KEY tidak diisi" };

// Lowongan sintetis. Sengaja tidak memakai perusahaan atau lokasi nyata: yang
// diuji cuma satu sifat, yaitu lowongan yang mewajibkan domisili di negara yang
// bukan tempat kandidat tinggal.
const JOB = {
  jobId: "1000000001",
  title: "Full Stack Software Engineer",
  company: "Northwind Technologies",
  location: "Jerman (Jarak Jauh)",
  workMode: "Jarak Jauh",
  employmentType: "Penuh waktu",
  description:
    "We are looking for full stack engineers to build product features end to end. " +
    "3+ years of full stack software engineering experience. Strong frontend and backend fundamentals. " +
    "This role is remote, but candidates must be based in Germany.",
};

const PROFILE = {
  headline: "Full Stack Developer",
  experienceYears: "4",
  location: "Jakarta, Indonesia",
  languages: "Indonesia (native), Inggris (profesional)",
  education: "S1 Teknik Informatika",
  skills: "TypeScript, React, Node.js, PostgreSQL",
  cvText:
    "Full stack developer dengan 4 tahun pengalaman. Membangun checkout flow e-commerce " +
    "memakai Node.js dan React, menangani lebih dari satu juta pesanan. " +
    "Sebelumnya backend developer di startup fintech, integrasi payment gateway.",
};

test("kredensial kosong ditolak sebelum memanggil jaringan", async () => {
  await assert.rejects(
    () => evaluate({ baseUrl, apiKey: "", model, state: "x", questions: { a: { type: "noul", instructions: "q" } } }),
    (error) => error instanceof JevError && /API key/.test(error.message),
  );
});

test("daftar model gateway memuat model yang dipakai", { skip: live.skip }, async () => {
  const models = await listModels({ baseUrl, apiKey });
  assert.ok(models.length > 0);
  assert.ok(models.includes(model), `${model} tidak ada di daftar model gateway`);
});

test("analyzeJob menghasilkan laporan lengkap dari endpoint sungguhan", { skip: live.skip }, async () => {
  const report = await analyzeJob({
    job: JOB,
    profile: PROFILE,
    settings: live,
  });

  assert.equal(report.jobId, JOB.jobId);
  // Model bisa membalas alias yang sudah di-resolve (mis. "jev-latest" -> "jev-1.13.0").
  assert.match(report.model, /^jev/, "model yang dilaporkan harus berasal dari keluarga Jev");
  assert.ok(report.match.percent >= 0 && report.match.percent <= 100);
  assert.ok(report.opening.passScreening >= 0 && report.opening.passScreening <= 100);
  assert.ok(report.opening.offer <= report.opening.passScreening, "offer tidak mungkin lebih besar dari lolos screening");
  assert.ok(report.checks.length === 5, "lima cek syarat harus terisi semua");
  assert.ok(report.usage.input_tokens > 100);

  // Lowongan ini mewajibkan domisili di Jerman sementara kandidat di Jakarta:
  // model harus menandai syarat lokasi sebagai tidak terpenuhi.
  const location = report.checks.find((check) => check.key === "meets_location");
  assert.equal(location.ok, false);

  console.log(
    `\n  ${report.job.title} — ${report.match.percent}% cocok, ` +
      `${report.opening.passScreening}% lolos screening, ${report.opening.offer}% offer ` +
      `(${report.verdict.level})\n`,
  );
});
