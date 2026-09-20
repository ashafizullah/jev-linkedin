(() => {
  const extract = globalThis.JevExtract;
  const messages = globalThis.JevMessages;
  const signals = globalThis.JevSignals;
  if (!extract || !messages || !signals) return;

  const tr = messages.t;
  const PANEL_ID = "jev-job-match-panel";
  const NAV_POLL_MS = 800;
  const HEARTBEAT_MS = 10_000;

  const cachedReports = new Map();
  let state = { jobId: null, job: null, view: "loading", report: null, error: null, stale: false };
  let loadingTicker = null;
  let heartbeat = null;

  // ------------------------------------------------------------------- locale

  function applyLocaleSetting(setting) {
    messages.setLocale(!setting || setting === "auto" ? messages.detectLocale() : setting);
  }

  async function loadLocale() {
    try {
      const stored = await chrome.storage.local.get("settings");
      applyLocaleSetting(stored?.settings?.locale);
    } catch {
      applyLocaleSetting("auto");
    }
  }

  // ----------------------------------------------------------------- messaging

  function send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error(tr("error.noResponse")));
          return;
        }
        if (!response.ok) {
          reject(Object.assign(new Error(response.error.message), response.error));
          return;
        }
        resolve(response);
      });
    });
  }

  // ------------------------------------------------------------ analisis massal

  const BATCH_TARGETS = [5, 10, 25, 50];
  const BATCH_DEFAULT_TARGET = 10;
  const BATCH_GAP_MIN_MS = 1500;
  const BATCH_GAP_JITTER_MS = 1500;

  let batch = null;
  let batchNotice = null;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function refreshBatch() {
    try {
      batch = (await send("batchStatus")).batch;
    } catch {
      batch = null;
    }
    return batch;
  }

  /** Ikuti rencana dari service worker: ke lowongan berikutnya, panen, atau selesai. */
  async function followPlan(plan) {
    if (!plan || plan.kind === "done") {
      batchNotice = plan?.reason ?? "done";
      await refreshBatch();
      paint();
      return;
    }
    // Jeda acak supaya tidak menekan LinkedIn berturut-turut tanpa ampun.
    await delay(BATCH_GAP_MIN_MS + Math.random() * BATCH_GAP_JITTER_MS);
    location.href = plan.url;
  }

  async function stopBatch() {
    try {
      const response = await send("batchStop");
      batch = response.batch;
      batchNotice = "stopped";
    } catch {
      batchNotice = "stopped";
    }
    paint();
  }

  async function startBatch(target, reanalyze) {
    const jobIds = extract.harvestJobIds();
    if (!jobIds.length) {
      batchNotice = "empty";
      paint();
      return;
    }

    batchNotice = null;
    state = { ...state, view: "loading", error: null };
    paint();

    try {
      const response = await send("batchStart", {
        jobIds,
        target,
        searchUrl: extract.searchUrl(),
        start: extract.searchStart(),
        reanalyze: Boolean(reanalyze),
      });
      batch = response.batch;
      paint();
      await followPlan(response.plan);
    } catch (error) {
      state = { ...state, view: "error", error };
      paint();
    }
  }

  /**
   * Dipanggil saat halaman selesai dimuat. Mengembalikan true kalau halaman ini
   * bagian dari batch yang sedang berjalan, supaya pemanggil tidak menggambar
   * panel biasa.
   */
  async function runBatchStep() {
    if (!batch?.active) return false;

    const jobId = extract.currentJobId();

    if (extract.isSearchPage()) {
      const jobIds = extract.harvestJobIds();
      if (!jobIds.length) return false;
      state = { ...state, view: "loading", error: null };
      paint();
      const response = await send("batchHarvest", { jobIds });
      batch = response.batch;
      paint();
      await followPlan(response.plan);
      return true;
    }

    if (!jobId || batch.currentJobId !== jobId) return false;

    state = { ...state, view: "loading", jobId, job: null, error: null };
    paint();
    startKeepAlive();

    let status = "failed";
    try {
      const job = await waitForJob();
      if (!job?.description || job.description.length < extract.MIN_DESCRIPTION) {
        throw new Error(tr("error.descriptionTooShort"));
      }
      state = { ...state, job };
      paint();
      // force=true saat user memilih untuk menghitung ulang; kalau tidak, lowongan
      // yang sudah ada di cache dilewati dan tidak dihitung ke target.
      const response = await send("analyze", { job, force: Boolean(batch.reanalyze) });
      cachedReports.set(jobId, response.report);
      status = response.cached ? "skipped" : "analyzed";
    } catch {
      status = "failed";
    } finally {
      stopKeepAlive();
    }

    const response = await send("batchNext", { jobId, status });
    batch = response.batch;
    paint();
    await followPlan(response.plan);
    return true;
  }

  // ------------------------------------------------------------------------ ui

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function percentBar(value, tone) {
    return h(
      "div",
      { class: "jev-bar" },
      h("div", { class: `jev-bar-fill jev-tone-${tone}`, style: `width:${Math.min(100, value)}%` }),
    );
  }

  function statRow(label, value) {
    return h(
      "div",
      { class: "jev-stat" },
      h("div", { class: "jev-stat-head" }, h("span", { text: label }), h("b", { text: value })),
    );
  }

  function section(title, body) {
    return h("section", { class: "jev-section" }, h("h4", { text: title }), body);
  }

  /**
   * Laporan menyimpan kunci, bukan label, jadi seluruh teks di sini dibuat saat
   * render. Hasil yang sudah di-cache pun ikut berganti bahasa.
   */
  function reportNodes(report, { stale }) {
    const nodes = [];

    nodes.push(
      h("div", {
        class: `jev-verdict jev-verdict-${report.verdict.level}`,
        text: tr(`verdict.${report.verdict.level}`),
      }),
    );

    nodes.push(
      h(
        "div",
        { class: "jev-match" },
        h(
          "div",
          { class: "jev-ring", style: `--jev-value:${report.match.percent * 3.6}deg` },
          h(
            "div",
            { class: "jev-ring-inner" },
            h("b", { text: `${report.match.percent}%` }),
            h("span", { text: tr("panel.matchUnit") }),
          ),
        ),
        h(
          "div",
          { class: "jev-match-meta" },
          h("div", {
            class: "jev-match-label",
            text: report.match.level ? tr(`fit.${report.match.level}`) : tr("common.unknown"),
          }),
          h("div", {
            class: "jev-muted",
            text: tr("panel.confidence", { percent: report.match.confidence }),
          }),
        ),
      ),
    );

    nodes.push(
      section(
        tr("panel.screeningTitle"),
        h(
          "div",
          { class: "jev-stack" },
          statRow(tr("panel.passScreening"), `${report.opening.passScreening}%`),
          percentBar(report.opening.passScreening, "gauge"),
          statRow(tr("panel.offerChance"), `${report.opening.offer}%`),
          percentBar(report.opening.offer, "accent"),
          h("div", {
            class: "jev-muted",
            text: tr("panel.mostLikelyStop", {
              stage: report.opening.level ? tr(`funnel.${report.opening.level}`) : tr("common.unknown"),
            }),
          }),
        ),
      ),
    );

    const rows = signals.signalRows(report.signals);
    if (rows.length) {
      nodes.push(
        section(
          tr("panel.signalsTitle"),
          h(
            "ul",
            { class: "jev-signals" },
            rows.map((row) =>
              h(
                "li",
                {},
                h("span", { class: "jev-signal-label", text: row.label }),
                h("span", { class: "jev-signal-value", text: row.value }),
              ),
            ),
          ),
        ),
      );
    }

    if (report.seniority.score !== null) {
      nodes.push(
        section(
          tr("panel.seniorityTitle"),
          h("div", { text: tr(`question.seniorityFit.${report.seniority.score}`) }),
        ),
      );
    }

    if (report.checks.length) {
      nodes.push(
        section(
          tr("panel.checksTitle"),
          h(
            "ul",
            { class: "jev-checks" },
            report.checks.map((check) =>
              h(
                "li",
                { class: check.ok ? "jev-ok" : "jev-bad" },
                h("span", { class: "jev-dot" }),
                h("span", { class: "jev-check-label", text: tr(`check.${check.key}`) }),
                h("b", { text: `${check.probability}%` }),
              ),
            ),
          ),
        ),
      );
    }

    if (report.gaps.length) {
      nodes.push(
        section(
          tr("panel.gapsTitle"),
          h(
            "ul",
            { class: "jev-gaps" },
            report.gaps.map((gap) =>
              h(
                "li",
                {},
                h("span", { text: tr(`question.gap.${gap.key}`) }),
                h("b", { text: `${gap.probability}%` }),
              ),
            ),
          ),
        ),
      );
    }

    const when = new Date(report.analyzedAt).toLocaleString(messages.dateLocale());
    nodes.push(
      h(
        "footer",
        { class: "jev-footer" },
        h("button", { class: "jev-btn", text: tr("panel.reanalyze"), onclick: () => analyze(true) }),
        h("div", {
          class: "jev-muted",
          text:
            tr("panel.footer", { model: report.model, date: when }) +
            (stale ? ` · ${tr("panel.cached")}` : ""),
        }),
      ),
    );

    nodes.push(h("p", { class: "jev-disclaimer", text: tr("panel.disclaimer") }));

    return nodes;
  }

  function openDashboard() {
    send("openDashboard").catch(() => {});
  }

  /** Kembali ke tampilan awal panel: laporan dibuang, pemberitahuan batch ditutup. */
  function goIdle() {
    batchNotice = null;
    state = { ...state, view: "idle", report: null, error: null, stale: false };
    paint();
  }

  function backRow() {
    return h(
      "div",
      { class: "jev-topbar" },
      h("button", { class: "jev-link", text: `‹ ${tr("panel.back")}`, onclick: goIdle }),
    );
  }

  function batchRunningNodes() {
    const nodes = [
      h("div", {
        class: "jev-muted",
        text: tr("batch.progress", { done: batch.analyzed, target: batch.target }),
      }),
      percentBar((batch.analyzed / Math.max(1, batch.target)) * 100, "gauge"),
    ];
    if (batch.skipped) {
      nodes.push(h("div", { class: "jev-muted", text: tr("batch.skipped", { count: batch.skipped }) }));
    }
    if (batch.failed) {
      nodes.push(h("div", { class: "jev-muted", text: tr("batch.failed", { count: batch.failed }) }));
    }
    nodes.push(
      h(
        "div",
        { class: "jev-actions" },
        h("button", { class: "jev-btn jev-btn-ghost", text: tr("batch.stop"), onclick: () => stopBatch() }),
        h("button", { class: "jev-btn jev-btn-ghost", text: tr("batch.openDashboard"), onclick: openDashboard }),
      ),
    );
    return nodes;
  }

  function batchNoticeNodes() {
    const parts = [];
    if (batchNotice === "stopped") parts.push(tr("batch.stopped"));
    else if (batchNotice === "empty") parts.push(tr("batch.nothingToDo"));
    else parts.push(tr("batch.done", { done: batch?.analyzed ?? 0 }));

    if (batch?.skipped) parts.push(tr("batch.skipped", { count: batch.skipped }));
    if (batch?.failed) parts.push(tr("batch.failed", { count: batch.failed }));

    return [
      backRow(),
      h("p", { class: "jev-muted", text: parts.join(" ") }),
      h(
        "div",
        { class: "jev-actions" },
        h("button", { class: "jev-btn", text: tr("batch.openDashboard"), onclick: openDashboard }),
      ),
    ];
  }

  function batchStartNodes() {
    const targets = [5, 10, 25, 50];
    const select = h(
      "select",
      { class: "jev-select" },
      targets.map((value) => h("option", { value: String(value), text: String(value) })),
    );
    select.value = String(BATCH_DEFAULT_TARGET);

    const button = h("button", {
      class: "jev-btn",
      text: tr("batch.start", { count: BATCH_DEFAULT_TARGET }),
    });
    select.addEventListener("change", () => {
      button.textContent = tr("batch.start", { count: select.value });
    });

    // Opsional: lowongan yang sudah pernah dinilai boleh dihitung ulang, bukan
    // dipaksa dilewati. Hasil lamanya ditimpa.
    const reanalyze = h("input", { type: "checkbox", id: "jev-batch-reanalyze" });
    const option = h(
      "label",
      { class: "jev-check", for: "jev-batch-reanalyze" },
      reanalyze,
      h("span", { text: tr("batch.reanalyze") }),
    );

    button.addEventListener("click", () => startBatch(select.value, reanalyze.checked));

    return [
      h("p", { class: "jev-muted", text: tr("batch.startHint") }),
      h("div", { class: "jev-row" }, select, button),
      option,
    ];
  }

  function batchNodes() {
    if (batchNotice) return batchNoticeNodes();
    if (batch?.active) return batchRunningNodes();
    return null;
  }

  /**
   * Blok pembuka analisis massal. Selalu tampil di halaman pencarian — termasuk
   * saat panel sedang menampilkan laporan lowongan yang sudah dinilai, karena
   * kalau tidak, opsi batch tersembunyi di balik tombol "Kembali".
   */
  function batchStartBlock() {
    if (!extract.isSearchPage() || batch?.active) return [];
    return [...batchStartNodes(), h("div", { class: "jev-divider" })];
  }

  function bodyNodes() {
    // Batch berjalan menang atas tampilan lain: halaman ini sedang dipakai batch.
    const batchView = batchNodes();
    if (batchView) return batchView;

    if (state.view === "loading") {
      return [
        h("p", { class: "jev-muted", id: "jev-loading", text: tr("panel.loading", { seconds: 0 }) }),
        h("p", { class: "jev-muted", text: tr("panel.loadingHint") }),
      ];
    }

    if (state.view === "setup" || state.view === "error") {
      const isSetup = state.view === "setup";
      return [
        h("p", {
          class: isSetup ? "jev-muted" : "jev-error",
          text: state.error?.message ?? tr("error.unexpected"),
        }),
        h(
          "div",
          { class: "jev-actions" },
          h("button", { class: "jev-btn", text: tr("panel.retry"), onclick: () => analyze(true) }),
          h("button", {
            class: "jev-btn jev-btn-ghost",
            text: tr("panel.openSettings"),
            onclick: () => send("openOptions").catch(() => {}),
          }),
        ),
      ];
    }

    if (state.view === "ready" && state.report) {
      // Judul diambil dari laporan tersimpan, bukan hasil ekstraksi ulang, supaya
      // tetap benar saat halaman dimuat ulang dan panel detail belum ter-render.
      const title = state.report.job?.title ?? state.job?.title ?? tr("panel.jobFallback");
      const company = state.report.job?.company ?? state.job?.company;
      return [
        ...batchStartBlock(),
        backRow(),
        h(
          "div",
          { class: "jev-job-title" },
          h("b", { text: title }),
          company ? h("span", { class: "jev-muted", text: ` · ${company}` }) : null,
        ),
        ...reportNodes(state.report, { stale: state.stale }),
      ];
    }

    return [
      ...batchStartBlock(),
      h("p", { class: "jev-muted", text: tr("panel.idle") }),
      h(
        "div",
        { class: "jev-actions" },
        h("button", { class: "jev-btn", text: tr("panel.analyze"), onclick: () => analyze(false) }),
      ),
    ];
  }

  function ensurePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) return existing;

    const panel = h(
      "aside",
      { id: PANEL_ID, class: "jev-panel" },
      h(
        "header",
        { class: "jev-header" },
        h("span", { class: "jev-logo" }),
        h("strong", { text: "Jev Job Match" }),
        h("button", {
          class: "jev-icon-btn",
          title: tr("panel.hide"),
          text: "–",
          onclick: () => panel.classList.toggle("jev-collapsed"),
        }),
      ),
      h("div", { class: "jev-body" }),
    );
    document.body.append(panel);
    return panel;
  }

  function paint() {
    ensurePanel().querySelector(".jev-body").replaceChildren(...bodyNodes());
  }

  // ----------------------------------------------------------------- lifecycle

  /**
   * Analisis bisa berjalan puluhan detik. Service worker MV3 dimatikan setelah
   * tidak aktif, jadi kita kirim ping berkala selama menunggu supaya tidak putus.
   */
  function startKeepAlive() {
    stopKeepAlive();
    const startedAt = Date.now();
    heartbeat = setInterval(() => send("ping").catch(() => {}), HEARTBEAT_MS);
    loadingTicker = setInterval(() => {
      const node = document.getElementById("jev-loading");
      if (!node) return;
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      node.textContent = tr("panel.loading", { seconds });
    }, 1000);
  }

  function stopKeepAlive() {
    clearInterval(heartbeat);
    clearInterval(loadingTicker);
    heartbeat = null;
    loadingTicker = null;
  }

  /**
   * LinkedIn merender bertahap, jadi header lowongan bisa belum ada saat content
   * script jalan. Tunggu sampai judulnya terbaca dari halaman (bukan dari
   * document.title yang masih membawa embel-embel "| LinkedIn").
   */
  async function waitForJob(timeoutMs = 12_000) {
    const deadline = Date.now() + timeoutMs;
    let candidate = null;
    while (Date.now() < deadline) {
      const job = extract.extractJob();
      if (job) {
        candidate = job;
        const readable = job.description?.length >= extract.MIN_DESCRIPTION;
        if (readable && job.titleSource !== "document") return job;
      }
      await delay(400);
    }
    return candidate;
  }

  async function analyze(force) {
    state = { ...state, view: "loading", error: null };
    paint();
    startKeepAlive();

    try {
      const job = await waitForJob();
      if (!job) throw new Error(tr("error.noJobOnPage"));
      if (!job.description || job.description.length < extract.MIN_DESCRIPTION) {
        throw new Error(tr("error.descriptionTooShort"));
      }

      state = { ...state, jobId: job.jobId, job };
      const response = await send("analyze", { job, force: Boolean(force) });
      cachedReports.set(job.jobId, response.report);
      state = { ...state, view: "ready", report: response.report, stale: response.cached, error: null };
    } catch (error) {
      // Kode error dipakai, bukan teks pesannya, karena pesannya bisa dua bahasa.
      const needsSetup =
        ["not_configured", "no_cv"].includes(error.code) || error.status === 401;
      state = { ...state, view: needsSetup ? "setup" : "error", error, report: null };
    } finally {
      stopKeepAlive();
      paint();
    }
  }

  async function syncToPage() {
    const jobId = extract.currentJobId();
    if (!jobId) {
      document.getElementById(PANEL_ID)?.remove();
      return;
    }

    state = { jobId, job: extract.extractJob(), view: "idle", report: null, error: null, stale: false };
    ensurePanel();
    paint();

    if (!cachedReports.has(jobId)) {
      try {
        const response = await send("cached", { jobId });
        cachedReports.set(jobId, response.report ?? null);
      } catch {
        cachedReports.set(jobId, null);
      }
    }

    const cached = cachedReports.get(jobId);
    if (cached) {
      state = { ...state, view: "ready", report: cached, stale: true };
      paint();
    }
  }

  async function start() {
    await loadLocale();
    ensurePanel();
    await refreshBatch();

    // Kalau halaman ini bagian dari batch yang berjalan, batch yang mengendalikan
    // panel; kalau tidak, panel berjalan seperti biasa.
    const inBatch = await runBatchStep();
    if (!inBatch) syncToPage();

    // LinkedIn berpindah lowongan lewat History API tanpa memuat ulang dokumen,
    // jadi URL dipantau untuk tahu kapan panel perlu diganti.
    let lastHref = location.href;
    setInterval(() => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      batchNotice = null;
      syncToPage();
    }, NAV_POLL_MS);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "cacheInvalidated") {
      cachedReports.clear();
      if (state.jobId) syncToPage();
    }
    return false;
  });

  // Ganti bahasa di Settings langsung berlaku di panel yang sedang terbuka.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    applyLocaleSetting(changes.settings.newValue?.locale);
    paint();
  });

  start();
})();
