/**
 * Sinyal peluang yang sudah tersedia di halaman lowongan LinkedIn: seberapa
 * banyak pelamar, seberapa baru postingannya, dan apakah kamu punya koneksi di
 * perusahaan itu. Sinyal-sinyal ini jauh lebih menentukan peluang lolos daripada
 * perbedaan "cocok" vs "sangat cocok", jadi ikut dikirim ke Jev sebagai konteks.
 *
 * Pelabelan LinkedIn mengikuti bahasa antarmuka situsnya, jadi setiap pola
 * disediakan dalam versi Indonesia dan Inggris. Teks yang kita hasilkan sendiri
 * mengikuti bahasa extension (JevMessages), bukan bahasa halaman.
 */
(() => {
  const APPLICANTS = [
    /(\d[\d.,]*)\s*(?:orang\s*)?(?:mengklik\s*Lamar|melamar|pelamar)\b/i,
    /(\d[\d.,]*)\s*(?:people\s*)?(?:clicked\s*apply|applicants?)\b/i,
  ];

  const EARLY_APPLICANT = /Jadilah pelamar awal|Be an early applicant/i;

  const JUST_POSTED = /Baru saja (?:di)?posting|Just posted/i;

  // Bentuk berlabel ("Diposting1 hari yang lalu" — tanpa spasi) hanya muncul di
  // kartu daftar. Bentuk telanjang ("1 hari yang lalu") ada di header detail, dan
  // dibatasi ke baris metadata (yang memuat pemisah "·") supaya kalimat deskripsi
  // seperti "we launched 3 years ago" tidak salah dibaca sebagai umur postingan.
  const POSTED_LABELLED = [
    /(?:Di)?posting\s*(\d[\d.,]*)\s*(menit|jam|hari|minggu|bulan|tahun)/i,
    /(?:Re)?posted\s*(\d[\d.,]*)\s*(minute|hour|day|week|month|year)/i,
  ];

  const POSTED_BARE = [
    /(\d[\d.,]*)\s*(menit|jam|hari|minggu|bulan|tahun)\s+yang lalu/i,
    /(\d[\d.,]*)\s*(minute|hour|day|week|month|year)s?\s+ago/i,
  ];

  const CONNECTIONS = [
    /(\d[\d.,]*)\s*(?:koneksi|alumni)[^\n]{0,40}?bekerja di sini/i,
    /(\d[\d.,]*)\s*(?:connection|alumni)[^\n]{0,40}?wor(?:ks|k) here/i,
  ];

  const ACTIVELY_REVIEWING = /Meninjau pelamar secara aktif|Actively reviewing applicants/i;
  const EASY_APPLY = /Melamar Mudah|Easy Apply/i;
  const PROMOTED = /Dipromosikan|Promoted/i;

  const DAYS_PER_UNIT = {
    menit: 1 / 1440,
    minute: 1 / 1440,
    jam: 1 / 24,
    hour: 1 / 24,
    hari: 1,
    day: 1,
    minggu: 7,
    week: 7,
    bulan: 30,
    month: 30,
    tahun: 365,
    year: 365,
  };

  function toCount(raw) {
    const digits = String(raw).replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }

  function firstMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match;
    }
    return null;
  }

  function parsePostedAge(text) {
    const justNow = text.match(JUST_POSTED);
    if (justNow) return { label: justNow[0].trim(), days: 0 };

    const metaLines = text
      .split("\n")
      .filter((line) => line.includes("·"))
      .join("\n");

    const attempts = [
      ...POSTED_LABELLED.map((pattern) => ({ pattern, scope: text })),
      ...POSTED_BARE.map((pattern) => ({ pattern, scope: metaLines })),
    ];

    for (const { pattern, scope } of attempts) {
      const match = scope.match(pattern);
      if (!match) continue;
      const amount = toCount(match[1]);
      const perUnit = DAYS_PER_UNIT[match[2].toLowerCase()];
      if (amount === null || perUnit === undefined) continue;
      return { label: match[0].trim(), days: Math.round(amount * perUnit * 10) / 10 };
    }
    return { label: null, days: null };
  }

  function parseSignals(text) {
    const source = (text ?? "").replace(/\r/g, "");
    const applicants = firstMatch(source, APPLICANTS);
    const connections = firstMatch(source, CONNECTIONS);
    const posted = parsePostedAge(source);

    return {
      applicants: applicants ? toCount(applicants[1]) : null,
      earlyApplicant: EARLY_APPLICANT.test(source),
      postedLabel: posted.label,
      postedDaysAgo: posted.days,
      connections: connections ? toCount(connections[1]) : null,
      activelyReviewing: ACTIVELY_REVIEWING.test(source),
      easyApply: EASY_APPLY.test(source),
      promoted: PROMOTED.test(source),
    };
  }

  /**
   * Baris label/nilai untuk ditampilkan di panel. Dipanggil saat render, bukan
   * saat analisis, supaya hasil yang sudah di-cache ikut berganti bahasa.
   */
  function signalRows(signals) {
    const translate = globalThis.JevMessages?.t;
    if (!signals || !translate) return [];
    const rows = [];

    if (signals.earlyApplicant) {
      rows.push({ label: translate("signal.applicants"), value: translate("signal.earlyApplicant") });
    } else if (signals.applicants !== null) {
      rows.push({
        label: translate("signal.applicants"),
        value: translate("signal.applicantsValue", { count: signals.applicants }),
      });
    }

    if (signals.postedLabel) {
      // Konversi ke hari hanya berguna kalau label halaman memakai satuan lain
      // ("2 minggu yang lalu" -> 14 hari). Untuk "1 hari yang lalu" itu mubazir.
      const alreadyInDays = /hari|day/i.test(signals.postedLabel);
      const suffix =
        signals.postedDaysAgo !== null && !alreadyInDays
          ? ` ${translate("signal.postedDays", { days: signals.postedDaysAgo })}`
          : "";
      rows.push({ label: translate("signal.posted"), value: signals.postedLabel + suffix });
    }

    if (signals.connections !== null) {
      rows.push({
        label: translate("signal.connections"),
        value: translate("signal.connectionsValue", { count: signals.connections }),
      });
    }

    if (signals.activelyReviewing) {
      rows.push({ label: translate("signal.reviewer"), value: translate("signal.reviewerValue") });
    }

    if (signals.promoted) {
      rows.push({ label: translate("signal.promoted"), value: translate("signal.promotedValue") });
    }

    if (signals.easyApply) {
      rows.push({ label: translate("signal.easyApply"), value: translate("signal.easyApplyValue") });
    }

    return rows;
  }

  /** Versi prosa dari sinyal yang sama, untuk dikirim sebagai bagian dari state. */
  function signalLines(signals) {
    return signalRows(signals).map((row) => `${row.label}: ${row.value}`);
  }

  globalThis.JevSignals = { parseSignals, signalRows, signalLines };
})();
