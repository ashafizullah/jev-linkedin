import { t } from "./i18n.js";

export class JevError extends Error {
  constructor(message, { status = 0, code = "", retryable = false } = {}) {
    super(message);
    this.name = "JevError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUS = new Set([429, 503, 529]);
const DEFAULT_TIMEOUT_MS = 90_000;

export function systemOneUrl(baseUrl) {
  return `${baseUrl.trim().replace(/\/+$/, "")}/systemone`;
}

export function modelsUrl(baseUrl) {
  return `${baseUrl.trim().replace(/\/+$/, "")}/models`;
}

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };
}

async function readError(response) {
  const fallback = t("error.http", { status: response.status });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return { message: fallback, code: "" };
  }
  const error = payload?.error ?? payload;
  const message = typeof error === "string" ? error : (error?.message ?? fallback);
  return { message, code: error?.code ?? "" };
}

async function request(url, init, { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        const { message, code } = await readError(response);
        const retryable = RETRYABLE_STATUS.has(response.status);
        lastError = new JevError(message, { status: response.status, code, retryable });
        if (retryable && attempt < retries) {
          await sleep(600 * 2 ** attempt);
          continue;
        }
        throw lastError;
      }
      return await response.json();
    } catch (error) {
      if (error instanceof JevError) throw error;
      lastError = new JevError(
        error.name === "AbortError" ? t("error.timeout") : error.message,
        { retryable: true },
      );
      if (attempt === retries) throw lastError;
      await sleep(600 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Satu panggilan Jev: kirim `state` + map pertanyaan bertipe, terima jawaban bertipe.
 * Semua pertanyaan dievaluasi paralel oleh Jev, jadi menambah pertanyaan nyaris tidak
 * menambah waktu respons.
 */
export async function evaluate({ baseUrl, apiKey, model, state, questions, timeoutMs }) {
  if (!apiKey?.trim()) {
    throw new JevError(t("error.noApiKey"), { code: "not_configured" });
  }
  if (!baseUrl?.trim()) {
    throw new JevError(t("error.noBaseUrl"), { code: "not_configured" });
  }
  if (!questions || Object.keys(questions).length === 0) {
    throw new JevError(t("error.noQuestions"));
  }

  const payload = await request(
    systemOneUrl(baseUrl),
    {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ model, state, questions }),
    },
    { timeoutMs },
  );

  if (!payload?.answers) {
    throw new JevError(t("error.badResponse"));
  }
  return payload;
}

/**
 * Dua bentuk respons didukung: OpenAI-style `{ data: [{ id }] }` (dipakai gateway)
 * dan bentuk asli TypeSafe `{ models: [{ name }] }`.
 */
export async function listModels({ baseUrl, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const payload = await request(
    modelsUrl(baseUrl),
    { method: "GET", headers: authHeaders(apiKey) },
    { timeoutMs, retries: 0 },
  );
  const entries = payload?.data ?? payload?.models ?? [];
  return entries
    .map((entry) => entry.id ?? entry.name)
    .filter(Boolean)
    .sort();
}
