import assert from "node:assert/strict";
import test from "node:test";

// signals.js dan messages.js adalah classic script tanpa export, jadi keduanya
// diambil lewat global. i18n.js memuat messages.js lebih dulu.
import "../src/lib/i18n.js";
import "../src/shared/signals.js";

const { parseSignals, signalRows, signalLines } = globalThis.JevSignals;
const { setLocale } = globalThis.JevMessages;

// String di bawah ini disalin apa adanya dari DOM LinkedIn yang sudah dirender
// (akun dengan antarmuka Indonesia), termasuk kasus "Diposting1" tanpa spasi.
const DETAIL_HEADER = `BJAK
Full Stack Software Engineer - AI Finance Agent 
Singapura · 1 hari yang lalu · 39 orang mengklik Lamar
Dipromosikan oleh pembuka lowongan • Respons dikelola di luar LinkedIn
Jarak Jauh
Penuh waktu
Lamar
Simpan`;

const FULL_SIGNALS = {
  applicants: 39,
  earlyApplicant: false,
  postedLabel: "1 hari yang lalu",
  postedDaysAgo: 1,
  connections: 1,
  activelyReviewing: true,
  easyApply: true,
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

test("header detail: pelamar, umur postingan, dan tanda dipromosikan", () => {
  const signals = parseSignals(DETAIL_HEADER);
  assert.equal(signals.applicants, 39);
  assert.equal(signals.postedLabel, "1 hari yang lalu");
  assert.equal(signals.postedDaysAgo, 1);
  assert.equal(signals.promoted, true);
  assert.equal(signals.easyApply, false);
  assert.equal(signals.connections, null);
});

test("umur postingan dinormalkan ke satuan hari", () => {
  const cases = [
    ["Diposting8 jam yang lalu", 0.3],
    ["Diposting1 hari yang lalu", 1],
    ["Diposting 2 minggu yang lalu", 14],
    ["Diposting 3 bulan yang lalu", 90],
    ["Diposting 1 tahun yang lalu", 365],
  ];
  for (const [text, expected] of cases) {
    assert.equal(parseSignals(text).postedDaysAgo, expected, `gagal untuk "${text}"`);
  }
});

test("label Inggris juga dikenali", () => {
  const signals = parseSignals(
    "Singapore · 2 weeks ago · 39 people clicked apply\nActively reviewing applicants\nEasy Apply",
  );
  assert.equal(signals.applicants, 39);
  assert.equal(signals.postedDaysAgo, 14);
  assert.equal(signals.activelyReviewing, true);
  assert.equal(signals.easyApply, true);
});

test("koneksi di perusahaan terbaca dari kartu daftar", () => {
  assert.equal(parseSignals("Astek\nSenior Software Engineer\n1 koneksi bekerja di sini").connections, 1);
  assert.equal(parseSignals("Acme\nEngineer\n3 connections work here").connections, 3);
});

test("pelamar awal tidak dianggap punya jumlah pelamar", () => {
  const signals = parseSignals(
    "Entangl, Inc.\nFull Stack Engineer\nJadilah pelamar awal\nDiposting8 jam yang lalu",
  );
  assert.equal(signals.applicants, null);
  assert.equal(signals.earlyApplicant, true);
  assert.equal(signals.postedDaysAgo, 0.3);
});

test("pemisah ribuan pada jumlah pelamar dibaca sebagai angka utuh", () => {
  assert.equal(parseSignals("1.234 orang mengklik Lamar").applicants, 1234);
  assert.equal(parseSignals("1,234 people clicked apply").applicants, 1234);
});

test("kalimat deskripsi tidak salah dibaca sebagai umur postingan", () => {
  const description = `About the job
We launched our first product 5 years ago and now serve 2 million users.
Our mission started 3 bulan yang lalu di Jakarta.`;
  const signals = parseSignals(description);
  assert.equal(signals.postedDaysAgo, null);
  assert.equal(signals.postedLabel, null);
});

test("halaman tanpa sinyal mengembalikan nilai kosong, bukan tebakan", () => {
  assert.deepEqual(parseSignals("Acme\nSoftware Engineer\nJakarta"), EMPTY_SIGNALS);
});

test("teks kosong atau null tidak membuat crash", () => {
  for (const input of ["", null, undefined]) {
    assert.equal(parseSignals(input).applicants, null);
    assert.equal(parseSignals(input).postedDaysAgo, null);
  }
});

test("baris sinyal diterjemahkan sesuai bahasa yang aktif", () => {
  setLocale("id");
  const id = signalRows(FULL_SIGNALS);
  assert.deepEqual(
    id.map((row) => row.label),
    ["Pelamar", "Diposting", "Koneksi di perusahaan", "Recruiter", "Lowongan", "Jalur lamar"],
  );
  assert.equal(id[0].value, "39 orang sudah mengklik Lamar");
  assert.equal(id[1].value, "1 hari yang lalu");

  setLocale("en");
  const en = signalRows(FULL_SIGNALS);
  assert.deepEqual(
    en.map((row) => row.label),
    ["Applicants", "Posted", "Connections at the company", "Recruiter", "Posting", "Application route"],
  );
  assert.equal(en[0].value, "39 people have clicked apply");
  assert.equal(en[1].value, "1 hari yang lalu", "kutipan dari halaman tidak ikut diterjemahkan");
});

test("konversi satuan umur postingan hanya muncul kalau menambah informasi", () => {
  setLocale("en");
  const days = signalRows({ ...EMPTY_SIGNALS, postedLabel: "1 day ago", postedDaysAgo: 1 });
  assert.equal(days[0].value, "1 day ago");

  const weeks = signalRows({ ...EMPTY_SIGNALS, postedLabel: "2 weeks ago", postedDaysAgo: 14 });
  assert.equal(weeks[0].value, "2 weeks ago (about 14 days ago)");
});

test("signalLines mengubah baris jadi prosa untuk state Jev", () => {
  setLocale("en");
  const lines = signalLines({ ...EMPTY_SIGNALS, applicants: 12, promoted: true });
  assert.deepEqual(lines, ["Applicants: 12 people have clicked apply", "Posting: promoted (paid) by the company"]);
});

test("signalRows mengembalikan kosong tanpa sinyal", () => {
  setLocale("id");
  assert.deepEqual(signalRows(null), []);
  assert.deepEqual(signalRows(EMPTY_SIGNALS), []);
});
