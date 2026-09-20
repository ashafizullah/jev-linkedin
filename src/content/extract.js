/**
 * Semua pembacaan DOM LinkedIn ada di sini, terpisah dari UI, supaya bisa diuji
 * langsung terhadap halaman asli. Content script berjalan di isolated world,
 * jadi fungsi-fungsi ini digantung di satu global yang dipakai linkedin.js.
 */
(() => {
  const DESCRIPTION_SELECTORS = [
    "#job-details",
    ".jobs-description__content",
    ".jobs-box__html-content",
    '[class*="jobs-description-content"]',
    '[class*="jobs-description"]',
  ];

  const DESCRIPTION_START = [
    /^About the job\b.*$/im,
    /^Tentang pekerjaan\b.*$/im,
    /^Deskripsi pekerjaan\b.*$/im,
    /^About this job\b.*$/im,
    /^Job description\b.*$/im,
  ];

  const DESCRIPTION_END = [
    /^Unlock hiring insights/im,
    /^About the company\b/im,
    /^Tentang perusahaan\b/im,
    /^Interested in working with us/im,
    /^Berminat bekerja sama/im,
    /^Similar jobs\b/im,
    /^Lowongan serupa/im,
    /^…\s*more$/im,
  ];

  const NOISE_LINE =
    /^(Lamar|Simpan|Lamaran|Apply|Save|Dipromosikan.*|Promoted.*|Lihat perbandingan.*|Akses wawasan.*|Mulai ulang Premium.*|Restart Premium.*|Unlock hiring.*|Follow|Ikuti|Show more|Tampilkan lebih|…\s*more|Lainnya|Tentang|Aksesibilitas|Pusat Bantuan|Privasi.*|Pilihan Iklan|Iklan|Layanan Bisnis|Dapatkan aplikasi|LinkedIn Corporation.*|Melamar Mudah|Easy Apply|Dilihat|Viewed)$/i;

  const WORK_MODE = /^(Jarak Jauh|Di Kantor|Gabungan|Remote|On-?site|Hybrid|Kombinasi)$/i;
  const EMPLOYMENT =
    /^(Penuh waktu|Paruh waktu|Kontrak|Magang|Sukarela|Full-?time|Part-?time|Contract|Internship|Volunteer)$/i;
  const APPLY_BUTTON = /^(Lamar|Lamar sekarang|Apply|Apply now|Easy Apply|Melamar Mudah)$/i;
  const CTA_LABEL =
    /^(Lamar.*|Apply.*|Melamar Mudah|Simpan|Save|I.?m interested|Ikuti|Follow|Lainnya|Show more|Tampilkan lebih|Dilihat|Viewed)$/i;

  // Widget "4 dari 10 keahlian cocok" juga berupa link, dan tanpa ini ia menang
  // sebagai judul lowongan saat header aslinya belum ter-render.
  const WIDGET_LABEL = /keahlian cocok|skills? match/i;

  function looksLikeTitle(text) {
    if (!text) return false;
    if (WIDGET_LABEL.test(text)) return false;
    return ![WORK_MODE, EMPLOYMENT, CTA_LABEL].some((pattern) => pattern.test(text));
  }

  const MIN_DESCRIPTION = 120;
  const MIN_CONTAINER_TEXT = 1200;
  const MAX_ANCESTOR_STEPS = 16;

  function currentJobId() {
    const fromQuery = location.search.match(/currentJobId=(\d+)/);
    if (fromQuery) return fromQuery[1];
    const fromPath = location.pathname.match(/\/jobs\/view\/(\d+)/);
    return fromPath ? fromPath[1] : null;
  }

  function lines(text) {
    return (text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function firstLine(text) {
    return lines(text)[0] ?? null;
  }

  function topCardFor(jobId) {
    const links = Array.from(document.querySelectorAll(`a[href*="/jobs/view/${jobId}"]`));
    if (!links.length) return { card: null, links: [] };

    let card = links[0];
    for (let depth = 0; depth < 8 && card; depth += 1) {
      card = card.parentElement;
      if (card?.querySelector('a[href*="/company/"]') || lines(card?.innerText).length > 3) break;
    }
    return { card, links };
  }

  /**
   * LinkedIn memakai class ter-obfuscate, jadi urutan pendekatannya:
   * selector yang masih stabil -> cari ancestor tombol Lamar yang sudah memuat
   * cukup banyak teks (deskripsi berada belasan level di atas tombol) -> <main>.
   */
  function findDescriptionNode() {
    for (const selector of DESCRIPTION_SELECTORS) {
      const node = document.querySelector(selector);
      if (node && node.innerText.trim().length > MIN_DESCRIPTION) {
        return { node, source: "selector" };
      }
    }

    // Tombol Lamar hanya ada di halaman detail lowongan, jadi keberadaannya
    // sekaligus jadi bukti bahwa teks yang kita ambil memang deskripsi lowongan.
    const applyButton = Array.from(document.querySelectorAll("button, a")).find((node) =>
      APPLY_BUTTON.test(node.innerText.trim()),
    );
    if (applyButton) {
      let node = applyButton;
      for (let depth = 0; depth < MAX_ANCESTOR_STEPS && node?.parentElement; depth += 1) {
        node = node.parentElement;
        if ((node.innerText ?? "").length > MIN_CONTAINER_TEXT) {
          return { node, source: "apply-button" };
        }
      }
    }

    return { node: document.querySelector("main") ?? document.body, source: "fallback" };
  }

  function cleanDescription(raw) {
    let text = raw.replace(/\r/g, "");
    for (const marker of DESCRIPTION_START) {
      const match = text.match(marker);
      if (match) {
        text = text.slice(match.index + match[0].length);
        break;
      }
    }
    let end = text.length;
    for (const marker of DESCRIPTION_END) {
      const match = text.match(marker);
      if (match && match.index < end) end = match.index;
    }
    text = text.slice(0, end);

    return lines(text)
      .filter((line) => !NOISE_LINE.test(line))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractJob() {
    const jobId = currentJobId();
    if (!jobId) return null;

    const { card, links } = topCardFor(jobId);
    const segments = lines(card?.innerText);
    const metaIndex = segments.findIndex((line) => line.includes("·"));

    // Di layout hasil pencarian judul lowongan adalah link; di layout halaman
    // detail judulnya teks biasa tepat di atas baris metadata.
    const linkedTitle = links
      .map((link) => firstLine(link.innerText))
      .find((text) => looksLikeTitle(text));

    const cardTitle = metaIndex > 0 ? segments[metaIndex - 1] : null;

    // document.title hanya dipakai sebagai jaring terakhir: isinya masih membawa
    // embel-embel "| Perusahaan | LinkedIn" yang tidak kita inginkan.
    const documentTitle = firstLine(document.title) ?? null;
    const cleanedDocumentTitle = documentTitle
      ? documentTitle.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() || documentTitle
      : null;

    const titleSource = linkedTitle ? "link" : cardTitle ? "card" : documentTitle ? "document" : null;

    const { node, source } = findDescriptionNode();
    const rawDescription = node?.innerText ?? "";
    const description = source === "fallback" ? "" : cleanDescription(rawDescription);

    // Sinyal peluang ada di header lowongan. Kalau header tidak terbaca, teks
    // mentah container deskripsi masih memuatnya karena header ada di dalamnya.
    const signals = globalThis.JevSignals.parseSignals(card?.innerText || rawDescription);

    return {
      jobId,
      title: linkedTitle ?? cardTitle ?? cleanedDocumentTitle,
      titleSource,
      company:
        firstLine(card?.querySelector('a[href*="/company/"]')?.innerText) ??
        (metaIndex > 1 ? segments[metaIndex - 2] : null) ??
        null,
      location: metaIndex >= 0 ? segments[metaIndex].split("·")[0].trim() : null,
      workMode: segments.find((line) => WORK_MODE.test(line)) ?? null,
      employmentType: segments.find((line) => EMPLOYMENT.test(line)) ?? null,
      description,
      signals,
      url: `https://www.linkedin.com/jobs/view/${jobId}/`,
    };
  }

  // ------------------------------------------------------------------ daftar

  const JOB_CARD_KEY = /^job-card-component-ref-(\d+)$/;

  /**
   * Kartu lowongan di halaman pencarian tidak memakai <a> dan tidak punya atribut
   * job-id, dan klik sintetis ke kartunya tidak diterima LinkedIn. Satu-satunya
   * penanda yang stabil adalah `componentkey="job-card-component-ref-<id>"`.
   * Karena kita hanya membaca dan tidak mengklik, tombol "Abaikan lowongan" di
   * dalam kartu tidak pernah tersentuh.
   */
  function jobIdFromCardKey(value) {
    const match = JOB_CARD_KEY.exec(value ?? "");
    return match ? match[1] : null;
  }

  /** ID lowongan di halaman ini, urut sesuai tampilan. */
  function harvestJobIds(root = document) {
    const ids = [];
    for (const node of root.querySelectorAll('[componentkey^="job-card-component-ref-"]')) {
      const id = jobIdFromCardKey(node.getAttribute("componentkey"));
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  function isSearchPage() {
    return /\/jobs\/search-results/.test(location.pathname);
  }

  /** URL pencarian tanpa currentJobId dan tanpa start, untuk dipaginasi. */
  function searchUrl() {
    if (!isSearchPage()) return null;
    const url = new URL(location.href);
    url.searchParams.delete("currentJobId");
    url.searchParams.delete("start");
    return url.toString();
  }

  function searchStart() {
    const value = new URL(location.href).searchParams.get("start");
    const parsed = Number.parseInt(value ?? "0", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  globalThis.JevExtract = {
    currentJobId,
    findDescriptionNode,
    cleanDescription,
    extractJob,
    harvestJobIds,
    jobIdFromCardKey,
    looksLikeTitle,
    isSearchPage,
    searchUrl,
    searchStart,
    MIN_DESCRIPTION,
  };
})();
