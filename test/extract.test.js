import assert from "node:assert/strict";
import test from "node:test";

// extract.js adalah content script tanpa export; ia menaruh fungsinya di global.
import "../src/content/extract.js";

const { jobIdFromCardKey, looksLikeTitle } = globalThis.JevExtract;

test("ID lowongan dibaca dari componentkey kartu", () => {
  assert.equal(jobIdFromCardKey("job-card-component-ref-4469108058"), "4469108058");
  assert.equal(jobIdFromCardKey("job-card-component-ref-1"), "1");
});

test("componentkey lain tidak dianggap ID lowongan", () => {
  assert.equal(jobIdFromCardKey("job-card-component"), null);
  assert.equal(jobIdFromCardKey("some-other-component-ref-123"), null);
  assert.equal(jobIdFromCardKey("job-card-component-ref-abc"), null);
  assert.equal(jobIdFromCardKey("job-card-component-ref-4469108058-extra"), null);
  assert.equal(jobIdFromCardKey(""), null);
  assert.equal(jobIdFromCardKey(null), null);
  assert.equal(jobIdFromCardKey(undefined), null);
});

test("hanya nilai persis yang diterima, bukan substring", () => {
  assert.equal(jobIdFromCardKey("prefix-job-card-component-ref-123"), null);
});

test("judul lowongan diterima", () => {
  assert.equal(looksLikeTitle("Full Stack Software Engineer - AI Finance Agent"), true);
  assert.equal(looksLikeTitle("Backend Engineer, AI (Agent Systems)"), true);
});

test("label penanda bukan judul", () => {
  for (const label of ["Jarak Jauh", "Penuh waktu", "Lamar", "Simpan", "I'm interested", "Dilihat"]) {
    assert.equal(looksLikeTitle(label), false, `"${label}" tidak boleh jadi judul`);
  }
});

test("widget keahlian LinkedIn bukan judul lowongan", () => {
  // Ini yang muncul sebagai link di halaman lowongan yang sudah ditutup, dan
  // pernah terbaca sebagai judul.
  assert.equal(looksLikeTitle("4 dari 10 keahlian cocok"), false);
  assert.equal(looksLikeTitle("4 of 10 skills match"), false);
  assert.equal(looksLikeTitle(""), false);
  assert.equal(looksLikeTitle(null), false);
});
