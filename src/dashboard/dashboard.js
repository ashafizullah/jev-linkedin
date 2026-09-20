import { applyLocale, dateLocale, t } from "../lib/i18n.js";
import { clearCachedAnalyses, getSettings, listCachedAnalyses } from "../lib/settings.js";

const messages = globalThis.JevMessages;
const el = (id) => document.getElementById(id);

let items = [];
let batch = null;

// ---------------------------------------------------------------- data loading

function send(type) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error?.message ?? "error"));
      resolve(response);
    });
  });
}

async function load() {
  items = await listCachedAnalyses();
  try {
    batch = (await send("batchStatus")).batch;
  } catch {
    batch = null;
  }
  render();
}

// --------------------------------------------------------------------- render

function sorted(list) {
  const mode = el("sort").value;
  const rows = [...list];
  if (mode === "recent") return rows.sort((a, b) => b.analyzedAt - a.analyzedAt);
  if (mode === "company") {
    return rows.sort((a, b) => (a.job?.company ?? "").localeCompare(b.job?.company ?? ""));
  }
  return rows.sort((a, b) => (b.match?.percent ?? 0) - (a.match?.percent ?? 0));
}

function filtered(list) {
  const needle = el("search").value.trim().toLowerCase();
  const verdict = el("verdict").value;
  return list.filter((item) => {
    if (verdict && item.verdict?.level !== verdict) return false;
    if (!needle) return true;
    const haystack = `${item.job?.title ?? ""} ${item.job?.company ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function renderRow(item) {
  const row = document.createElement("tr");

  const jobCell = document.createElement("td");
  const link = document.createElement("a");
  link.className = "job-title";
  link.href = item.job?.url ?? `https://www.linkedin.com/jobs/view/${item.jobId}/`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = item.job?.title ?? t("options.history.jobFallback");
  const company = document.createElement("div");
  company.className = "job-company";
  company.textContent = item.job?.company ?? "";
  jobCell.append(link, company);

  const matchCell = document.createElement("td");
  matchCell.className = "num";
  const score = document.createElement("span");
  score.className = "score";
  score.textContent = `${item.match?.percent ?? "?"}%`;
  matchCell.append(score);

  const screeningCell = document.createElement("td");
  screeningCell.className = "num";
  screeningCell.textContent = `${item.opening?.passScreening ?? "?"}%`;

  const offerCell = document.createElement("td");
  offerCell.className = "num col-hide";
  offerCell.textContent = `${item.opening?.offer ?? "?"}%`;

  const verdictCell = document.createElement("td");
  if (item.verdict?.level) {
    const badge = document.createElement("span");
    badge.className = `badge ${item.verdict.level}`;
    badge.textContent = t(`verdict.${item.verdict.level}`);
    verdictCell.append(badge);
  }

  const reasonCell = document.createElement("td");
  reasonCell.className = "reason";
  const top = item.gaps?.[0];
  reasonCell.textContent = top ? t(`question.gap.${top.key}`) : "—";

  const whenCell = document.createElement("td");
  whenCell.className = "col-hide";
  whenCell.textContent = item.analyzedAt
    ? new Date(item.analyzedAt).toLocaleString(dateLocale())
    : "—";

  row.append(jobCell, matchCell, screeningCell, offerCell, verdictCell, reasonCell, whenCell);
  return row;
}

function renderTable() {
  const visible = filtered(items);
  el("count").textContent = t("dashboard.count", { count: visible.length });
  el("rows").replaceChildren(...sorted(visible).map(renderRow));

  const empty = el("empty");
  if (visible.length) {
    empty.textContent = "";
    return;
  }
  const strong = document.createElement("strong");
  strong.textContent = items.length ? t("dashboard.noMatch") : t("dashboard.empty");
  empty.replaceChildren(strong);
  if (!items.length) {
    const hint = document.createElement("span");
    hint.textContent = t("dashboard.emptyHint");
    empty.append(hint);
  }
}

function renderBatch() {
  const body = el("batchBody");
  body.replaceChildren();

  if (!batch?.active) {
    const idle = document.createElement("p");
    idle.className = "muted";
    idle.textContent = t("dashboard.batchIdle");
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent = t("dashboard.batchStartHint");
    body.append(idle, hint);
    return;
  }

  const label = document.createElement("div");
  label.textContent = t("dashboard.batchProgress", { done: batch.analyzed, target: batch.target });

  const bar = document.createElement("div");
  bar.className = "progress";
  const fill = document.createElement("div");
  fill.style.width = `${Math.min(100, (batch.analyzed / Math.max(1, batch.target)) * 100)}%`;
  bar.append(fill);

  const notes = document.createElement("p");
  notes.className = "muted";
  const parts = [];
  if (batch.skipped) parts.push(t("batch.skipped", { count: batch.skipped }));
  if (batch.failed) parts.push(t("batch.failed", { count: batch.failed }));
  notes.textContent = parts.join(" ");

  const actions = document.createElement("div");
  actions.className = "batch-actions";
  const stopButton = document.createElement("button");
  stopButton.className = "btn ghost";
  stopButton.textContent = t("dashboard.batchStop");
  stopButton.addEventListener("click", async () => {
    await send("batchStop");
    await load();
  });
  actions.append(stopButton);

  body.append(label, bar, notes, actions);
}

function render() {
  renderBatch();
  renderTable();
}

// ------------------------------------------------------------------- lifecycle

async function handleClear() {
  const removed = await clearCachedAnalyses();
  await load();
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = t("dashboard.cleared", { count: removed });
  el("batchBody").append(status);
}

async function init() {
  const settings = await getSettings();
  applyLocale(settings.locale);
  messages.apply(document);
  document.title = t("dashboard.title");

  el("search").addEventListener("input", renderTable);
  el("sort").addEventListener("change", renderTable);
  el("verdict").addEventListener("change", renderTable);
  el("clear").addEventListener("click", handleClear);
  el("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

  await load();

  // Batch berjalan di tab lain, jadi dashboard menyegarkan diri sendiri.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.settings) {
      applyLocale(changes.settings.newValue?.locale);
      messages.apply(document);
      render();
    }
    if (changes.batch) load();
  });
  setInterval(load, 5000);
}

init();
