import assert from "node:assert/strict";
import test from "node:test";

import { EXTRACTABLE_FIELDS, extractProfile } from "../src/lib/cvProfile.js";

const CV = `Budi Santoso
Full Stack Developer
Jakarta, Indonesia
budi@example.com | +62 812-3456-7890

RINGKASAN
Full Stack Developer dengan 4 tahun pengalaman membangun produk web.

PENGALAMAN KERJA
Full Stack Developer — PT Ecommerce Nusantara
2022 - sekarang
- Membangun checkout flow dengan Node.js, Express, dan React.

Backend Developer — Startup Fintech
2020 - 2022
- Integrasi payment gateway, PostgreSQL, Redis.

PENDIDIKAN
S1 Teknik Informatika, Universitas Nusantara

KEAHLIAN
TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS, Git

BAHASA
Bahasa Indonesia (native), Inggris (profesional)`;

test("mengambil field yang lazim ada di CV", () => {
  const profile = extractProfile(CV);
  assert.equal(profile.headline, "Full Stack Developer");
  assert.equal(profile.experienceYears, "4");
  assert.equal(profile.location, "Jakarta, Indonesia");
  assert.equal(profile.education, "S1 Teknik Informatika, Universitas Nusantara");
  assert.match(profile.languages, /Bahasa Indonesia \(native\), Inggris \(profesional\)/);
  assert.equal(
    profile.skills,
    "TypeScript, React, Node.js, Express, PostgreSQL, Redis, Docker, AWS, Git",
  );
});

test("tahun pengalaman eksplisit menang atas hitungan rentang", () => {
  const profile = extractProfile("Software Engineer\n8 years of experience\n2015 - sekarang");
  assert.equal(profile.experienceYears, "8");
});

test("rentang tahun yang tumpang tindih tidak dihitung dua kali", () => {
  const profile = extractProfile("Engineer\n2018 - 2021\n2019 - 2022\n2023 - 2024");
  // 2018-2022 = 4 tahun, 2023-2024 = 1 tahun
  assert.equal(profile.experienceYears, "5");
});

test("rentang terbuka dihitung sampai tahun berjalan", () => {
  const current = new Date().getFullYear();
  const profile = extractProfile(`Engineer\n2020 - sekarang`);
  assert.equal(profile.experienceYears, String(current - 2020));
});

test("Java tidak tertukar dengan JavaScript", () => {
  assert.equal(extractProfile("Backend engineer\nJava, Spring Boot").skills, "Java, Spring");
  assert.equal(extractProfile("Frontend engineer\nJavaScript dan CSS").skills, "JavaScript, CSS");
});

test("Node.js tidak dianggap JavaScript", () => {
  assert.equal(extractProfile("Backend\nNode.js").skills, "Node.js");
});

test("PostgreSQL tidak menghasilkan MySQL atau SQL", () => {
  assert.equal(extractProfile("Database\nPostgreSQL").skills, "PostgreSQL");
});

test("baris bahasa tidak salah dibaca sebagai lokasi", () => {
  const profile = extractProfile(
    "Adam\nFull Stack Developer\nBAHASA\nBahasa Indonesia (native), Inggris (profesional)",
  );
  assert.equal(profile.location, "");
});

test("lokasi hanya diterima dalam bentuk Kota, Negara", () => {
  assert.equal(extractProfile("Adam\nJakarta, Indonesia").location, "Jakarta, Indonesia");
  assert.equal(extractProfile("Adam\nSingapore").location, "Singapore");
  assert.equal(extractProfile("Adam\nRemote worker di Indonesia bagian barat").location, "");
});

test("pendidikan dikenali dari beberapa bentuk gelar", () => {
  assert.match(extractProfile("Budi\nBachelor of Computer Science").education, /Bachelor/);
  assert.match(extractProfile("Budi\nMagister Manajemen").education, /Magister/);
  assert.match(extractProfile("Budi\nD3 Akuntansi").education, /D3/);
});

test("bahasa digabung kalau tidak ada satu baris yang memuat dua bahasa", () => {
  const profile = extractProfile("Engineer\nIndonesia\nEnglish\nMandarin");
  assert.match(profile.languages, /Indonesia/);
  assert.match(profile.languages, /Inggris/);
});

test("input kosong atau sampah tidak menghasilkan tebakan", () => {
  for (const input of ["", "   ", null, undefined, 42, "x".repeat(10)]) {
    const profile = extractProfile(input);
    assert.equal(typeof profile.headline, "string");
    assert.equal(typeof profile.skills, "string");
  }
});

test("daftar skill dibatasi walaupun CV menyebut sangat banyak", () => {
  const many = [
    "JavaScript", "TypeScript", "Python", "Java", "Kotlin", "Swift", "Rust", "PHP", "Ruby",
    "Dart", "React", "Vue", "Angular", "Svelte", "Flutter", "Django", "Flask", "Laravel",
    "Rails", "GraphQL", "Kafka", "RabbitMQ", "MySQL", "MongoDB", "Elasticsearch", "Terraform",
    "Kubernetes", "Azure", "GCP", "Linux", "Figma", "Tableau",
  ].join(", ");
  const count = extractProfile(many).skills.split(", ").length;
  assert.ok(count <= 20, `terlalu banyak skill: ${count}`);
});

test("hanya mengembalikan field yang memang bisa dibaca dari CV", () => {
  const profile = extractProfile(CV);
  assert.deepEqual(Object.keys(profile).sort(), [...EXTRACTABLE_FIELDS].sort());
  // Preferensi lamaran sengaja tidak ada: bukan isi CV.
  for (const field of ["workAuthorization", "expectedSalary", "workModePreference", "notes"]) {
    assert.equal(field in profile, false, `${field} tidak boleh ada`);
  }
});

// ---- lintas bidang: ekstraksi tidak boleh hanya bekerja untuk CV teknologi ----

test("CV perawat terbaca", () => {
  const profile = extractProfile(`Siti Rahayu
Perawat
Bandung, Indonesia

RINGKASAN
Perawat dengan 5 tahun pengalaman di ruang ICU dan IGD.

KEAHLIAN
keperawatan, ICU / IGD, BLS / ACLS, rekam medis

PENDIDIKAN
D3 Keperawatan, Politeknik Kesehatan Nusantara`);

  assert.equal(profile.headline, "Perawat");
  assert.equal(profile.experienceYears, "5");
  assert.equal(profile.location, "Bandung, Indonesia");
  assert.equal(profile.education, "D3 Keperawatan, Politeknik Kesehatan Nusantara");
  for (const skill of ["Keperawatan", "ICU / IGD", "BLS / ACLS", "Rekam medis"]) {
    assert.match(profile.skills, new RegExp(skill.replace("/", "\\/")), `kurang ${skill}`);
  }
});

test("CV akuntan terbaca", () => {
  const profile = extractProfile(`Andi Pratama
Staff Akuntansi
Surabaya, Indonesia

RINGKASAN
Akuntan dengan 3 tahun pengalaman menyusun laporan keuangan.

KEAHLIAN
akuntansi, perpajakan, Microsoft Excel, SAP, rekonsiliasi

PENDIDIKAN
S1 Akuntansi, Universitas Nusantara`);

  assert.equal(profile.headline, "Staff Akuntansi");
  assert.equal(profile.experienceYears, "3");
  for (const skill of ["Akuntansi", "Perpajakan", "Laporan keuangan", "Rekonsiliasi", "SAP", "Microsoft Excel"]) {
    assert.match(profile.skills, new RegExp(skill), `kurang ${skill}`);
  }
});

test("CV guru terbaca", () => {
  const profile = extractProfile(`Rina Wati
Guru Matematika
Yogyakarta, Indonesia

KEAHLIAN
kurikulum, manajemen kelas, RPP / lesson plan, e-learning

PENDIDIKAN
S1 Pendidikan Matematika, Universitas Nusantara`);

  assert.equal(profile.headline, "Guru Matematika");
  for (const skill of ["Kurikulum", "Manajemen kelas", "RPP / lesson plan", "E-learning"]) {
    assert.match(profile.skills, new RegExp(skill), `kurang ${skill}`);
  }
});

test("CV logistik terbaca", () => {
  const profile = extractProfile(`Joko Susilo
Driver
Semarang, Indonesia

KEAHLIAN
manajemen inventaris, pengadaan, rantai pasok`);

  assert.equal(profile.headline, "Driver");
  for (const skill of ["Manajemen inventaris", "Pengadaan", "Rantai pasok"]) {
    assert.match(profile.skills, new RegExp(skill), `kurang ${skill}`);
  }
});

test("baris pendidikan yang menyebut institusi lebih dipilih", () => {
  const profile = extractProfile(`Budi
D3 ditempuh sambil bekerja
D3 Akuntansi, Politeknik Nusantara`);
  assert.equal(
    profile.education,
    "D3 Akuntansi, Politeknik Nusantara",
    "baris dengan nama institusi harus menang",
  );
});
