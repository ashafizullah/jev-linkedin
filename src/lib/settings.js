const KEY = "settings";

export const DEFAULT_BASE_URL = "https://api.typesafe.ai/v1";
export const DEFAULT_MODEL = "jev-latest";

/**
 * Hanya berisi teks CV dan fakta yang bisa dibaca darinya. Preferensi lamaran
 * (izin kerja, ekspektasi gaji, mode kerja) sengaja tidak ada: pengukuran
 * menunjukkan tidak mengubah keputusan, dan ekspektasi gaji bahkan tidak dipakai
 * pertanyaan mana pun.
 */
export const EMPTY_PROFILE = {
  cvText: "",
  cvFileName: "",
  cvUpdatedAt: null,
  headline: "",
  experienceYears: "",
  location: "",
  languages: "",
  education: "",
  skills: "",
};

export const DEFAULT_SETTINGS = {
  // "auto" mengikuti bahasa antarmuka browser, bisa ditimpa jadi "id" atau "en".
  locale: "auto",
  baseUrl: DEFAULT_BASE_URL,
  apiKey: "",
  model: DEFAULT_MODEL,
  profile: { ...EMPTY_PROFILE },
};

function merge(stored) {
  const value = stored ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    profile: { ...EMPTY_PROFILE, ...(value.profile ?? {}) },
  };
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(KEY);
  return merge(stored[KEY]);
}

export async function saveSettings(settings) {
  const next = merge(settings);
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export async function updateSettings(patch) {
  const current = await getSettings();
  return saveSettings({
    ...current,
    ...patch,
    profile: { ...current.profile, ...(patch.profile ?? {}) },
  });
}

export function isConfigured(settings) {
  return Boolean(settings.apiKey.trim()) && Boolean(settings.baseUrl.trim());
}

export function profileIsUsable(profile) {
  return profile.cvText.trim().length >= 100;
}

export async function getCachedAnalysis(jobId) {
  const key = `analysis:${jobId}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] ?? null;
}

export async function putCachedAnalysis(jobId, analysis) {
  await chrome.storage.local.set({ [`analysis:${jobId}`]: analysis });
}

export async function listCachedAnalyses() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith("analysis:"))
    .map(([key, value]) => ({ jobId: key.slice("analysis:".length), ...value }))
    .sort((a, b) => b.analyzedAt - a.analyzedAt);
}

export async function clearCachedAnalyses() {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith("analysis:"));
  if (keys.length) await chrome.storage.local.remove(keys);
  return keys.length;
}
