import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TARGET,
  MAX_PAGES,
  MAX_TARGET,
  PAGE_SIZE,
  clampTarget,
  createBatch,
  finish,
  harvest,
  isComplete,
  nextStep,
  record,
  stop,
  summary,
} from "../src/lib/batch.js";

const SEARCH = "https://www.linkedin.com/jobs/search-results/?keywords=Engineer";
const ids = (n) => Array.from({ length: n }, (_, i) => `44691080${String(i).padStart(2, "0")}`);

function makeBatch(overrides = {}) {
  return createBatch({ jobIds: ids(3), target: 2, searchUrl: SEARCH, start: 0, now: 1000, ...overrides });
}

test("target dibatasi ke rentang yang masuk akal", () => {
  assert.equal(clampTarget(undefined), DEFAULT_TARGET);
  assert.equal(clampTarget("abc"), DEFAULT_TARGET);
  assert.equal(clampTarget(0), DEFAULT_TARGET);
  assert.equal(clampTarget(3), 3);
  assert.equal(clampTarget(999), MAX_TARGET);
});

test("batch baru memuat antrean tanpa duplikat", () => {
  const batch = createBatch({ jobIds: ["1", "2", "2", "3"], target: 5, searchUrl: SEARCH });
  assert.deepEqual(batch.pending, ["1", "2", "3"]);
  assert.deepEqual(batch.seen, ["1", "2", "3"]);
  assert.equal(batch.analyzed, 0);
  assert.equal(batch.active, true);
  assert.equal(batch.nextStart, PAGE_SIZE);
});

test("nextStep mengembalikan lowongan berurutan dan mengeluarkannya dari antrean", () => {
  let batch = makeBatch();
  const first = nextStep(batch);
  assert.equal(first.kind, "job");
  assert.equal(first.jobId, ids(3)[0]);
  assert.match(first.url, /linkedin\.com\/jobs\/view\/4469108000\//);
  assert.equal(first.batch.currentJobId, ids(3)[0]);
  assert.deepEqual(first.batch.pending, [ids(3)[1], ids(3)[2]]);

  batch = first.batch;
  const second = nextStep(batch);
  assert.equal(second.jobId, ids(3)[1]);
});

test("antrean habis tapi target belum tercapai -> lanjut panen halaman berikutnya", () => {
  const batch = { ...makeBatch(), pending: [], pagesHarvested: 1, nextStart: PAGE_SIZE };
  const step = nextStep(batch);
  assert.equal(step.kind, "harvest");
  assert.match(step.url, new RegExp(`start=${PAGE_SIZE}`));
});

test("berhenti memaginasi setelah batas halaman", () => {
  const batch = { ...makeBatch(), pending: [], pagesHarvested: MAX_PAGES };
  assert.equal(nextStep(batch).kind, "done");
  assert.equal(nextStep(batch).reason, "exhausted");
});

test("target tercapai menghentikan batch walau antrean masih ada", () => {
  const batch = { ...makeBatch(), analyzed: 2, target: 2 };
  const step = nextStep(batch);
  assert.equal(step.kind, "done");
  assert.equal(step.reason, "target");
  assert.equal(isComplete(batch), true);
});

test("harvest menambahkan lowongan baru tanpa mengulang yang sudah pernah dilihat", () => {
  const batch = makeBatch();
  const merged = harvest(batch, [ids(3)[0], "9999999999"]);
  assert.deepEqual(merged.pending, [...ids(3), "9999999999"]);
  assert.equal(merged.pagesHarvested, 2);
  assert.equal(merged.nextStart, PAGE_SIZE * 2);
});

test("record menghitung tiap status secara terpisah", () => {
  let batch = makeBatch();
  batch = record(batch, { jobId: "1", status: "analyzed" });
  batch = record(batch, { jobId: "2", status: "skipped" });
  batch = record(batch, { jobId: "3", status: "failed" });
  assert.equal(batch.analyzed, 1);
  assert.equal(batch.skipped, 1);
  assert.equal(batch.failed, 1);
  assert.equal(batch.currentJobId, null);
  assert.equal(batch.lastJobId, "3");
});

test("status tak dikenal tidak menambah hitungan apa pun", () => {
  const batch = record(makeBatch(), { jobId: "1", status: "aneh" });
  assert.deepEqual([batch.analyzed, batch.skipped, batch.failed], [0, 0, 0]);
});

test("stop mengosongkan antrean dan menutup batch", () => {
  const batch = stop(makeBatch(), { now: 2000 });
  assert.equal(batch.active, false);
  assert.equal(batch.stopped, true);
  assert.deepEqual(batch.pending, []);
  assert.equal(batch.currentJobId, null);
  assert.equal(nextStep(batch).kind, "done");
});

test("finish menyimpan waktu selesai", () => {
  const batch = finish(makeBatch(), { now: 5000 });
  assert.equal(batch.finishedAt, 5000);
  assert.equal(batch.stopped, false);
});

test("summary melaporkan progres yang bisa ditampilkan", () => {
  const batch = record({ ...makeBatch(), analyzed: 1 }, { jobId: "x", status: "skipped" });
  const result = summary(batch);
  assert.equal(result.target, 2);
  assert.equal(result.analyzed, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.pending, 3);
  assert.equal(result.done, false);
  assert.equal(summary(null), null);
});

test("URL pencarian tanpa searchUrl tidak membuat crash", () => {
  const batch = createBatch({ jobIds: ["1"], target: 1, searchUrl: null });
  batch.pending = [];
  batch.analyzed = 0;
  assert.equal(nextStep(batch).kind, "done");
});

test("pilihan hitung ulang disimpan di state batch", () => {
  const off = createBatch({ jobIds: ["1"], target: 5, searchUrl: SEARCH });
  assert.equal(off.reanalyze, false, "default-nya melewati yang sudah dinilai");

  const on = createBatch({ jobIds: ["1"], target: 5, searchUrl: SEARCH, reanalyze: true });
  assert.equal(on.reanalyze, true);
  assert.equal(summary(on).reanalyze, true);
});

test("pilihan hitung ulang bertahan di setiap transisi state", () => {
  // Flag ini dibaca di tiap halaman lowongan selama batch, jadi harus selamat
  // melewati harvest, perpindahan lowongan, pencatatan hasil, dan penutupan.
  let batch = createBatch({ jobIds: ["1", "2"], target: 2, searchUrl: SEARCH, reanalyze: true });

  batch = nextStep(batch).batch;
  assert.equal(batch.reanalyze, true);

  batch = harvest(batch, ["3"]);
  assert.equal(batch.reanalyze, true);

  batch = record(batch, { jobId: "1", status: "analyzed" });
  assert.equal(batch.reanalyze, true);

  batch = finish(batch, { now: 9 });
  assert.equal(batch.reanalyze, true);
  assert.equal(summary(batch).reanalyze, true);
});
