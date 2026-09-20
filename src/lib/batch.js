/**
 * State machine untuk analisis massal. Sengaja murni (tanpa chrome.* dan tanpa DOM)
 * supaya seluruh alur bisa diuji tanpa browser.
 *
 * Alurnya bergantian antara dua jenis halaman:
 *   halaman pencarian -> panen ID lowongan
 *   halaman lowongan  -> ekstrak + nilai, lalu lanjut
 *
 * Karena berpindah halaman berarti memuat ulang dokumen, state hidup di
 * chrome.storage dan tiap halaman baru bertanya "apa langkah berikutnya?".
 */

export const PAGE_SIZE = 25;
export const MAX_PAGES = 6;
export const MAX_TARGET = 50;
export const DEFAULT_TARGET = 10;

export function clampTarget(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return DEFAULT_TARGET;
  return Math.min(number, MAX_TARGET);
}

function withIds(batch, jobIds) {
  const seen = new Set(batch.seen);
  const pending = [...batch.pending];
  for (const id of jobIds ?? []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    pending.push(id);
  }
  return { ...batch, pending, seen: [...seen] };
}

export function createBatch({
  jobIds = [],
  target,
  searchUrl,
  start = 0,
  tabId = null,
  reanalyze = false,
  now = Date.now(),
}) {
  const batch = {
    id: `batch-${now.toString(36)}`,
    active: true,
    target: clampTarget(target),
    // Kalau true, lowongan yang sudah pernah dinilai dihitung ulang dan hasil
    // lamanya ditimpa; kalau false, lowongan itu dilewati dan tidak dihitung.
    reanalyze: Boolean(reanalyze),
    searchUrl,
    nextStart: start + PAGE_SIZE,
    pagesHarvested: 1,
    pending: [],
    seen: [],
    currentJobId: null,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    startedAt: now,
    finishedAt: null,
    tabId,
    stopped: false,
    lastJobId: null,
  };
  return withIds(batch, jobIds);
}

/** Tambahkan lowongan dari halaman pencarian berikutnya. */
export function harvest(batch, jobIds) {
  return withIds(
    { ...batch, pagesHarvested: batch.pagesHarvested + 1, nextStart: batch.nextStart + PAGE_SIZE },
    jobIds,
  );
}

export function isComplete(batch) {
  if (!batch?.active) return true;
  return batch.analyzed >= batch.target;
}

function harvestUrl(batch) {
  if (!batch.searchUrl || batch.pagesHarvested >= MAX_PAGES) return null;
  try {
    const url = new URL(batch.searchUrl);
    url.searchParams.set("start", String(batch.nextStart));
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Langkah berikutnya. Kalau hasilnya "job", lowongan itu langsung dikeluarkan dari
 * antrean dan dicatat sebagai `currentJobId`, supaya halaman yang sedang terbuka
 * bisa memastikan dirinya memang bagian dari batch.
 */
export function nextStep(batch) {
  if (!batch?.active) return { kind: "done", reason: "inactive", batch };
  if (isComplete(batch)) return { kind: "done", reason: "target", batch };

  const [head, ...rest] = batch.pending;
  if (head) {
    return {
      kind: "job",
      jobId: head,
      url: `https://www.linkedin.com/jobs/view/${head}/`,
      batch: { ...batch, pending: rest, currentJobId: head },
    };
  }

  const url = harvestUrl(batch);
  if (url) return { kind: "harvest", url, batch };

  return { kind: "done", reason: "exhausted", batch };
}

export function record(batch, { jobId, status }) {
  return {
    ...batch,
    currentJobId: null,
    lastJobId: jobId ?? batch.currentJobId ?? batch.lastJobId,
    analyzed: batch.analyzed + (status === "analyzed" ? 1 : 0),
    skipped: batch.skipped + (status === "skipped" ? 1 : 0),
    failed: batch.failed + (status === "failed" ? 1 : 0),
  };
}

export function finish(batch, { stopped = false, now = Date.now() } = {}) {
  return { ...batch, active: false, stopped, finishedAt: now, currentJobId: null };
}

export function stop(batch, options) {
  return finish({ ...batch, pending: [] }, { stopped: true, ...options });
}

/** Ringkasan untuk ditampilkan di panel dan dashboard. */
export function summary(batch) {
  if (!batch) return null;
  return {
    id: batch.id,
    active: Boolean(batch.active),
    target: batch.target,
    reanalyze: Boolean(batch.reanalyze),
    analyzed: batch.analyzed,
    skipped: batch.skipped,
    failed: batch.failed,
    pending: batch.pending.length,
    currentJobId: batch.currentJobId,
    startedAt: batch.startedAt,
    finishedAt: batch.finishedAt,
    stopped: Boolean(batch.stopped),
    done: isComplete(batch),
  };
}
