import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(root + path, "utf8");

test("正常: UIに質問入力、状態、回答、出典の主要導線がある", () => {
  const html = read("/web/index.html");
  assert.match(html, /id="ask-form"/);
  assert.match(html, /id="question"/);
  assert.match(html, /id="ask-button"/);
  assert.match(html, /id="status"/);
  assert.match(html, /id="answer"/);
  assert.match(html, /id="sources-list"/);
  assert.match(html, /安全上の注意/);
  assert.match(html, /type="module" src="\.\/app\.mjs"/);
});

test("整合性: UIは質問サービスと公開デモデータを接続する", () => {
  const app = read("/web/app.mjs");
  const data = read("/web/demo-data.mjs");
  assert.match(app, /answerQuestion/);
  assert.match(app, /DEMO_CHUNKS/);
  assert.match(app, /retrieval-fallback|statusLabel/);
  assert.match(data, /hvac-noise-guide/);
  assert.match(data, /generator-monthly-inspection/);
  assert.match(data, /fire-alarm-inspection/);
  assert.match(data, /visibility/);
});

test("安全境界: 外部入力と出典をHTMLとして解釈しない", () => {
  const app = read("/web/app.mjs");
  assert.match(app, /textContent/);
  assert.doesNotMatch(app, /innerHTML/);
  assert.match(app, /LLM未接続/);
});

test("境界値: 4つの回答状態を表示ラベルへ対応付ける", () => {
  const app = read("/web/app.mjs");
  for (const status of ["ANSWERED", "INSUFFICIENT_EVIDENCE", "NO_QUERY", "SAFETY_REVIEW_REQUIRED"]) {
    assert.match(app, new RegExp(status));
  }
});

test("レスポンシブ: 小さい幅で主要領域を折り返すCSS契約がある", () => {
  const css = read("/web/styles.css");
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /width:\s*min\(100%/);
  assert.match(css, /question-row[\s\S]*?flex-direction:\s*column/);
});

test("回帰: 未接続LLMと本番機密データをデモへ持ち込まない", () => {
  const html = read("/web/index.html");
  const data = read("/web/demo-data.mjs");
  assert.match(html, /実Gemma・本番文書・設備操作は未接続/);
  assert.doesNotMatch(data, /ghp_|github_pat_|sk-|AKIA/);
});
