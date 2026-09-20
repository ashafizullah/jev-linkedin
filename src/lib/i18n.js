// Kamus hidup di src/shared/messages.js sebagai classic script supaya bisa dipakai
// content script (yang tidak boleh memakai import). Modul ini membungkusnya untuk
// konteks ESM: service worker, halaman Settings, dan popup.
import "../shared/messages.js";

const messages = globalThis.JevMessages;

export const { LOCALES, MESSAGES, detectLocale, getLocale, has, t, apply, dateLocale } = messages;

export function setLocale(locale) {
  return messages.setLocale(locale);
}

/**
 * "auto" berarti ikut bahasa antarmuka browser. Nilai lain dipakai apa adanya.
 */
export function applyLocale(setting) {
  const wanted = !setting || setting === "auto" ? detectLocale() : setting;
  return messages.setLocale(wanted);
}

export function isAuto(setting) {
  return !setting || setting === "auto";
}
