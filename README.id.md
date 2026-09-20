# Jev Job Match

[![CI](https://github.com/ashafizullah/jev-linkedin/actions/workflows/ci.yml/badge.svg)](https://github.com/ashafizullah/jev-linkedin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) · **Bahasa Indonesia**

Extension Chrome untuk menilai **seberapa cocok sebuah lowongan LinkedIn dengan CV kamu**, dan
**seberapa besar kemungkinan lamaran kamu lolos seleksi** — memakai model keputusan **Jev**.

Jev bukan LLM chat. Dia model "System One" yang menerima `state` + pertanyaan bertipe dan
membalas **probabilitas terkalibrasi**, bukan prosa. Jadi angka kecocokan di sini bukan tebakan
dari kalimat yang diparsing, tapi memang distribusi probabilitas yang dikembalikan model.

## Cara kerja

Satu panggilan ke `POST /v1/systemone` mengirim state terstruktur:

```
kandidat  -> ringkasan profil + teks CV
lowongan  -> judul, perusahaan, lokasi, mode kerja, deskripsi
```

lalu menanyakan 10 pertanyaan sekaligus (Jev mengevaluasinya paralel, jadi menambah pertanyaan
nyaris tidak menambah waktu):

| Pertanyaan | Tipe | Dipakai untuk |
| --- | --- | --- |
| `fit_overall` | choice (5 level) | **% kecocokan** |
| `outcome` | choice (5 tahap rekrutmen) | **perkiraan peluang lolos** |
| `biggest_gap` | choice (9 kategori) | penyebab paling mungkin ditolak |
| `worth_applying` | noul | keputusan "layak dilamar atau tidak" |
| `meets_experience`, `meets_location`, `meets_language`, `has_domain_experience`, `has_required_tech` | noul | daftar centang syarat |
| `seniority_fit` | score (5 level) | kesesuaian level |

### Sinyal bukti dari halaman

Teks CV vs deskripsi lowongan saja tidak cukup: kenyataannya kamu bersaing dengan **pelamar
lain**, bukan dengan deskripsinya. Jadi extension juga membaca sinyal yang sudah tersedia di
halaman dan mengirimnya sebagai bagian dari `state`:

| Sinyal | Contoh di halaman |
| --- | --- |
| Jumlah pelamar | "39 orang mengklik Lamar" / "39 people clicked apply" |
| Umur postingan | "Diposting1 hari yang lalu" → 1 hari; "2 minggu yang lalu" → 14 hari |
| Koneksi di perusahaan | "1 koneksi bekerja di sini" / "1 connection works here" |
| Pelamar awal | "Jadilah pelamar awal" / "Be an early applicant" |
| Status tinjauan recruiter | "Meninjau pelamar secara aktif" / "Actively reviewing applicants" |
| Jalur lamar | "Melamar Mudah" / "Easy Apply" |
| Dipromosikan | "Dipromosikan oleh pembuka lowongan" / "Promoted by the poster" |

Pelabelan LinkedIn mengikuti bahasa antarmuka situsnya, jadi setiap pola tersedia dalam versi
Indonesia dan Inggris. Dua penjagaan penting:

- Kalau sinyal tidak terbaca, bagian `sinyal_peluang` **tidak dikirim sama sekali** — model
  tidak diberi kesempatan mengarang.
- Umur postingan bentuk telanjang ("1 hari yang lalu", tanpa kata "Diposting") hanya dicari di
  baris metadata yang memuat pemisah `·`, supaya kalimat deskripsi seperti *"we launched 3 years
  ago"* tidak salah dibaca sebagai umur postingan.

Sinyal yang dipakai selalu ditampilkan di panel pada bagian **Sinyal yang dipakai**, jadi kamu
bisa memeriksa sendiri bukti apa yang masuk ke penilaian.

### Rumus

Semua angka dihitung di kode dari distribusi probabilitas, bukan diambil mentah dari model:

```
% kecocokan        = Σ (index_level × probabilitas_level) / 4 × 100
% lolos screening  = P(interview teknis) + P(interview final) + P(offer)
% dapat offer      = P(offer)
```

Keputusan akhir:

| Kondisi | Label |
| --- | --- |
| `worth_applying ≥ 0.6` dan lolos screening ≥ 50% | Prioritaskan |
| `worth_applying ≥ 0.6` | Layak dilamar |
| `worth_applying ≥ 0.4` | Peluang sedang, boleh dicoba |
| selain itu | Sebaiknya dilewati |

> **Penting:** angka "peluang" adalah **penilaian model** atas teks CV dan deskripsi lowongan,
> bukan peluang statistik yang sesungguhnya. Model tidak tahu siapa pelamar lain, seberapa
> penuh posisinya, atau kebijakan internal perusahaan. Pakai sebagai sinyal awal, bukan keputusan final.

## Bahasa

Seluruh extension tersedia dalam **Indonesia dan Inggris**: panel, halaman Settings, popup,
README, dan pertanyaan yang dikirim ke Jev.

- **Settings → Bahasa antarmuka** untuk memilih antara *Ikut bahasa browser*, *Bahasa Indonesia*,
  dan *English*.
- Nilai awalnya *Ikut bahasa browser*: browser berbahasa Indonesia dapat Indonesia, bahasa lain
  jatuh ke Inggris.
- Pergantian langsung berlaku, termasuk untuk hasil yang sudah di-cache — laporan tersimpan hanya
  memuat kunci dan angka mentah, sedangkan seluruh labelnya diterjemahkan saat render.
- Mengganti bahasa juga mengganti bahasa pertanyaan yang diterima Jev, jadi CV dan deskripsi
  lowongan berbahasa Inggris dinilai dengan rubrik Inggris.

## Instalasi

```bash
npm install
npm run vendor     # menyalin pdf.js + mammoth ke vendor/
```

1. Buka `chrome://extensions`
2. Aktifkan **Developer mode**
3. **Load unpacked** → pilih folder repo ini
4. Klik ikon extension → **Buka Settings**

## Setup

**1. Koneksi ke model**

- **Base URL** — endpoint yang menyediakan `jev-latest`. Default `https://api.typesafe.ai/v1`
  (API asli TypeSafe). Extension memanggil `<baseUrl>/systemone`.
  Gateway OpenAI-compatible seperti `https://api.experientiallabs.ai/v1` juga jalan — endpoint
  `/v1/systemone`-nya menerima bentuk request yang sama, hanya jauh lebih lambat.
  Kalau kamu memakai host lain, Chrome akan meminta izin akses saat menyimpan.
- **API key** — disimpan di `chrome.storage.local` di komputer kamu dan hanya dikirim ke base URL itu.
- **Model** — default `jev-latest`. Tombol **Muat daftar** mengambil daftar model dari endpoint;
  kedua bentuk respons (`{data:[{id}]}` dan `{models:[{name}]}`) sudah ditangani.
- **Tes koneksi** memastikan key valid dan model yang dipilih memang tersedia.

> Alias `jev-latest` di-resolve server ke versi konkret (mis. `jev-1.13.0`). Versi itulah yang
> ditampilkan di footer panel, supaya kamu tahu persis model mana yang menilai.

**2. CV kamu**

Tarik file **PDF / DOCX / TXT** ke drop zone, atau tempel teksnya langsung ke kotak yang tersedia.
Teksnya diekstrak di browser kamu sendiri (tidak diunggah ke mana pun) dan bisa kamu rapikan
manual. Analisis butuh minimal 100 karakter.

> PDF hasil scan/gambar tidak punya lapisan teks, jadi perlu di-OCR dulu. Extension akan
> memberi tahu kalau teks yang terbaca terlalu sedikit.

Di bawah teksnya, enam detail terisi otomatis darinya — ringkasan peran, total pengalaman, lokasi,
pendidikan, bahasa, dan skill utama. Ekstraksinya memakai pencocokan kata kunci dan pola biasa,
dijalankan lokal: tanpa endpoint kedua, tanpa biaya tambahan, hasilnya bisa diprediksi.
**Isi otomatis dari CV** menjalankannya ulang, dan ia hanya menulis ke field yang **kosong** —
tidak akan pernah menimpa yang sudah kamu ketik tangan.

**Tidak ada bagian preferensi lamaran, dan itu memang disengaja.** Sebelumnya ada isian izin
kerja, ekspektasi gaji, mode kerja, dan catatan. Kami menghapusnya setelah mengukur bahwa ia tidak
mengubah keputusan apa pun: pada satu lowongan nyata (BJAK, mewajibkan domisili Singapura,
kandidat di Batam), empat kali jalan per variasi menghasilkan keputusan dan penyebab utama yang
sama, baik profilnya hanya CV maupun terisi lengkap. Ternyata `expectedSalary` juga tidak pernah
dipakai oleh satu pun dari sepuluh pertanyaan — beban mati sejak awal. Yang justru bergerak adalah
cek teknologi (68,5% → 79,3%) setelah daftar skill ditulis eksplisit, dan itulah alasan detail
hasil ekstraksi tetap dipertahankan sementara field preferensi dihapus.

Field yang kosong memang tidak dikirim ke Jev, jadi analisis tetap jalan hanya dengan teks CV.

## Pakai

Buka halaman detail lowongan di LinkedIn. Panel muncul di kanan bawah:

- Kalau lowongan itu sudah pernah dianalisis, hasilnya langsung tampil dari cache.
- Kalau belum, klik **Analisis lowongan ini**.

Analisis lewat API TypeSafe langsung selesai dalam **1–2 detik** (semua pertanyaan dievaluasi
paralel). Kalau kamu memakai gateway perantara, waktunya bisa 20–60 detik — panel menampilkan
timer berjalan supaya kamu tahu prosesnya hidup, dan extension mengirim heartbeat agar service
worker MV3 tidak dimatikan di tengah request. Hasilnya di-cache per ID lowongan, jadi kunjungan
berikutnya instan. **Analisis ulang** memaksa penilaian baru.

Hasil bisa dibaca lagi kapan saja di **Settings → Riwayat analisis**.

## Analisis massal

Daripada menilai lowongan satu per satu, extension bisa menelusuri satu halaman pencarian
untuk kamu.

1. Buka **halaman hasil pencarian** lowongan di LinkedIn.
2. Di panel, pilih jumlah (5 / 10 / 25 / 50) lalu klik **Analisis N lowongan di halaman ini**.
3. Extension membuka tiap lowongan satu per satu di tab yang sama, menilainya, lalu lanjut
   sendiri. Di akhir muncul ringkasan dan tautan ke dashboard.

Antreannya disimpan di `chrome.storage`, jadi progresnya bertahan melewati setiap pemuatan
halaman. Kalau lowongan di halaman itu habis tapi target belum tercapai, extension memaginasi
pencariannya sendiri (`&start=25`, maksimal 6 halaman) dan terus jalan. Tombol **Hentikan** di
panel (atau di dashboard) mengakhirinya.

Ada checkbox opsional, **Analisis ulang yang sudah pernah dinilai**, untuk saat kamu mengubah CV
dan ingin semua angkanya diperbarui:

- **Tidak dicentang (default)** — lowongan yang sudah ada di cache dilewati, tidak dihitung ke
  target, dan panel melaporkan berapa yang dilewati.
- **Dicentang** — lowongan itu dinilai ulang, ikut dihitung ke target, dan hasil lamanya ditimpa.

Jadi batch 10 selalu berarti "10 lowongan dinilai pada jalan ini", dengan pilihan mana pun.

Dua hal penting soal cara kerjanya:

- **Tidak ada satu pun klik ke LinkedIn.** ID lowongan dibaca dari atribut
  `componentkey="job-card-component-ref-<id>"` pada kartunya, lalu tiap lowongan dibuka lewat
  URL. Ini penting: satu-satunya tombol di dalam kartu adalah **"Abaikan lowongan"** — mengklik
  kartunya tidak berefek, dan mengklik tombolnya justru membuang lowongan itu dari feed kamu.
- Ada jeda acak 1,5–3 detik antar lowongan. Meski begitu, ini menjalankan sesi login kamu yang
  sebenarnya, jadi LinkedIn bisa membatasi laju atau memunculkan CAPTCHA kalau kamu menjalankan
  beberapa batch besar berturut-turut. Mulai dari yang kecil.

## Dashboard

**Settings → Buka dashboard** (atau tombol di akhir batch) membuka halaman berisi semua
lowongan yang pernah dinilai: **urutannya default dari yang paling baru dianalisis**, bisa
diurutkan berdasarkan kecocokan, waktu, atau perusahaan; disaring berdasarkan keputusan; dicari
berdasarkan posisi atau perusahaan; dan tiap barisnya bertaut ke lowongan aslinya. Dashboard juga
menampilkan batch yang sedang berjalan, bisa menghentikannya, dan menyegarkan diri sendiri selama
batch berjalan.

## Struktur

```
manifest.json              MV3, host permission LinkedIn + endpoint model
src/
  background.js            service worker: routing pesan, panggil Jev, cache
  shared/
    messages.js            kamus ID + EN, t() dengan interpolasi, deteksi locale
    signals.js             parsing sinyal halaman + pemformatan per bahasa
  lib/
    i18n.js                pembungkus ESM untuk kamus
    jev.js                 client /v1/systemone + /models (retry 429/529, timeout, abort)
    questions.js           susun state + pertanyaan bertipe dari lowongan dan profil
    score.js               ubah jawaban Jev jadi persentase, verdict, daftar celah
    analyze.js             orkestrasi state -> pertanyaan -> Jev -> laporan
    batch.js               state machine analisis massal (murni, tanpa DOM/chrome.*)
    settings.js            schema config + chrome.storage
    profile.js             ekstraksi teks PDF (pdf.js) dan DOCX (mammoth)
    cvProfile.js           ekstraksi field profil dari CV secara deterministik
  content/
    extract.js             pembacaan DOM LinkedIn, dipisah supaya bisa diuji
    linkedin.js            panel UI + siklus hidup
    panel.css
  options/                 halaman Settings
  popup/                   popup status
  dashboard/               halaman tabel hasil
scripts/
  vendor-deps.mjs          salin dependency ke vendor/
  make-icons.py            generate ikon
test/                      unit test + integration test ke API sungguhan
```

## Tes

```bash
npm test                                  # unit test saja
JEV_API_KEY=... npm test                  # termasuk integration test ke endpoint sungguhan
```

Integration test memanggil Jev untuk lowongan BJAK yang mewajibkan domisili Singapura sementara
kandidatnya di Batam, lalu memastikan model menandai syarat lokasi sebagai tidak terpenuhi.

Dua file tes ada khusus untuk menjaga terjemahan tetap jujur: `messages.test.js` memastikan kedua
bahasa punya kumpulan kunci yang persis sama, tidak ada nilai yang kosong atau sama dengan
kuncinya, dan setiap kunci yang dipakai di kode benar-benar ada di kamus.

## Pengembangan

Setelah mengubah kode **service worker** (`src/background.js` dan `src/lib/*`), buka
`chrome://extensions` lalu klik **Reload** pada extension-nya. Restart browser saja tidak cukup:
Chrome menyimpan cache skrip service worker di direktori profil, sehingga versi lama masih
dipakai walau file di disk sudah berubah.

Gejalanya halus dan pernah menghabiskan waktu saat mengembangkan fitur sinyal — panel tampak
memakai kode baru (content script selalu dibaca segar dari disk) tapi angka hasil analisisnya
masih berasal dari kode lama. Kalau ada perubahan yang "tidak berefek", reload extension dulu
sebelum mencari bug di kode.

`src/content/*` tidak butuh reload extension; cukup muat ulang halaman LinkedIn.

## Keterbatasan

- **Judul lowongan harus terbaca.** Halaman daftar lowongan LinkedIn sekarang dirender sebagai
  `div` tanpa atribut job-id dan tanpa link per kartu. Karena itu tidak ada badge persentase di
  daftar — hasil hanya tampil setelah kamu membuka detail lowongan. Riwayat di Settings bisa
  dipakai untuk melihat semua yang sudah dinilai.
- **Selektor LinkedIn rapuh.** Ganti layout bisa mematahkan ekstraksi. `extract.js` memakai
  urutan fallback (selector stabil → tombol Lamar sebagai jangkar → `<main>`), dan kalau
  deskripsi tidak bisa dibaca dengan yakin, extension menolak menganalisis daripada mengirim
  teks sampah ke model.
- **Butuh login LinkedIn.** Content script hanya berjalan di halaman yang bisa kamu buka.
- **Sinyal bukti bergantung pada apa yang LinkedIn tampilkan.** Jumlah pelamar, umur postingan,
  dan koneksi hanya ikut dinilai kalau benar-benar ada di halaman. Kalau tidak ada, penilaian
  kembali murni dari teks CV vs deskripsi — dan panel akan jujur tidak menampilkan bagian sinyal.
- **Satu lowongan per analisis** kalau dijalankan manual. Mode massal menelusuri satu halaman
  pencarian untuk kamu, tapi dibatasi 50 lowongan dan 6 halaman per batch, dan akan berhenti
  kalau LinkedIn mengubah atribut kartu yang dipakai.
- **Analisis massal menjalankan sesi login kamu sendiri.** Tiap lowongan dibuka lewat URL dengan
  jeda 1,5–3 detik, tapi LinkedIn tetap bisa membatasi laju atau memunculkan tantangan kalau
  kamu menjalankan beberapa batch besar berturut-turut. Hasilnya juga menumpuk di
  `chrome.storage.local`, yang dibatasi Chrome di 10 MB kecuali extension meminta
  `unlimitedStorage` — itu sekitar beberapa ribu laporan, jadi belum jadi batas nyata.
- **Pengisian otomatis dari CV bersifat best effort.** Ia mencocokkan pola yang lazim di CV (nama
  skill yang dikenal, kata gelar, baris `Kota, Negara`, rentang tahun). CV dengan format tidak
  biasa bisa tidak menghasilkan apa-apa — dan saat itu ia mengatakannya, bukan menebak.
