import { analyzeJob } from "./lib/analyze.js";
import {
  createBatch,
  finish,
  harvest,
  nextStep,
  record,
  stop,
  summary,
} from "./lib/batch.js";
import { applyLocale, t } from "./lib/i18n.js";
import { JevError } from "./lib/jev.js";
import {
  getCachedAnalysis,
  getSettings,
  profileIsUsable,
  putCachedAnalysis,
  isConfigured,
} from "./lib/settings.js";

const BATCH_KEY = "batch";

function errorPayload(error) {
  if (error instanceof JevError) {
    return { message: error.message, status: error.status, code: error.code, retryable: error.retryable };
  }
  return {
    message: error?.message ?? t("error.unexpected"),
    status: 0,
    code: "",
    retryable: false,
  };
}

async function status() {
  const settings = await getSettings();
  return {
    configured: isConfigured(settings),
    hasProfile: profileIsUsable(settings.profile),
    model: settings.model,
    baseUrl: settings.baseUrl,
    locale: settings.locale,
    cvFileName: settings.profile.cvFileName || null,
  };
}

async function analyze(job, { force = false } = {}) {
  if (!job?.jobId) throw new JevError(t("error.noJobId"));
  if (!(job.description ?? "").trim()) {
    throw new JevError(t("error.noDescription"));
  }

  if (!force) {
    const cached = await getCachedAnalysis(job.jobId);
    if (cached) return { report: cached, cached: true };
  }

  const settings = await getSettings();
  if (!isConfigured(settings)) {
    throw new JevError(t("error.notConfigured"), { code: "not_configured" });
  }
  if (!profileIsUsable(settings.profile)) {
    throw new JevError(t("error.noCv"), { code: "no_cv" });
  }

  const report = await analyzeJob({ job, profile: settings.profile, settings });
  await putCachedAnalysis(job.jobId, report);
  return { report, cached: false };
}

const routes = {
  status,
  ping: () => ({}),
  analyze: ({ job, force }) => analyze(job, { force }),
  cached: ({ jobId }) => getCachedAnalysis(jobId).then((report) => ({ report })),
  openOptions: () => chrome.runtime.openOptionsPage().then(() => ({})),
  batchStatus: () => getBatch().then((batch) => ({ batch: summary(batch) })),
  batchStart: (message, sender) =>
    batchStart({ ...message, tabId: sender?.tab?.id ?? null }),
  batchHarvest: (message, sender) => batchHarvest(message, sender?.tab?.id ?? null),
  batchNext: (message, sender) => batchNext(message, sender?.tab?.id ?? null),
  batchStop: () => batchStop(),
  openDashboard: () =>
    chrome.tabs
      .create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") })
      .then(() => ({})),
};

// ------------------------------------------------------------------- analisis massal

function getBatch() {
  return chrome.storage.local.get(BATCH_KEY).then((stored) => stored[BATCH_KEY] ?? null);
}

function saveBatch(batch) {
  return chrome.storage.local.set({ [BATCH_KEY]: batch });
}

function describe(step) {
  const plan = { kind: step.kind };
  if (step.url) plan.url = step.url;
  if (step.jobId) plan.jobId = step.jobId;
  if (step.reason) plan.reason = step.reason;
  return plan;
}

/**
 * Hitung langkah berikutnya dan simpan. Kalau sudah selesai, batch ditutup tapi
 * tetap disimpan supaya dashboard bisa menampilkan hasil batch terakhir.
 */
async function advance(batch) {
  const step = nextStep(batch);
  const stored = step.kind === "done" ? finish(step.batch) : step.batch;
  await saveBatch(stored);
  return { batch: summary(stored), plan: describe(step) };
}

async function batchStart({ jobIds, target, searchUrl, start, tabId, reanalyze }) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    throw new JevError(t("batch.nothingToDo"));
  }
  return advance(createBatch({ jobIds, target, searchUrl, start, tabId, reanalyze }));
}

/** Dipanggil saat content script mendarat di halaman pencarian berikutnya. */
async function batchHarvest({ jobIds }, tabId) {
  const batch = await getBatch();
  if (!batch?.active) return { batch: summary(batch), plan: { kind: "done", reason: "inactive" } };
  if (batch.tabId !== null && tabId !== null && batch.tabId !== tabId) {
    return { batch: summary(batch), plan: { kind: "done", reason: "other-tab" } };
  }
  return advance(harvest(batch, jobIds));
}

async function batchNext({ jobId, status }, tabId) {
  const batch = await getBatch();
  if (!batch?.active) return { batch: summary(batch), plan: { kind: "done", reason: "inactive" } };
  if (batch.tabId !== null && tabId !== null && batch.tabId !== tabId) {
    return { batch: summary(batch), plan: { kind: "done", reason: "other-tab" } };
  }
  return advance(record(batch, { jobId, status }));
}

async function batchStop() {
  const batch = await getBatch();
  if (!batch) return { batch: null, plan: { kind: "done", reason: "none" } };
  const stopped = stop(batch);
  await saveBatch(stopped);
  return { batch: summary(stopped), plan: { kind: "done", reason: "stopped" } };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = routes[message?.type];
  if (!handler) return false;

  // Bahasa diterapkan dari settings sebelum handler jalan, supaya pesan error
  // (dan teks pertanyaan yang dikirim ke Jev) memakai bahasa yang benar.
  getSettings()
    .then((settings) => {
      applyLocale(settings.locale);
      return handler(message, sender);
    })
    .then((data) => sendResponse({ ok: true, ...data }))
    .catch((error) => sendResponse({ ok: false, error: errorPayload(error) }));

  return true;
});
