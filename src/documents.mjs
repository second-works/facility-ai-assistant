import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SUPPORTED_FORMATS = new Set(["pdf", "txt"]);
const PAGE_MARKER = /^---\s*page:\s*(\d+)\s*---$/i;
const SECRET_PATTERN = /(ghp_|github_pat_|sk-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

export const SAMPLE_DOCUMENT_SPECS = Object.freeze([
  Object.freeze({ id: "hvac-noise-guide", title: "空調設備 異音時の確認ガイド", format: "txt", sourcePath: "data/samples/hvac-noise-guide.txt", visibility: "PUBLIC" }),
  Object.freeze({ id: "generator-monthly-inspection", title: "非常用発電機 月例点検基準", format: "txt", sourcePath: "data/samples/generator-monthly-inspection.txt", visibility: "PUBLIC" }),
  Object.freeze({ id: "fire-alarm-inspection", title: "消防設備 異常表示時の確認手順", format: "txt", sourcePath: "data/samples/fire-alarm-inspection.txt", visibility: "PUBLIC" }),
  Object.freeze({ id: "sample-scope-note", title: "サンプル文書の利用範囲と相談先", format: "txt", sourcePath: "data/samples/sample-scope-note.txt", visibility: "PUBLIC" }),
]);

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(fieldName + " must be a non-empty string");
  }
  return value.trim();
}

function assertSafeId(value, fieldName) {
  const id = assertNonEmptyString(value, fieldName);
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) {
    throw new TypeError(fieldName + " must use lowercase letters, numbers, and hyphens");
  }
  return id;
}

function normalizePage(page, index) {
  if (!page || !Number.isInteger(page.number) || page.number < 1) {
    throw new RangeError("pages[" + index + "].number must be a positive integer");
  }
  const text = assertNonEmptyString(page.text, "pages[" + index + "].text");
  return Object.freeze({ number: page.number, text });
}

function normalizePages(pages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new RangeError("pages must contain at least one page");
  }
  const normalized = pages.map(normalizePage);
  const pageNumbers = new Set(normalized.map((page) => page.number));
  if (pageNumbers.size !== normalized.length) {
    throw new RangeError("page numbers must be unique");
  }
  return Object.freeze(normalized);
}

export function normalizeDocument(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("document must be an object");
  }
  const id = assertSafeId(input.id, "id");
  const title = assertNonEmptyString(input.title, "title");
  const format = assertNonEmptyString(input.format, "format").toLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) {
    throw new RangeError("format must be one of " + [...SUPPORTED_FORMATS].join(", "));
  }
  const sourcePath = assertNonEmptyString(input.sourcePath, "sourcePath");
  if (sourcePath.startsWith("/") || sourcePath.split("/").includes("..")) {
    throw new RangeError("sourcePath must be a repository-relative path");
  }
  if (input.visibility !== "PUBLIC") {
    throw new RangeError("visibility must be PUBLIC for sample documents");
  }
  return Object.freeze({
    id, title, format, sourcePath, visibility: "PUBLIC", pages: normalizePages(input.pages),
  });
}

export function registerDocuments(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new RangeError("at least one document is required");
  }
  const ids = new Set();
  const documents = inputs.map((input) => {
    const document = normalizeDocument(input);
    if (ids.has(document.id)) {
      throw new RangeError("duplicate document id: " + document.id);
    }
    ids.add(document.id);
    return document;
  });
  return Object.freeze(documents);
}

export function parsePagedText(rawText) {
  if (typeof rawText !== "string" || rawText.trim() === "") {
    throw new TypeError("rawText must be a non-empty string");
  }
  const pages = [];
  let currentNumber = null;
  let currentLines = [];
  const flushPage = () => {
    if (currentNumber === null) return;
    pages.push({ number: currentNumber, text: currentLines.join("\n").trim() });
    currentLines = [];
  };
  for (const line of rawText.replaceAll("\r\n", "\n").split("\n")) {
    const marker = line.trim().match(PAGE_MARKER);
    if (marker) {
      flushPage();
      currentNumber = Number(marker[1]);
      continue;
    }
    currentLines.push(line);
  }
  flushPage();
  if (pages.length === 0) return [{ number: 1, text: rawText.trim() }];
  return normalizePages(pages);
}

export function loadSampleDocuments(repositoryRoot = REPOSITORY_ROOT) {
  const documents = SAMPLE_DOCUMENT_SPECS.map((spec) => {
    const rawText = readFileSync(join(repositoryRoot, spec.sourcePath), "utf8");
    return normalizeDocument({ ...spec, pages: parsePagedText(rawText) });
  });
  return registerDocuments(documents);
}

function normalizeSearchText(text) {
  return text.toLocaleLowerCase("ja-JP").replace(/\s+/gu, " ").trim();
}

function splitPageText(text, maxChars, overlapChars) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(" ", end);
      if (boundary > start) end = boundary;
    }
    const value = text.slice(start, end).trim();
    if (value !== "") chunks.push(value);
    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks;
}

export function chunkDocument(documentInput, options = {}) {
  const document = normalizeDocument(documentInput);
  const maxChars = options.maxChars ?? 280;
  const overlapChars = options.overlapChars ?? 40;
  if (!Number.isInteger(maxChars) || maxChars < 20) {
    throw new RangeError("maxChars must be an integer greater than or equal to 20");
  }
  if (!Number.isInteger(overlapChars) || overlapChars < 0 || overlapChars >= maxChars) {
    throw new RangeError("overlapChars must be an integer from 0 to maxChars - 1");
  }
  const chunks = [];
  for (const page of document.pages) {
    splitPageText(page.text, maxChars, overlapChars).forEach((text, index) => {
      chunks.push(Object.freeze({
        id: document.id + ":p" + page.number + ":c" + (index + 1),
        documentId: document.id,
        filename: document.sourcePath,
        page: page.number,
        text,
        metadata: Object.freeze({
          title: document.title,
          format: document.format,
          visibility: document.visibility,
          normalizedText: normalizeSearchText(text),
          tokens: Object.freeze(normalizeSearchText(text).split(" ").filter(Boolean)),
        }),
      }));
    });
  }
  return Object.freeze(chunks);
}

export function chunkDocuments(documents, options = {}) {
  return Object.freeze(registerDocuments(documents).flatMap((document) => chunkDocument(document, options)));
}

export function assertPublicSampleText(text) {
  if (typeof text !== "string" || SECRET_PATTERN.test(text)) {
    throw new Error("sample text contains a secret-like value");
  }
  return true;
}
