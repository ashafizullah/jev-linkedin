/**
 * Kamus dua bahasa untuk seluruh extension, termasuk teks yang dikirim ke Jev.
 *
 * Ditulis sebagai classic script (bukan ESM) supaya bisa dipakai content script,
 * service worker, halaman Settings, dan popup sekaligus. Konteks ESM mengambilnya
 * lewat src/lib/i18n.js.
 */
(() => {
  const LOCALES = ["id", "en"];
  const FALLBACK_LOCALE = "en";

  const MESSAGES = {
    id: {
      "common.checking": "Memeriksa…",
      "common.settings": "Settings",
      "common.unknown": "Belum jelas",

      "panel.hide": "Sembunyikan",
      "panel.back": "Kembali ke pilihan awal",
      "panel.analyze": "Analisis lowongan ini",
      "panel.reanalyze": "Analisis ulang",
      "panel.retry": "Coba lagi",
      "panel.openSettings": "Buka Settings",
      "panel.loading": "Menilai lowongan ini… {seconds}s",
      "panel.loadingHint": "Jev mengevaluasi semua pertanyaan sekaligus di sisi server.",
      "panel.idle": "Buka detail lowongan, lalu jalankan analisis.",
      "panel.jobFallback": "Lowongan",
      "panel.matchUnit": "cocok",
      "panel.confidence": "keyakinan model {percent}%",
      "panel.screeningTitle": "Peluang lolos seleksi",
      "panel.passScreening": "Sampai tes keahlian",
      "panel.offerChance": "Kemungkinan dapat offer",
      "panel.mostLikelyStop": "paling mungkin berhenti di: {stage}",
      "panel.signalsTitle": "Sinyal yang dipakai",
      "panel.seniorityTitle": "Kesesuaian level",
      "panel.checksTitle": "Syarat lowongan",
      "panel.gapsTitle": "Kemungkinan penyebab ditolak",
      "panel.cached": "dari cache",
      "panel.footer": "{model} · {date}",
      "panel.disclaimer":
        "Angka ini penilaian model atas teks CV, deskripsi lowongan, dan sinyal di halaman — bukan peluang statistik yang sesungguhnya. Pakai sebagai sinyal awal, bukan keputusan final.",

      "error.unexpected": "Terjadi kesalahan tak terduga.",
      "error.noJobId": "Tidak bisa membaca ID lowongan dari halaman ini.",
      "error.noDescription": "Deskripsi lowongan tidak terbaca. Coba buka detail lowongan lalu ulangi.",
      "error.noApiKey": "API key belum diisi. Buka Settings extension.",
      "error.noBaseUrl": "Base URL belum diisi. Buka Settings extension.",
      "error.noQuestions": "Tidak ada pertanyaan yang dikirim.",
      "error.badResponse": "Jev tidak mengembalikan jawaban yang bisa dibaca.",
      "error.timeout": "Permintaan ke Jev timeout.",
      "error.notConfigured": "Base URL atau API key belum diisi. Buka Settings extension dulu.",
      "error.noCv": "CV belum diunggah. Buka Settings extension dan unggah CV kamu.",
      "error.noJobOnPage": "Tidak menemukan detail lowongan di halaman ini.",
      "error.descriptionTooShort":
        "Deskripsi lowongan tidak terbaca atau terlalu pendek. Scroll sampai deskripsi terbuka penuh, lalu coba lagi.",
      "error.noResponse": "Extension tidak merespons. Coba muat ulang halaman.",
      "error.http": "HTTP {status}",
      "error.fileType": "Format {extension} belum didukung. Pakai PDF, DOCX, atau TXT.",
      "error.fileTypeGeneric": "Format file ini belum didukung. Pakai PDF, DOCX, atau TXT.",
      "error.mammothMissing": "Parser DOCX tidak termuat. Muat ulang halaman Settings.",
      "error.pdfScanned":
        "Hampir tidak ada teks yang terbaca. Kalau PDF ini hasil scan/gambar, teksnya perlu di-OCR dulu.",
      "error.emptyFile": "File berhasil dibaca tapi tidak berisi teks apa pun.",
      "error.invalidUrl": "Base URL tidak valid.",

      "state.headline": "Ringkasan",
      "state.experienceYears": "Total pengalaman (tahun)",
      "state.location": "Lokasi",
      "state.languages": "Bahasa",
      "state.education": "Pendidikan tertinggi",
      "state.skills": "Skill utama",
      "state.cvContent": "Isi CV",
      "state.position": "Posisi",
      "state.company": "Perusahaan",
      "state.jobLocation": "Lokasi",
      "state.workMode": "Tipe kerja",
      "state.employmentType": "Jenis pekerjaan",
      "state.description": "Deskripsi",
      "state.candidateKey": "kandidat",
      "state.jobKey": "lowongan",
      "state.signalsKey": "sinyal_peluang",

      "question.fitOverall.instructions":
        "Secara keseluruhan, seberapa cocok profil kandidat dengan apa yang diminta lowongan ini?",
      "question.fitOverall.very_poor": "Tidak memenuhi sebagian besar syarat yang disebut",
      "question.fitOverall.poor": "Hanya memenuhi sebagian kecil syarat",
      "question.fitOverall.fair": "Memenuhi sekitar separuh syarat",
      "question.fitOverall.good": "Memenuhi hampir semua syarat, hanya ada celah kecil",
      "question.fitOverall.excellent": "Memenuhi atau melebihi hampir semua syarat yang disebut",

      "question.biggestGap.instructions":
        "Kalau lamaran kandidat ditolak, apa penyebab paling mungkin? Pilih satu faktor tunggal yang paling menentukan. Bila sinyal peluang menunjukkan lowongan sudah lama dibuka atau sudah banyak pelamar, persaingan bisa jadi penyebabnya meskipun kualifikasi kandidat sudah cukup.",

      "question.gap.experience_years": "Pengalaman kerja relevan kurang dari yang diminta",
      "question.gap.tech_stack": "Tidak menguasai keahlian, alat, atau sertifikasi spesifik yang diminta",
      "question.gap.domain_industry": "Belum punya pengalaman di industri atau domain produk tersebut",
      "question.gap.seniority": "Level senioritas atau cakupan tanggung jawab tidak sepadan",
      "question.gap.location": "Lokasi, izin kerja, atau zona waktu tidak memenuhi syarat",
      "question.gap.language": "Syarat bahasa tidak benar-benar terpenuhi",
      "question.gap.education": "Syarat pendidikan formal atau sertifikasi tidak terpenuhi",
      "question.gap.competition": "Kualifikasi sudah cukup, tapi persaingan pelamar terlalu ketat",
      "question.gap.none": "Tidak ada kesenjangan berarti — kandidat kredibel di atas kertas",
      "question.gap.noneThin":
        "Tidak ada kesenjangan berarti, tapi deskripsi lowongan terlalu minim untuk dinilai",

      "question.outcome.instructions":
        "Jika kandidat ini melamar sekarang, seberapa jauh tahap paling akhir yang kemungkinan besar dia capai dalam proses rekrutmen lowongan ini? Kalau ada data sinyal peluang seperti jumlah pelamar, umur postingan, status tinjauan recruiter, atau koneksi kandidat di perusahaan, pakai itu untuk menimbang seberapa ketat persaingannya.",
      "question.outcome.auto_reject": "Ditolak atau tersaring otomatis sebelum dibaca manusia",
      "question.outcome.recruiter_screen": "Recruiter akan membalas dan melakukan screening awal",
      "question.outcome.technical_interview":
        "Lolos screening dan sampai ke tes keahlian atau interview teknis",
      "question.outcome.final_round": "Sampai ke interview final atau dengan manajemen",
      "question.outcome.offer": "Kemungkinan besar menerima tawaran kerja",

      "question.worthApplying.instructions":
        "Apakah masuk akal bagi kandidat ini untuk meluangkan waktu melamar lowongan ini?",
      "question.worthApplying.true": "Cukup layak untuk dilamar",
      "question.worthApplying.false": "Tidak layak dilamar, peluangnya terlalu kecil atau tidak relevan",

      "question.meetsExperience.instructions":
        "Apakah kandidat memenuhi syarat jumlah tahun pengalaman yang diminta lowongan?",
      "question.meetsExperience.true":
        "Memenuhi atau melebihi minimum; anggap benar bila lowongan tidak menyebut angka",
      "question.meetsExperience.false": "Di bawah minimum yang diminta",

      "question.meetsLocation.instructions":
        "Apakah kandidat memenuhi syarat lokasi, izin kerja, atau domisili yang diminta lowongan?",
      "question.meetsLocation.true": "Terpenuhi, atau lowongan tidak mengharuskan lokasi tertentu",
      "question.meetsLocation.false":
        "Tidak terpenuhi, misalnya lowongan mewajibkan domisili/izin kerja yang tidak dimiliki kandidat",

      "question.meetsLanguage.instructions":
        "Apakah kandidat memenuhi syarat bahasa yang diminta lowongan dengan cukup meyakinkan?",
      "question.meetsLanguage.true": "Terpenuhi, atau lowongan tidak mensyaratkan bahasa tertentu",
      "question.meetsLanguage.false": "Kemampuan bahasa kandidat tidak cukup untuk syarat tersebut",

      "question.hasDomainExperience.instructions":
        "Apakah kandidat punya pengalaman di industri atau domain produk yang disebut lowongan ini?",
      "question.hasDomainExperience.true": "Punya pengalaman relevan di domain tersebut",
      "question.hasDomainExperience.false": "Tidak punya pengalaman di domain tersebut",

      "question.hasRequiredTech.instructions":
        "Apakah kandidat menguasai keahlian, alat, dan sertifikasi utama yang disebut lowongan ini?",
      "question.hasRequiredTech.true": "Menguasai sebagian besar yang disebut",
      "question.hasRequiredTech.false": "Tidak menguasai keahlian inti yang disebut",

      "question.seniorityFit.instructions":
        "Seberapa pas level senioritas kandidat dengan level yang dicari lowongan ini?",
      "question.seniorityFit.0": "Jauh terlalu junior",
      "question.seniorityFit.1": "Agak terlalu junior",
      "question.seniorityFit.2": "Pas",
      "question.seniorityFit.3": "Agak terlalu senior",
      "question.seniorityFit.4": "Jauh terlalu senior",

      "signal.applicants": "Pelamar",
      "signal.applicantsValue": "{count} orang sudah mengklik Lamar",
      "signal.earlyApplicant": "belum ada — bisa jadi pelamar awal",
      "signal.posted": "Diposting",
      "signal.postedDays": "(sekitar {days} hari lalu)",
      "signal.connections": "Koneksi di perusahaan",
      "signal.connectionsValue": "{count} orang",
      "signal.reviewer": "Recruiter",
      "signal.reviewerValue": "aktif meninjau pelamar",
      "signal.promoted": "Lowongan",
      "signal.promotedValue": "dipromosikan berbayar oleh perusahaan",
      "signal.easyApply": "Jalur lamar",
      "signal.easyApplyValue": "Melamar Mudah",

      "fit.very_poor": "Tidak cocok",
      "fit.poor": "Kurang cocok",
      "fit.fair": "Cukup cocok",
      "fit.good": "Cocok",
      "fit.excellent": "Sangat cocok",

      "funnel.auto_reject": "Tersaring otomatis",
      "funnel.recruiter_screen": "Screening recruiter",
      "funnel.technical_interview": "Tes keahlian",
      "funnel.final_round": "Interview final",
      "funnel.offer": "Tawaran kerja",

      "check.meets_experience": "Jumlah tahun pengalaman",
      "check.meets_location": "Lokasi / izin kerja",
      "check.meets_language": "Syarat bahasa",
      "check.has_domain_experience": "Pengalaman di domain yang sama",
      "check.has_required_tech": "Keahlian & alat yang diminta",

      "verdict.priority": "Prioritaskan",
      "verdict.apply": "Layak dilamar",
      "verdict.maybe": "Peluang sedang, boleh dicoba",
      "verdict.skip": "Sebaiknya dilewati",

      "options.title": "Jev Job Match — Settings",
      "options.subtitle":
        "Menilai kecocokan lowongan LinkedIn dengan CV kamu memakai model keputusan Jev.",
      "options.language.label": "Bahasa antarmuka",
      "options.language.auto": "Ikut bahasa browser",
      "options.connection.title": "1. Koneksi ke model",
      "options.connection.hint":
        "Endpoint harus menyediakan model keputusan Jev pada path /v1/systemone.",
      "options.baseUrl.label": "Base URL",
      "options.apiKey.label": "API key",
      "options.apiKey.placeholder": "Tempel API key kamu di sini",
      "options.apiKey.show": "Lihat",
      "options.apiKey.hide": "Sembunyikan",
      "options.apiKey.hint":
        "Key disimpan di chrome.storage.local di komputer kamu dan hanya dikirim ke base URL di atas.",
      "options.model.label": "Model",
      "options.model.load": "Muat daftar",
      "options.model.loading": "Memuat daftar model… endpoint ini biasanya butuh sampai satu menit.",
      "options.model.loaded": "{count} model dimuat. Ketik di kolom Model untuk memilih.",
      "options.test": "Tes koneksi",
      "options.test.testing": "Menguji…",
      "options.test.ok": "Tersambung. {count} model tersedia dan \"{model}\" ada di daftar.",
      "options.test.missingModel":
        "Tersambung. {count} model tersedia, tapi \"{model}\" tidak ada di daftar.",
      "options.test.failed": "Gagal: {message}",

      "options.cv.title": "2. CV kamu",
      "options.cv.hint": "Teks CV dipakai sebagai konteks penilaian. Format yang didukung: PDF, DOCX, TXT.",
      "options.cv.dropTitle": "Tarik file CV ke sini",
      "options.cv.dropHint": "atau klik untuk memilih file",
      "options.cv.placeholder": "Teks CV akan muncul di sini dan bisa kamu rapikan manual.",
      "options.cv.count": "{count} karakter terbaca.",
      "options.cv.empty": "Belum ada CV. Analisis tidak akan jalan tanpa ini.",
      "options.cv.status": "{name} · {count} karakter · terakhir diubah {when}",
      "options.cv.manual": "CV manual",
      "options.cv.reading": "Membaca {name}…",
      "options.cv.pages": "{count} halaman",

      "options.details.title": "Detail yang dibaca dari CV",
      "options.details.hint":
        "Diisi otomatis dari teks CV di atas dan boleh kamu koreksi. Analisis tetap jalan kalau ada yang kosong — field kosong tidak dikirim ke model.",
      "options.autofill.button": "Isi otomatis dari CV",
      "options.autofill.needCv": "Unggah atau tempel teks CV dulu, minimal 100 karakter.",
      "options.autofill.filled": "{count} field diisi dari CV: {fields}.",
      "options.autofill.none": "Tidak ada field baru yang bisa diisi dari CV ini.",
      "options.autofill.skipped": "{count} field dilewati karena sudah kamu isi.",
      "options.headline.label": "Ringkasan peran",
      "options.headline.placeholder": "Perawat, Akuntan, Developer…",
      "options.experienceYears.label": "Total pengalaman (tahun)",
      "options.location.label": "Lokasi kamu sekarang",
      "options.languages.label": "Bahasa",
      "options.education.label": "Pendidikan tertinggi",
      "options.skills.label": "Skill utama (pisahkan dengan koma)",
      "options.skills.placeholder": "Excel, komunikasi, manajemen proyek…",

      "options.history.title": "3. Riwayat analisis",
      "options.history.empty": "Belum ada analisis.",
      "options.history.clear": "Hapus semua hasil",
      "options.history.cleared": "{count} hasil analisis dihapus dari cache.",
      "options.history.jobFallback": "Lowongan",

      "options.save": "Simpan",
      "options.saved": "Tersimpan.",
      "options.save.baseUrlRequired": "Base URL wajib diisi.",
      "options.save.permissionDenied":
        "Izin akses ke host tersebut ditolak, jadi request akan gagal.",

      "popup.connectionReady": "Koneksi siap ({host})",
      "popup.connectionMissing": "Base URL / API key belum diisi",
      "popup.cvReady": "CV termuat ({name})",
      "popup.cvManual": "teks manual",
      "popup.cvMissing": "CV belum diunggah",
      "popup.modelLabel": "Model:",
      "popup.historyLabel": "Hasil tersimpan:",
      "popup.openJobs": "Buka lowongan LinkedIn",
      "popup.hint":
        "Tombol pertama membuka daftar lowongan yang LinkedIn susun sendiri dari preferensi akunmu. Buka salah satu lowongan, lalu pakai panel di kanan bawah untuk menilai kecocokannya.",
      "popup.openSettings": "Buka Settings",

      "batch.start": "Analisis {count} lowongan di halaman ini",
      "batch.reanalyze": "Analisis ulang yang sudah pernah dinilai (hasil lama ditimpa)",
      "batch.startHint":
        "Extension akan membuka tiap lowongan satu per satu di tab ini, lalu kembali sendiri. Bisa dihentikan kapan saja.",
      "batch.progress": "Menganalisis {done}/{target}…",
      "batch.stop": "Hentikan",
      "batch.stopped": "Batch dihentikan.",
      "batch.done": "Selesai: {done} lowongan baru dianalisis.",
      "batch.skipped": "{count} sudah pernah dianalisis, dilewati.",
      "batch.failed": "{count} lowongan gagal dianalisis.",
      "batch.openDashboard": "Buka dashboard",
      "batch.nothingToDo": "Tidak ada lowongan baru yang bisa dianalisis di halaman ini.",

      "dashboard.title": "Jev Job Match — Dashboard",
      "dashboard.heading": "Dashboard analisis",
      "dashboard.open": "Buka dashboard",
      "dashboard.subtitle": "Semua lowongan yang pernah dinilai, diurutkan dan bisa disaring.",
      "dashboard.empty": "Belum ada hasil analisis.",
      "dashboard.emptyHint":
        "Buka halaman lowongan di LinkedIn, lalu jalankan analisis dari panel di kanan bawah.",
      "dashboard.count": "{count} lowongan",
      "dashboard.search": "Cari posisi atau perusahaan",
      "dashboard.sort": "Urutkan",
      "dashboard.sort.match": "Kecocokan tertinggi",
      "dashboard.sort.recent": "Terbaru",
      "dashboard.sort.company": "Perusahaan (A-Z)",
      "dashboard.filter": "Saring",
      "dashboard.filter.all": "Semua keputusan",
      "dashboard.col.job": "Lowongan",
      "dashboard.col.match": "Cocok",
      "dashboard.col.screening": "Lolos screening",
      "dashboard.col.offer": "Offer",
      "dashboard.col.verdict": "Keputusan",
      "dashboard.col.when": "Dianalisis",
      "dashboard.col.reason": "Penyebab utama ditolak",
      "dashboard.noMatch": "Tidak ada lowongan yang cocok dengan saringan.",
      "dashboard.clear": "Hapus semua hasil",
      "dashboard.cleared": "{count} hasil dihapus.",
      "dashboard.batchTitle": "Batch berjalan",
      "dashboard.batchProgress": "{done} dari {target} selesai",
      "dashboard.batchStop": "Hentikan batch",
      "dashboard.batchIdle": "Tidak ada batch yang berjalan.",
      "dashboard.batchStartHint":
        "Jalankan batch dari panel di halaman pencarian LinkedIn — extension butuh tab itu untuk membaca daftar lowongan."
    },

    en: {
      "common.checking": "Checking…",
      "common.settings": "Settings",
      "common.unknown": "Unclear",

      "panel.hide": "Hide",
      "panel.back": "Back to the start",
      "panel.analyze": "Analyze this job",
      "panel.reanalyze": "Re-analyze",
      "panel.retry": "Try again",
      "panel.openSettings": "Open settings",
      "panel.loading": "Scoring this job… {seconds}s",
      "panel.loadingHint": "Jev evaluates every question in parallel on the server.",
      "panel.idle": "Open a job posting, then run the analysis.",
      "panel.jobFallback": "Job",
      "panel.matchUnit": "match",
      "panel.confidence": "model confidence {percent}%",
      "panel.screeningTitle": "Odds of passing screening",
      "panel.passScreening": "Reaching a skills test",
      "panel.offerChance": "Chance of an offer",
      "panel.mostLikelyStop": "most likely stops at: {stage}",
      "panel.signalsTitle": "Evidence used",
      "panel.seniorityTitle": "Seniority fit",
      "panel.checksTitle": "Job requirements",
      "panel.gapsTitle": "Most likely reason for rejection",
      "panel.cached": "from cache",
      "panel.footer": "{model} · {date}",
      "panel.disclaimer":
        "These numbers are the model's judgement of your CV text, the job description, and the signals read from the page — not real-world probabilities. Treat them as an early signal, not a decision.",

      "error.unexpected": "Something unexpected went wrong.",
      "error.noJobId": "Could not read a job ID from this page.",
      "error.noDescription": "Could not read the job description. Open the job detail and try again.",
      "error.noApiKey": "No API key yet. Open the extension settings.",
      "error.noBaseUrl": "No base URL yet. Open the extension settings.",
      "error.noQuestions": "No questions to send.",
      "error.badResponse": "Jev did not return a readable answer.",
      "error.timeout": "The request to Jev timed out.",
      "error.notConfigured": "Base URL or API key is missing. Open the extension settings first.",
      "error.noCv": "No CV uploaded yet. Open the settings and upload your CV.",
      "error.noJobOnPage": "Could not find job details on this page.",
      "error.descriptionTooShort":
        "The job description could not be read, or is too short. Scroll until the description is fully expanded, then try again.",
      "error.noResponse": "The extension did not respond. Try reloading the page.",
      "error.http": "HTTP {status}",
      "error.fileType": "{extension} is not supported. Use PDF, DOCX or TXT.",
      "error.fileTypeGeneric": "This file type is not supported. Use PDF, DOCX or TXT.",
      "error.mammothMissing": "The DOCX parser did not load. Reload the settings page.",
      "error.pdfScanned":
        "Almost no text was readable. If this PDF is a scan or image, it needs OCR first.",
      "error.emptyFile": "The file was read but contains no text.",
      "error.invalidUrl": "The base URL is not valid.",

      "state.headline": "Summary",
      "state.experienceYears": "Total experience (years)",
      "state.location": "Location",
      "state.languages": "Languages",
      "state.education": "Highest education",
      "state.skills": "Core skills",
      "state.cvContent": "CV text",
      "state.position": "Position",
      "state.company": "Company",
      "state.jobLocation": "Location",
      "state.workMode": "Work type",
      "state.employmentType": "Employment type",
      "state.description": "Description",
      "state.candidateKey": "candidate",
      "state.jobKey": "job",
      "state.signalsKey": "opportunity_signals",

      "question.fitOverall.instructions":
        "Overall, how well does the candidate's profile match what this job is asking for?",
      "question.fitOverall.very_poor": "Meets almost none of the stated requirements",
      "question.fitOverall.poor": "Meets only a small minority of the requirements",
      "question.fitOverall.fair": "Meets about half of the requirements",
      "question.fitOverall.good": "Meets nearly all requirements with only minor gaps",
      "question.fitOverall.excellent": "Meets or exceeds nearly every stated requirement",

      "question.biggestGap.instructions":
        "If this application were rejected, what is the single most likely reason? Pick one dominant factor. If the opportunity signals show the posting is old or already has many applicants, competition can be the reason even when the candidate's qualifications are sufficient.",

      "question.gap.experience_years": "Relevant work experience falls short of what is required",
      "question.gap.tech_stack": "Missing specific skills, tools or certifications the job lists",
      "question.gap.domain_industry": "No experience in the job's industry or product domain",
      "question.gap.seniority": "Seniority level or scope of ownership does not match",
      "question.gap.location": "Location, work authorisation or time zone does not satisfy the requirement",
      "question.gap.language": "The language requirement is not convincingly met",
      "question.gap.education": "Formal education or certification requirement is not met",
      "question.gap.competition": "Qualifications are sufficient, but the applicant pool is too competitive",
      "question.gap.none": "No material gap — the candidate is credible on paper",
      "question.gap.noneThin": "No material gap, but the posting is too thin to judge",

      "question.outcome.instructions":
        "If this candidate applied now, how far along the hiring funnel would they most likely get? If opportunity signals are available — applicant count, posting age, whether a recruiter is actively reviewing, or the candidate's connections at the company — use them to weigh how competitive the pool is.",
      "question.outcome.auto_reject": "Rejected or filtered out before a human reads it",
      "question.outcome.recruiter_screen": "A recruiter would reply and run an initial screen",
      "question.outcome.technical_interview":
        "Would pass screening and reach a skills test or technical interview",
      "question.outcome.final_round": "Would reach a final or management interview",
      "question.outcome.offer": "Would most likely receive an offer",

      "question.worthApplying.instructions":
        "Is it a sensible use of this candidate's time to apply to this job?",
      "question.worthApplying.true": "Worth applying for",
      "question.worthApplying.false":
        "Not worth applying — the odds are too small or the role is irrelevant",

      "question.meetsExperience.instructions":
        "Does the candidate meet the years-of-experience requirement stated in this job?",
      "question.meetsExperience.true":
        "Meets or exceeds the minimum; treat as true when the posting states no number",
      "question.meetsExperience.false": "Below the stated minimum",

      "question.meetsLocation.instructions":
        "Does the candidate satisfy the location, work authorisation or residency requirement in this job?",
      "question.meetsLocation.true": "Satisfied, or the posting requires no particular location",
      "question.meetsLocation.false":
        "Not satisfied — for example the posting requires residency or a work permit the candidate does not have",

      "question.meetsLanguage.instructions":
        "Does the candidate convincingly meet the language requirement in this job?",
      "question.meetsLanguage.true": "Met, or the posting requires no particular language",
      "question.meetsLanguage.false":
        "The candidate's language ability falls short of the requirement",

      "question.hasDomainExperience.instructions":
        "Does the candidate have experience in the industry or product domain this job mentions?",
      "question.hasDomainExperience.true": "Has relevant experience in that domain",
      "question.hasDomainExperience.false": "No experience in that domain",

      "question.hasRequiredTech.instructions":
        "Does the candidate have the core skills, tools and certifications this job lists?",
      "question.hasRequiredTech.true": "Has most of what is listed",
      "question.hasRequiredTech.false": "Does not have the core skills listed",

      "question.seniorityFit.instructions":
        "How well does the candidate's seniority level fit the level this job is hiring for?",
      "question.seniorityFit.0": "Far too junior",
      "question.seniorityFit.1": "Slightly too junior",
      "question.seniorityFit.2": "About right",
      "question.seniorityFit.3": "Slightly too senior",
      "question.seniorityFit.4": "Far too senior",

      "signal.applicants": "Applicants",
      "signal.applicantsValue": "{count} people have clicked apply",
      "signal.earlyApplicant": "none yet — you can be an early applicant",
      "signal.posted": "Posted",
      "signal.postedDays": "(about {days} days ago)",
      "signal.connections": "Connections at the company",
      "signal.connectionsValue": "{count} people",
      "signal.reviewer": "Recruiter",
      "signal.reviewerValue": "actively reviewing applicants",
      "signal.promoted": "Posting",
      "signal.promotedValue": "promoted (paid) by the company",
      "signal.easyApply": "Application route",
      "signal.easyApplyValue": "Easy Apply",

      "fit.very_poor": "Poor match",
      "fit.poor": "Weak match",
      "fit.fair": "Fair match",
      "fit.good": "Good match",
      "fit.excellent": "Strong match",

      "funnel.auto_reject": "Filtered out",
      "funnel.recruiter_screen": "Recruiter screen",
      "funnel.technical_interview": "Skills test",
      "funnel.final_round": "Final interview",
      "funnel.offer": "Offer",

      "check.meets_experience": "Years of experience",
      "check.meets_location": "Location & work authorisation",
      "check.meets_language": "Language requirement",
      "check.has_domain_experience": "Same-domain experience",
      "check.has_required_tech": "Required skills & tools",

      "verdict.priority": "Prioritise",
      "verdict.apply": "Worth applying",
      "verdict.maybe": "Moderate odds, worth a try",
      "verdict.skip": "Better to skip",

      "options.title": "Jev Job Match — Settings",
      "options.subtitle":
        "Scores how well a LinkedIn job matches your CV, using the Jev decision model.",
      "options.language.label": "Interface language",
      "options.language.auto": "Follow browser language",
      "options.connection.title": "1. Model connection",
      "options.connection.hint":
        "The endpoint must serve the Jev decision model at /v1/systemone.",
      "options.baseUrl.label": "Base URL",
      "options.apiKey.label": "API key",
      "options.apiKey.placeholder": "Paste your API key here",
      "options.apiKey.show": "Show",
      "options.apiKey.hide": "Hide",
      "options.apiKey.hint":
        "The key is stored in chrome.storage.local on your machine and only sent to the base URL above.",
      "options.model.label": "Model",
      "options.model.load": "Load list",
      "options.model.loading": "Loading models… this endpoint usually takes up to a minute.",
      "options.model.loaded": "{count} models loaded. Start typing in the Model field to pick one.",
      "options.test": "Test connection",
      "options.test.testing": "Testing…",
      "options.test.ok": "Connected. {count} models available and \"{model}\" is one of them.",
      "options.test.missingModel":
        "Connected. {count} models available, but \"{model}\" is not among them.",
      "options.test.failed": "Failed: {message}",

      "options.cv.title": "2. Your CV",
      "options.cv.hint": "The CV text is used as scoring context. Supported formats: PDF, DOCX, TXT.",
      "options.cv.dropTitle": "Drop your CV here",
      "options.cv.dropHint": "or click to choose a file",
      "options.cv.placeholder": "CV text appears here and you can tidy it up manually.",
      "options.cv.count": "{count} characters read.",
      "options.cv.empty": "No CV yet. Nothing can be scored without it.",
      "options.cv.status": "{name} · {count} characters · last changed {when}",
      "options.cv.manual": "Manual CV",
      "options.cv.reading": "Reading {name}…",
      "options.cv.pages": "{count} pages",

      "options.details.title": "Details read from your CV",
      "options.details.hint":
        "Filled automatically from the CV text above, and safe to correct. The analysis still runs when something is blank — empty fields are not sent to the model.",
      "options.autofill.button": "Fill from CV",
      "options.autofill.needCv": "Upload or paste CV text first — at least 100 characters.",
      "options.autofill.filled": "{count} fields filled from your CV: {fields}.",
      "options.autofill.none": "Nothing new could be filled from this CV.",
      "options.autofill.skipped": "{count} fields skipped because you already filled them.",
      "options.headline.label": "Role summary",
      "options.headline.placeholder": "Nurse, Accountant, Developer…",
      "options.experienceYears.label": "Total experience (years)",
      "options.location.label": "Where you are based",
      "options.languages.label": "Languages",
      "options.education.label": "Highest education",
      "options.skills.label": "Core skills (comma separated)",
      "options.skills.placeholder": "Excel, communication, project management…",

      "options.history.title": "3. Analysis history",
      "options.history.empty": "No analyses yet.",
      "options.history.clear": "Delete all results",
      "options.history.cleared": "{count} cached analyses deleted.",
      "options.history.jobFallback": "Job",

      "options.save": "Save",
      "options.saved": "Saved.",
      "options.save.baseUrlRequired": "Base URL is required.",
      "options.save.permissionDenied": "Access to that host was denied, so requests will fail.",

      "popup.connectionReady": "Connection ready ({host})",
      "popup.connectionMissing": "Base URL / API key missing",
      "popup.cvReady": "CV loaded ({name})",
      "popup.cvManual": "manual text",
      "popup.cvMissing": "No CV uploaded",
      "popup.modelLabel": "Model:",
      "popup.historyLabel": "Saved results:",
      "popup.openJobs": "Open LinkedIn jobs",
      "popup.hint":
        "The first button opens the job list LinkedIn builds from your own account preferences. Open a posting, then use the panel in the bottom right to score the match.",
      "popup.openSettings": "Open settings",

      "batch.start": "Analyze {count} jobs on this page",
      "batch.reanalyze": "Re-analyze jobs already scored (overwrites the old result)",
      "batch.startHint":
        "The extension opens each job in turn in this tab and returns on its own. You can stop it at any time.",
      "batch.progress": "Analyzing {done}/{target}…",
      "batch.stop": "Stop",
      "batch.stopped": "Batch stopped.",
      "batch.done": "Done: {done} new jobs analyzed.",
      "batch.skipped": "{count} were already analyzed and skipped.",
      "batch.failed": "{count} jobs could not be analyzed.",
      "batch.openDashboard": "Open dashboard",
      "batch.nothingToDo": "No new jobs to analyze on this page.",

      "dashboard.title": "Jev Job Match — Dashboard",
      "dashboard.heading": "Analysis dashboard",
      "dashboard.open": "Open dashboard",
      "dashboard.subtitle": "Every job scored so far, sortable and filterable.",
      "dashboard.empty": "No analyses yet.",
      "dashboard.emptyHint":
        "Open a job posting on LinkedIn, then run the analysis from the panel in the bottom right.",
      "dashboard.count": "{count} jobs",
      "dashboard.search": "Search title or company",
      "dashboard.sort": "Sort",
      "dashboard.sort.match": "Highest match",
      "dashboard.sort.recent": "Most recent",
      "dashboard.sort.company": "Company (A-Z)",
      "dashboard.filter": "Filter",
      "dashboard.filter.all": "All verdicts",
      "dashboard.col.job": "Job",
      "dashboard.col.match": "Match",
      "dashboard.col.screening": "Pass screening",
      "dashboard.col.offer": "Offer",
      "dashboard.col.verdict": "Verdict",
      "dashboard.col.when": "Analyzed",
      "dashboard.col.reason": "Main reason for rejection",
      "dashboard.noMatch": "No jobs match the current filters.",
      "dashboard.clear": "Delete all results",
      "dashboard.cleared": "{count} results deleted.",
      "dashboard.batchTitle": "Batch running",
      "dashboard.batchProgress": "{done} of {target} done",
      "dashboard.batchStop": "Stop batch",
      "dashboard.batchIdle": "No batch is running.",
      "dashboard.batchStartHint":
        "Start a batch from the panel on a LinkedIn search page — the extension needs that tab to read the job list."
    },
  };

  let current = FALLBACK_LOCALE;

  function normalize(locale) {
    const value = String(locale ?? "").toLowerCase();
    if (value.startsWith("id") || value.startsWith("in")) return "id";
    if (value.startsWith("en")) return "en";
    return FALLBACK_LOCALE;
  }

  /**
   * Bahasa awal mengikuti bahasa antarmuka browser ("default ikut browser").
   * Yang tersimpan di settings akan menimpanya.
   */
  function detectLocale() {
    const raw = globalThis.chrome?.i18n?.getUILanguage?.() ?? globalThis.navigator?.language ?? "";
    return normalize(raw);
  }

  function setLocale(locale) {
    current = normalize(locale);
    return current;
  }

  function getLocale() {
    return current;
  }

  function has(key, locale = current) {
    return Object.prototype.hasOwnProperty.call(MESSAGES[locale] ?? {}, key);
  }

  function t(key, params) {
    const template = MESSAGES[current]?.[key] ?? MESSAGES[FALLBACK_LOCALE]?.[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  }

  const TEXT_ATTRS = ["data-i18n", "data-i18n-placeholder", "data-i18n-title"];

  /** Terapkan kamus ke seluruh elemen ber-atribut data-i18n di dalam `root`. */
  function apply(root = document) {
    for (const attr of TEXT_ATTRS) {
      for (const node of root.querySelectorAll(`[${attr}]`)) {
        const value = t(node.getAttribute(attr));
        if (attr === "data-i18n") node.textContent = value;
        else if (attr === "data-i18n-placeholder") node.placeholder = value;
        else node.title = value;
      }
    }
    if (root.documentElement) root.documentElement.lang = current;
  }

  function dateLocale() {
    return current === "id" ? "id-ID" : "en-GB";
  }

  globalThis.JevMessages = {
    LOCALES,
    detectLocale,
    setLocale,
    getLocale,
    has,
    t,
    apply,
    dateLocale,
    MESSAGES,
  };
})();
