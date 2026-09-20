import * as pdfjsLib from "../../vendor/pdfjs/pdf.min.mjs";
import { t } from "./i18n.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdfjs/pdf.worker.min.mjs");

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

function extensionOf(name) {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index).toLowerCase();
}

async function textFromPdf(file) {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      let line = "";
      const lines = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        line += item.str;
        if (item.hasEOL) {
          lines.push(line.trim());
          line = "";
        }
      }
      if (line.trim()) lines.push(line.trim());
      pages.push(lines.filter(Boolean).join("\n"));
    }
  } finally {
    await doc.destroy();
  }
  return { text: pages.join("\n\n"), pageCount: doc.numPages };
}

async function textFromDocx(file) {
  const mammoth = globalThis.mammoth;
  if (!mammoth) throw new Error(t("error.mammothMissing"));
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return { text: result.value, pageCount: null };
}

/**
 * Ubah file CV jadi teks. Hanya PDF, DOCX, dan teks biasa yang didukung.
 */
export async function extractCvText(file) {
  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      extension ? t("error.fileType", { extension }) : t("error.fileTypeGeneric"),
    );
  }

  const warnings = [];
  let result;
  if (extension === ".pdf") {
    result = await textFromPdf(file);
    if (result.text.trim().length < 200) {
      warnings.push(t("error.pdfScanned"));
    }
  } else if (extension === ".docx") {
    result = await textFromDocx(file);
  } else {
    result = { text: await file.text(), pageCount: null };
  }

  const text = result.text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error(t("error.emptyFile"));

  return { text, pageCount: result.pageCount, warnings };
}
