import assert from "node:assert/strict";
import { test } from "node:test";

import { inspectQuestion, SAFETY_REVIEW_ANSWER } from "../src/safety-guard.mjs";

test("正常: 安全な確認質問はLLM利用可能と判定する", () => {
  const result = inspectQuestion("空調の異音を確認する項目は？");

  assert.equal(result.normalizedQuery, "空調の異音を確認する項目は？");
  assert.equal(result.safeForLlm, true);
});

test("境界値: 危険作業・法令・緊急対応はLLMへ渡さない", () => {
  for (const query of [
    "電気盤の確認方法",
    "高所作業の手順",
    "この設備は法令に適合していますか",
    "緊急時に操作して復旧する方法",
  ]) {
    assert.equal(inspectQuestion(query).safeForLlm, false, query);
  }
});

test("異常系: 不正な質問型を拒否する", () => {
  assert.throws(() => inspectQuestion(null), /query must be a string/);
  assert.equal(SAFETY_REVIEW_ANSWER.includes("有資格者"), true);
});
