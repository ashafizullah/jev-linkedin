import { applyLocale, t } from "../lib/i18n.js";
import { getSettings, isConfigured, listCachedAnalyses, profileIsUsable } from "../lib/settings.js";

const messages = globalThis.JevMessages;

/**
 * Halaman ini yang membuka daftar "Lowongan berdasarkan preferensi Anda".
 * Preferensinya milik akun LinkedIn user, jadi kita tidak perlu tahu isinya —
 * LinkedIn yang menyusun daftarnya. Dibanding /jobs/ yang cuma halaman depan
 * tanpa daftar, URL ini langsung memuat kartu lowongannya.
 */
const LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/search-results/?origin=PREFERENCES_LANDING";

function openTab(url) {
  chrome.tabs.create({ url });
}

function set(prefix, ok, text) {
  document.getElementById(`${prefix}Dot`).className = `dot ${ok ? "ok" : "bad"}`;
  document.getElementById(`${prefix}Text`).textContent = text;
}

async function init() {
  const settings = await getSettings();
  applyLocale(settings.locale);
  messages.apply(document);

  const configured = isConfigured(settings);
  const hasProfile = profileIsUsable(settings.profile);

  let host = "";
  try {
    host = new URL(settings.baseUrl).host;
  } catch {
    host = "";
  }

  set(
    "cfg",
    configured,
    configured ? t("popup.connectionReady", { host }) : t("popup.connectionMissing"),
  );
  set(
    "cv",
    hasProfile,
    hasProfile
      ? t("popup.cvReady", { name: settings.profile.cvFileName || t("popup.cvManual") })
      : t("popup.cvMissing"),
  );

  document.getElementById("model").textContent = settings.model || "—";
  document.getElementById("history").textContent = String((await listCachedAnalyses()).length);

  document.getElementById("openJobs").addEventListener("click", () => openTab(LINKEDIN_JOBS_URL));
  document.getElementById("openDashboard").addEventListener("click", () =>
    openTab(chrome.runtime.getURL("src/dashboard/dashboard.html")),
  );
  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
}

init();
