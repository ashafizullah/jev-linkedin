import { applyLocale, dateLocale, t } from "../lib/i18n.js";
import { EXTRACTABLE_FIELDS, extractProfile } from "../lib/cvProfile.js";
import { listModels } from "../lib/jev.js";
import { extractCvText } from "../lib/profile.js";
import {
  DEFAULT_SETTINGS,
  clearCachedAnalyses,
  getSettings,
  listCachedAnalyses,
  saveSettings,
} from "../lib/settings.js";

const messages = globalThis.JevMessages;

const FIELDS = [
  "baseUrl",
  "apiKey",
  "model",
  "headline",
  "experienceYears",
  "location",
  "languages",
  "education",
  "skills",
];

const el = (id) => document.getElementById(id);
const status = (node, message, tone = "") => {
  node.textContent = message;
  node.className = `status ${tone}`.trim();
};

let cvFileName = "";
let cvUpdatedAt = null;

function fillForm(settings) {
  el("locale").value = settings.locale;
  for (const field of FIELDS) {
    const node = el(field);
    if (!node) continue;
    node.value = field in settings ? settings[field] : (settings.profile[field] ?? "");
  }
  el("cvText").value = settings.profile.cvText;
  cvFileName = settings.profile.cvFileName;
  cvUpdatedAt = settings.profile.cvUpdatedAt;
  renderCvCount();
  renderCvStatus();
}

function readForm() {
  const settings = { profile: {}, locale: el("locale").value };
  for (const field of FIELDS) {
    const node = el(field);
    if (!node) continue;
    if (field in DEFAULT_SETTINGS) settings[field] = node.value.trim();
    else settings.profile[field] = node.value.trim();
  }
  settings.profile.cvText = el("cvText").value.trim();
  settings.profile.cvFileName = cvFileName;
  settings.profile.cvUpdatedAt = cvUpdatedAt;
  return settings;
}

function renderCvCount() {
  el("cvCount").textContent = t("options.cv.count", { count: el("cvText").value.trim().length });
}

function renderCvStatus() {
  const node = el("cvStatus");
  const length = el("cvText").value.trim().length;
  if (!length) {
    status(node, t("options.cv.empty"));
    return;
  }
  const when = cvUpdatedAt
    ? new Date(cvUpdatedAt).toLocaleString(dateLocale())
    : "—";
  status(
    node,
    t("options.cv.status", {
      name: cvFileName || t("options.cv.manual"),
      count: length,
      when,
    }),
    "ok",
  );
}

async function ensureHostPermission(baseUrl) {
  let origin;
  try {
    origin = `${new URL(baseUrl).origin}/*`;
  } catch {
    throw new Error(t("error.invalidUrl"));
  }
  if (await chrome.permissions.contains({ origins: [origin] })) return true;
  return chrome.permissions.request({ origins: [origin] });
}

async function handleSave() {
  const node = el("saveStatus");
  const settings = readForm();
  if (!settings.baseUrl) {
    status(node, t("options.save.baseUrlRequired"), "err");
    return;
  }
  try {
    const granted = await ensureHostPermission(settings.baseUrl);
    if (!granted) {
      status(node, t("options.save.permissionDenied"), "err");
      return;
    }
    await saveSettings(settings);
    status(node, t("options.saved"), "ok");
    renderCvStatus();
  } catch (error) {
    status(node, error.message, "err");
  }
}

async function handleTest() {
  const node = el("connStatus");
  const settings = readForm();
  status(node, t("options.test.testing"));
  try {
    await ensureHostPermission(settings.baseUrl);
    const models = await listModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey });
    const hasModel = models.includes(settings.model);
    status(
      node,
      t(hasModel ? "options.test.ok" : "options.test.missingModel", {
        count: models.length,
        model: settings.model,
      }),
      hasModel ? "ok" : "err",
    );
  } catch (error) {
    status(node, t("options.test.failed", { message: error.message }), "err");
  }
}

async function handleLoadModels() {
  const node = el("connStatus");
  const settings = readForm();
  status(node, t("options.model.loading"));
  try {
    await ensureHostPermission(settings.baseUrl);
    const models = await listModels({ baseUrl: settings.baseUrl, apiKey: settings.apiKey });
    el("modelList").replaceChildren(
      ...models.map((id) => {
        const option = document.createElement("option");
        option.value = id;
        return option;
      }),
    );
    status(node, t("options.model.loaded", { count: models.length }), "ok");
  } catch (error) {
    status(node, t("options.test.failed", { message: error.message }), "err");
  }
}

async function handleFile(file) {
  const node = el("cvStatus");
  if (!file) return;
  status(node, t("options.cv.reading", { name: file.name }));
  try {
    const { text, pageCount, warnings } = await extractCvText(file);
    el("cvText").value = text;
    cvFileName = file.name;
    cvUpdatedAt = Date.now();
    renderCvCount();
    renderCvStatus();
    const extra = [
      pageCount ? t("options.cv.pages", { count: pageCount }) : null,
      ...warnings,
    ]
      .filter(Boolean)
      .join(" · ");
    if (extra) node.textContent = `${node.textContent} · ${extra}`;
    await handleSave();
    // Setelah CV masuk, langsung coba isi preferensi lamaran dari isinya.
    await handleAutofill();
  } catch (error) {
    status(node, error.message, "err");
  }
}

function fieldLabel(field) {
  return t(`options.${field}.label`);
}

/**
 * Isi field yang memang terbaca dari CV. Hanya field kosong yang diisi, supaya
 * ketikan tangan tidak pernah tertimpa. Field preferensi (izin kerja, gaji,
 * preferensi kerja) sengaja dibiarkan dan dijelaskan ke user kenapa.
 */
async function handleAutofill() {
  const node = el("autofillStatus");
  const cvText = el("cvText").value.trim();
  if (cvText.length < 100) {
    status(node, t("options.autofill.needCv"), "err");
    return;
  }

  const extracted = extractProfile(cvText);
  const filled = [];
  const skipped = [];

  for (const field of EXTRACTABLE_FIELDS) {
    const input = el(field);
    const value = (extracted[field] ?? "").trim();
    if (!input || !value) continue;
    if (input.value.trim()) {
      skipped.push(field);
      continue;
    }
    input.value = value;
    filled.push(field);
  }

  const parts = [
    filled.length
      ? t("options.autofill.filled", {
          count: filled.length,
          fields: filled.map(fieldLabel).join(", "),
        })
      : t("options.autofill.none"),
  ];
  if (skipped.length) {
    parts.push(t("options.autofill.skipped", { count: skipped.length }));
  }

  status(node, parts.join(" "), filled.length ? "ok" : "");
  if (filled.length) await handleSave();
}

async function renderHistory() {
  const items = await listCachedAnalyses();
  const container = el("historyList");
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted small";
    empty.textContent = t("options.history.empty");
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement("div");
      row.className = "history-item";

      const link = document.createElement("a");
      link.href = `https://www.linkedin.com/jobs/view/${item.jobId}/`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${item.job?.title ?? t("options.history.jobFallback")} — ${item.job?.company ?? ""}`;

      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = `${item.match?.percent ?? "?"}%`;

      const verdict = document.createElement("span");
      verdict.className = "muted small";
      // Laporan menyimpan kunci, jadi labelnya diterjemahkan saat render.
      verdict.textContent = item.verdict?.level ? t(`verdict.${item.verdict.level}`) : "";

      row.append(link, score, verdict);
      return row;
    }),
  );
}

async function handleClearCache() {
  const removed = await clearCachedAnalyses();
  await renderHistory();
  status(el("saveStatus"), t("options.history.cleared", { count: removed }), "ok");
  const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "cacheInvalidated" }).catch(() => {});
  }
}

/** Ganti bahasa langsung berlaku tanpa menyimpan ulang. */
async function handleLocaleChange() {
  const locale = el("locale").value;
  applyLocale(locale);
  messages.apply(document);
  document.title = t("options.title");
  renderCvCount();
  renderCvStatus();
  renderHistory();
  el("toggleKey").textContent =
    el("apiKey").type === "password" ? t("options.apiKey.show") : t("options.apiKey.hide");
  status(el("saveStatus"), "");
  status(el("connStatus"), "");
  status(el("autofillStatus"), "");
}

function wireDropzone() {
  const zone = el("dropzone");
  const input = el("cvFile");
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") input.click();
  });
  input.addEventListener("change", () => handleFile(input.files?.[0]));
  for (const type of ["dragenter", "dragover"]) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add("drag");
    });
  }
  for (const type of ["dragleave", "drop"]) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove("drag");
    });
  }
  zone.addEventListener("drop", (event) => handleFile(event.dataTransfer?.files?.[0]));
}

function wireKeyToggle() {
  const input = el("apiKey");
  const button = el("toggleKey");
  button.addEventListener("click", () => {
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    button.textContent = hidden ? t("options.apiKey.hide") : t("options.apiKey.show");
  });
}

async function init() {
  const settings = await getSettings();
  applyLocale(settings.locale);
  messages.apply(document);
  document.title = t("options.title");
  fillForm(settings);

  el("locale").addEventListener("change", handleLocaleChange);
  el("save").addEventListener("click", handleSave);
  el("test").addEventListener("click", handleTest);
  el("loadModels").addEventListener("click", handleLoadModels);
  el("cvText").addEventListener("input", () => {
    renderCvCount();
    renderCvStatus();
  });
  // Menempel teks CV langsung ke textarea juga harus mengisi bagian preferensi,
  // bukan hanya upload file. Dipicu saat selesai mengedit, bukan tiap ketikan,
  // supaya statusnya tidak berkedip-kedip.
  el("cvText").addEventListener("blur", () => {
    if (el("cvText").value.trim().length >= 100) handleAutofill();
  });
  el("clearCache").addEventListener("click", handleClearCache);
  el("autofill").addEventListener("click", handleAutofill);
  el("openDashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
  });
  wireDropzone();
  wireKeyToggle();

  await renderHistory();
}

init();
