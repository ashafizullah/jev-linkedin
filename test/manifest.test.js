import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

/** Semua path file yang dirujuk manifest, beserta di bagian mana. */
function referencedFiles() {
  const refs = [];
  for (const entry of manifest.content_scripts ?? []) {
    for (const path of entry.js ?? []) refs.push({ path, where: "content_scripts.js" });
    for (const path of entry.css ?? []) refs.push({ path, where: "content_scripts.css" });
  }
  if (manifest.background?.service_worker) {
    refs.push({ path: manifest.background.service_worker, where: "background" });
  }
  if (manifest.options_ui?.page) refs.push({ path: manifest.options_ui.page, where: "options_ui" });
  if (manifest.action?.default_popup) {
    refs.push({ path: manifest.action.default_popup, where: "action.default_popup" });
  }
  for (const path of Object.values(manifest.icons ?? {})) {
    refs.push({ path, where: "icons" });
  }
  return refs;
}

test("manifest adalah MV3 dengan field wajib", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.name);
  assert.ok(/^\d+\.\d+\.\d+$/.test(manifest.version), "versi harus semver");
  assert.ok(manifest.description);
});

test("setiap file yang dirujuk manifest benar-benar ada", () => {
  const refs = referencedFiles();
  assert.ok(refs.length > 5, "manifest terlihat tidak lengkap");
  for (const { path, where } of refs) {
    assert.ok(existsSync(join(ROOT, path)), `${where} menunjuk file yang tidak ada: ${path}`);
  }
});

test("content script dimuat dalam urutan dependensi yang benar", () => {
  const js = manifest.content_scripts.flatMap((entry) => entry.js ?? []);
  const order = (name) => js.findIndex((path) => path.endsWith(name));

  // messages.js menaruh kamus di global, signals.js menambah pemformatan di atasnya,
  // dan extract.js maupun linkedin.js baru boleh jalan setelah keduanya ada.
  assert.ok(order("messages.js") >= 0, "messages.js tidak dimuat");
  assert.ok(order("messages.js") < order("signals.js"), "messages.js harus sebelum signals.js");
  assert.ok(order("signals.js") < order("extract.js"), "signals.js harus sebelum extract.js");
  assert.ok(order("extract.js") < order("linkedin.js"), "extract.js harus sebelum linkedin.js");
});

test("service worker berjalan sebagai ES module", () => {
  assert.equal(manifest.background?.type, "module");
});

test("host permission mencakup LinkedIn dan endpoint model default", () => {
  const hosts = manifest.host_permissions ?? [];
  assert.ok(hosts.some((host) => host.includes("linkedin.com")));
  assert.ok(hosts.some((host) => host.includes("api.typesafe.ai")));
  assert.ok(Array.isArray(manifest.optional_host_permissions));
});

test("path content script tidak menyilang ke folder lib atau options", () => {
  // Content script tidak boleh memakai import, jadi ia hanya boleh memuat
  // classic script dari shared/ dan content/.
  for (const entry of manifest.content_scripts) {
    for (const path of entry.js ?? []) {
      assert.match(path, /^src\/(shared|content)\//, `content script di luar shared/content: ${path}`);
    }
  }
});
