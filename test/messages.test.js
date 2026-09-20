import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { LOCALES, MESSAGES, detectLocale, has, setLocale, t } from "../src/lib/i18n.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SOURCE_DIRS = ["src"];
const SKIP = /^(messages|i18n)\.js$/;

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(js|html)$/.test(entry) && !SKIP.test(entry)) out.push(path);
  }
  return out;
}

function collectUsedKeys() {
  const keys = new Set();
  const prefixes = new Set();

  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8");

      for (const match of text.matchAll(/\b(?:t|tr)\(\s*["'`]([^"'`]+)["'`]/g)) {
        const key = match[1];
        if (key.includes("${")) prefixes.add(key.slice(0, key.indexOf("${")));
        else keys.add(key);
      }

      for (const match of text.matchAll(/data-i18n(?:-placeholder|-title)?="([^"]+)"/g)) {
        keys.add(match[1]);
      }
    }
  }
  return { keys, prefixes };
}

test("kedua bahasa punya kumpulan kunci yang identik", () => {
  const [first, ...rest] = LOCALES;
  const reference = Object.keys(MESSAGES[first]).sort();
  for (const locale of rest) {
    assert.deepEqual(Object.keys(MESSAGES[locale]).sort(), reference, `kunci ${locale} tidak sama`);
  }
  assert.ok(reference.length > 100, "kamus terlihat terlalu kecil");
});

test("tidak ada terjemahan kosong atau bukan string", () => {
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(MESSAGES[locale])) {
      assert.equal(typeof value, "string", `${locale}.${key} bukan string`);
      assert.ok(value.trim().length > 0, `${locale}.${key} kosong`);
    }
  }
});

test("tidak ada nilai yang identik dengan kuncinya", () => {
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(MESSAGES[locale])) {
      assert.notEqual(value, key, `${locale}.${key} tidak diterjemahkan`);
    }
  }
});

test("setiap kunci yang dipakai di kode ada di kamus", () => {
  const { keys, prefixes } = collectUsedKeys();
  const all = Object.keys(MESSAGES.en);

  for (const key of keys) {
    assert.ok(has(key, "id") && has(key, "en"), `kunci "${key}" tidak ada di kamus`);
  }
  for (const prefix of prefixes) {
    assert.ok(
      all.some((key) => key.startsWith(prefix)),
      `tidak ada kunci yang berawalan "${prefix}"`,
    );
  }
  assert.ok(keys.size > 60, "deteksi kunci tampak gagal");
});

test("interpolasi mengisi parameter dan menyisakan yang tidak dikenal", () => {
  setLocale("en");
  assert.equal(t("signal.applicantsValue", { count: 12 }), "12 people have clicked apply");
  assert.equal(t("panel.footer", { model: "jev-latest" }), "jev-latest · {date}");
});

test("placeholder identik di kedua bahasa", () => {
  const names = (value) => (value.match(/\{(\w+)\}/g) ?? []).sort();
  for (const key of Object.keys(MESSAGES.en)) {
    assert.deepEqual(names(MESSAGES.id[key]), names(MESSAGES.en[key]), `placeholder beda di ${key}`);
  }
});

/**
 * t() membiarkan placeholder yang tidak terisi apa adanya, jadi salah nama
 * parameter tampil sebagai "{done}" mentah di UI. Tes ini membandingkan nama
 * parameter yang dikirim di kode dengan placeholder di kamus.
 */
test("nama parameter yang dikirim kode cocok dengan placeholder kamus", () => {
  const problems = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8");
      const relative = file.slice(ROOT.length + 1);
      for (const match of text.matchAll(/\b(?:t|tr)\(\s*"([^"]+)"\s*,\s*\{([^}]*)\}/g)) {
        const [, key, body] = match;
        const passed = new Set(Array.from(body.matchAll(/[A-Za-z_$][\w$]*/g), (m) => m[0]));
        for (const locale of LOCALES) {
          const value = MESSAGES[locale][key];
          if (typeof value !== "string") continue;
          for (const name of value.matchAll(/\{(\w+)\}/g)) {
            if (!passed.has(name[1])) {
              problems.push(`${relative}: t("${key}") tidak mengirim {${name[1]}}`);
            }
          }
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("kunci tak dikenal dikembalikan apa adanya, bukan crash", () => {
  assert.equal(t("nope.missing.key"), "nope.missing.key");
});

test("deteksi bahasa memetakan kode locale browser", () => {
  const original = globalThis.chrome;
  const withLanguage = (language) => {
    globalThis.chrome = { i18n: { getUILanguage: () => language } };
    return detectLocale();
  };
  try {
    assert.equal(withLanguage("id"), "id");
    assert.equal(withLanguage("id-ID"), "id");
    assert.equal(withLanguage("in"), "id");
    assert.equal(withLanguage("en-GB"), "en");
    assert.equal(withLanguage("fr-FR"), "en", "bahasa lain jatuh ke Inggris");
  } finally {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  }
});
