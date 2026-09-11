import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertPublicSampleText,
  chunkDocument,
  chunkDocuments,
  loadSampleDocuments,
  normalizeDocument,
  parsePagedText,
  registerDocuments,
} from "../src/documents.mjs";

test("正常: 4つの公開サンプル文書を決定的に読み込める", () => {
  const first = loadSampleDocuments();
  const second = loadSampleDocuments();
  assert.equal(first.length, 4);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((document) => document.id), [
    "hvac-noise-guide", "generator-monthly-inspection", "fire-alarm-inspection", "sample-scope-note",
  ]);
  assert.ok(first.every((document) => document.visibility === "PUBLIC"));
  assert.ok(first.every((document) => document.pages.length >= 1));
});

test("整合性: チャンクは文書・ファイル・ページの出典を保持する", () => {
  const documents = loadSampleDocuments();
  const chunks = chunkDocuments(documents, { maxChars: 120, overlapChars: 15 });
  assert.ok(chunks.length > documents.length);
  for (const chunk of chunks) {
    assert.match(chunk.id, /^[a-z0-9-]+:p\d+:c\d+$/);
    assert.ok(documents.some((document) => document.id === chunk.documentId));
    assert.ok(chunk.filename.startsWith("data/samples/"));
    assert.ok(Number.isInteger(chunk.page) && chunk.page >= 1);
    assert.ok(chunk.text.length <= 120);
    assert.equal(chunk.metadata.normalizedText, chunk.text.toLocaleLowerCase("ja-JP").replace(/\s+/gu, " ").trim());
  }
});

test("境界値: ページごとにチャンク化し、ページ出典を跨がせない", () => {
  const document = normalizeDocument({
    id: "boundary-document", title: "境界値サンプル", format: "txt",
    sourcePath: "data/samples/boundary.txt", visibility: "PUBLIC",
    pages: [
      { number: 1, text: "一ページ目の内容です。ここで区切ります。" },
      { number: 2, text: "二ページ目の内容です。別の出典です。" },
    ],
  });
  const chunks = chunkDocument(document, { maxChars: 20, overlapChars: 0 });
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((chunk) => chunk.page === 1 && chunk.text.includes("一ページ目")));
  assert.ok(chunks.some((chunk) => chunk.page === 2 && chunk.text.includes("二ページ目")));
});

test("異常系: 空文書、不正メタデータ、未対応形式、重複IDを拒否する", () => {
  assert.throws(() => normalizeDocument({}), /id must be a non-empty string/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "csv", sourcePath: "data/samples/bad.csv",
    visibility: "PUBLIC", pages: [{ number: 1, text: "本文" }],
  }), /format must be one of/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "txt", sourcePath: "../secret.txt",
    visibility: "PUBLIC", pages: [{ number: 1, text: "本文" }],
  }), /repository-relative/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "txt", sourcePath: "data/samples/bad.txt",
    visibility: "INTERNAL", pages: [{ number: 1, text: "本文" }],
  }), /visibility must be PUBLIC/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "txt", sourcePath: "data/samples/bad.txt",
    visibility: "PUBLIC", pages: [{ number: 0, text: "本文" }],
  }), /positive integer/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "txt", sourcePath: "data/samples/bad.txt",
    visibility: "PUBLIC", pages: [{ number: 1, text: "" }],
  }), /non-empty string/);
  assert.throws(() => normalizeDocument({
    id: "bad-document", title: "不正", format: "txt", sourcePath: "data/samples/bad.txt",
    visibility: "PUBLIC", pages: [{ number: 2, text: "二ページ目" }, { number: 1, text: "逆順" }],
  }), /ascending order/);
  assert.throws(() => registerDocuments([
    { id: "duplicate-document", title: "重複1", format: "txt", sourcePath: "data/samples/one.txt", visibility: "PUBLIC", pages: [{ number: 1, text: "本文" }] },
    { id: "duplicate-document", title: "重複2", format: "txt", sourcePath: "data/samples/two.txt", visibility: "PUBLIC", pages: [{ number: 1, text: "本文" }] },
  ]), /duplicate document id/);
});

test("値の範囲: チャンクサイズと重複幅の不正値を拒否する", () => {
  const [document] = loadSampleDocuments();
  assert.throws(() => chunkDocument(document, { maxChars: 19 }), /greater than or equal to 20/);
  assert.throws(() => chunkDocument(document, { maxChars: 20, overlapChars: 20 }), /maxChars - 1/);
  assert.throws(() => chunkDocument(document, { maxChars: 20, overlapChars: -1 }), /maxChars - 1/);
});

test("回帰/安全: サンプル文書は公開可能で秘密情報パターンを含まない", () => {
  for (const document of loadSampleDocuments()) {
    for (const page of document.pages) {
      assert.equal(document.visibility, "PUBLIC");
      assert.doesNotThrow(() => assertPublicSampleText(page.text));
    }
  }
});

test("parsePagedTextはページマーカー付き本文のページ境界を保持する", () => {
  assert.deepEqual(parsePagedText("--- page: 1 ---\n一ページ目\n--- page: 2 ---\n二ページ目"), [
    { number: 1, text: "一ページ目" }, { number: 2, text: "二ページ目" },
  ]);
});
