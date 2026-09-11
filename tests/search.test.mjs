import assert from "node:assert/strict";
import { test } from "node:test";

import { chunkDocuments, loadSampleDocuments } from "../src/documents.mjs";
import { normalizeSearchText, searchChunks, tokenizeSearchText } from "../src/search.mjs";

function createChunk(id, text, page = 1) {
  return {
    id,
    documentId: "test-document",
    filename: "data/samples/test.txt",
    page,
    text,
    metadata: { title: "テスト文書" },
  };
}

test("正常: 施設設備の質問から関連チャンクと出典を返す", () => {
  const chunks = chunkDocuments(loadSampleDocuments(), { maxChars: 180, overlapChars: 20 });
  const result = searchChunks(chunks, "空調の異音", { topK: 3, threshold: 0.2 });

  assert.equal(result.status, "FOUND");
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].documentId, "hvac-noise-guide");
  assert.equal(result.results[0].page, 1);
  assert.match(result.results[0].filename, /hvac-noise-guide\.txt$/);
  assert.ok(result.results[0].text.includes("異音"));
  assert.ok(result.results.every((item) => item.score >= 0.2 && item.score <= 1));
});

test("整合性: 正規化と検索結果の出典フィールドが安定する", () => {
  const chunks = chunkDocuments(loadSampleDocuments(), { maxChars: 180, overlapChars: 20 });
  const query = " 発電機　月例点検 ";
  const first = searchChunks(chunks, query, { topK: 5, threshold: 0 });
  const second = searchChunks(chunks, query, { topK: 5, threshold: 0 });

  assert.deepEqual(first, second);
  assert.equal(first.query, normalizeSearchText(query));
  assert.ok(first.results.some((item) => item.documentId === "generator-monthly-inspection"));
  for (const item of first.results) {
    assert.equal(typeof item.chunkId, "string");
    assert.equal(typeof item.title, "string");
    assert.equal(typeof item.text, "string");
    assert.ok(Number.isInteger(item.page) && item.page >= 1);
  }
});

test("値の範囲: Top Kで返却件数を制限する", () => {
  const chunks = [
    createChunk("chunk-b", "空調 異音"),
    createChunk("chunk-a", "空調 異音"),
    createChunk("chunk-c", "空調"),
  ];
  const result = searchChunks(chunks, "空調", { topK: 2, threshold: 0 });
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.results.map((item) => item.chunkId), ["chunk-a", "chunk-b"]);
  assert.throws(() => searchChunks(chunks, "空調", { topK: 0 }), /positive integer/);
  assert.throws(() => searchChunks(chunks, "空調", { topK: 1.5 }), /positive integer/);
});

test("境界値: 閾値ちょうどを含め、閾値未満を除外する", () => {
  const chunks = [
    createChunk("chunk-full", "空調 異音"),
    createChunk("chunk-half", "空調"),
    createChunk("chunk-none", "発電機"),
  ];
  const atBoundary = searchChunks(chunks, "空調 異音", { topK: 5, threshold: 0.5 });
  assert.deepEqual(atBoundary.results.map((item) => item.chunkId), ["chunk-full", "chunk-half"]);
  assert.equal(atBoundary.results[1].score, 0.5);
  const aboveBoundary = searchChunks(chunks, "空調 異音", { topK: 5, threshold: 0.500001 });
  assert.deepEqual(aboveBoundary.results.map((item) => item.chunkId), ["chunk-full"]);
});

test("異常系: 空質問、未該当、不正な閾値、壊れたチャンクを明示的に扱う", () => {
  const chunks = [createChunk("chunk-a", "空調 異音")];
  assert.equal(searchChunks(chunks, "   ").status, "NO_QUERY");
  assert.deepEqual(searchChunks(chunks, "法定耐用年数", { threshold: 0.2 }).results, []);
  assert.equal(searchChunks(chunks, "法定耐用年数", { threshold: 0.2 }).status, "NO_MATCH");
  assert.throws(() => searchChunks(chunks, "空調", { threshold: -0.1 }), /number from 0 to 1/);
  assert.throws(() => searchChunks(chunks, "空調", { threshold: 1.1 }), /number from 0 to 1/);
  assert.throws(() => searchChunks([createChunk("bad", "")], "空調"), /non-empty string/);
  assert.throws(() => searchChunks(null, "空調"), /array/);
});

test("回帰: 同点結果はチャンクID順で決定的に並ぶ", () => {
  const chunks = [
    createChunk("z-chunk", "消防設備"),
    createChunk("a-chunk", "消防設備"),
    createChunk("m-chunk", "消防設備"),
  ];
  const result = searchChunks(chunks, "消防設備", { topK: 5, threshold: 1 });
  assert.deepEqual(result.results.map((item) => item.chunkId), ["a-chunk", "m-chunk", "z-chunk"]);
});

test("検索トークン: 日本語の連続文字列と空白区切り語を比較可能にする", () => {
  assert.deepEqual(tokenizeSearchText("空調 異音"), ["空調", "異音"]);
  assert.ok(tokenizeSearchText("非常用発電機").includes("発電"));
});
