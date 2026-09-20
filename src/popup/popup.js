import { applyLocale, t } from "../lib/i18n.js";
import { getSettings, isConfigured, listCachedAnalyses, profileIsUsable } from "../lib/settings.js";

const messages = globalThis.JevMessages;

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
  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("openDashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
  });
}

init();
