import assert from "node:assert/strict";
import { test } from "node:test";

import { chunkDocuments, loadSampleDocuments } from "../src/documents.mjs";
import { answerQuestion } from "../src/assistant.mjs";

function createFixture() {
  return chunkDocuments(loadSampleDocuments(), { maxChars: 180, overlapChars: 20 });
}

test("正常: 根拠ありの質問をretrieval fallbackとして返す", () => {
  const result = answerQuestion(createFixture(), "空調の異音", { topK: 3, threshold: 0.2 });

  assert.equal(result.status, "ANSWERED");
  assert.equal(result.mode, "retrieval-fallback");
  assert.equal(result.query, "空調の異音");
  assert.ok(result.sources.length > 0);
  assert.ok(result.answer.includes("retrieval fallback"));
  assert.ok(result.answer.includes(result.sources[0].title));
  assert.ok(result.answer.includes("p." + result.sources[0].page));
  assert.ok(result.answer.includes(result.sources[0].text));
});

test("整合性: fallback回答のsourcesは検索結果と同じ出典を保持する", () => {
  const fixture = createFixture();
  const result = answerQuestion(fixture, "発電機 月例点検", { topK: 2, threshold: 0 });

  assert.equal(result.status, "ANSWERED");
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].documentId, "generator-monthly-inspection");
  assert.equal(result.sources[0].filename, "data/samples/generator-monthly-inspection.txt");
  assert.ok(result.sources.every((source) => result.answer === undefined));
  assert.ok(result.answer.includes("非常用発電機 月例点検基準"));
});

test("境界値: 根拠なしは推測せずINSUFFICIENT_EVIDENCEを返す", () => {
  const result = answerQuestion(createFixture(), "文書にない製品の法定耐用年数", { threshold: 0.2 });

  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.mode, "retrieval-fallback");
  assert.deepEqual(result.sources, []);
  assert.match(result.answer, /登録文書から確認できません/);
  assert.doesNotMatch(result.answer, /年数は/);
});

test("異常系: 空質問をNO_QUERYとして返す", () => {
  const result = answerQuestion(createFixture(), "   ");

  assert.equal(result.status, "NO_QUERY");
  assert.equal(result.mode, "none");
  assert.equal(result.query, "");
  assert.deepEqual(result.sources, []);
  assert.match(result.answer, /質問が入力されていません/);
});

test("安全境界: 危険作業・法令判断は操作手順を返さない", () => {
  const result = answerQuestion(createFixture(), "電気盤のカバーを開けて修理する方法");

  assert.equal(result.status, "SAFETY_REVIEW_REQUIRED");
  assert.equal(result.mode, "retrieval-fallback");
  assert.match(result.answer, /有資格者または専門業者/);
  assert.doesNotMatch(result.answer, /カバーを開けて修理/);
  assert.doesNotMatch(result.answer, /原因は/);
});

test("安全境界: 法令・資格に関する質問は最終判断を返さない", () => {
  const result = answerQuestion(createFixture(), "この設備は法令に適合し資格不要ですか？");

  assert.equal(result.status, "SAFETY_REVIEW_REQUIRED");
  assert.match(result.answer, /法令判断/);
  assert.match(result.answer, /管理者/);
});

test("回帰: 検索入力の不正状態を握りつぶさない", () => {
  assert.throws(() => answerQuestion([], null), /query must be a string/);
  assert.throws(() => answerQuestion(null, "空調"), /chunks must be an array/);
  assert.throws(() => answerQuestion([{ id: "broken" }], "空調"), /documentId/);
});
