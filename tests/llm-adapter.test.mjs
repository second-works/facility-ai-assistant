import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createLocalLlmAdapter,
  isLocalLlmError,
} from "../src/llm-adapter.mjs";

function requestInput() {
  return {
    question: "空調の異音",
    sources: [{
      title: "空調ガイド",
      filename: "data/samples/hvac.txt",
      page: 1,
      text: "異音を確認したら管理者へ報告する。",
    }],
  };
}

test("正常: OpenAI互換レスポンスから生成本文を取得する", async () => {
  let request;
  const adapter = createLocalLlmAdapter({
    endpoint: "http://127.0.0.1:8080/",
    apiKey: "synthetic-test-key",
    model: "gemma-test",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "確認項目を整理します。" } }] }),
      };
    },
  });

  const result = await adapter(requestInput());
  const payload = JSON.parse(request.options.body);

  assert.equal(request.url, "http://127.0.0.1:8080/v1/chat/completions");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer synthetic-test-key");
  assert.equal(payload.model, "gemma-test");
  assert.deepEqual(payload.messages.map((message) => message.role), ["system", "user"]);
  assert.match(payload.messages[1].content, /空調の異音/);
  assert.match(payload.messages[1].content, /空調ガイド/);
  assert.doesNotMatch(payload.messages[0].content, /空調ガイド/);
  assert.equal(result.mode, "local-llm");
  assert.equal(result.text, "確認項目を整理します。");
});

test("整合性: endpoint末尾slashを正規化し、LLM設定をbodyへ反映する", async () => {
  let payload;
  const adapter = createLocalLlmAdapter({
    endpoint: "http://localhost:8080/v1",
    apiKey: "synthetic-test-key",
    maxTokens: 128,
    temperature: 0,
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
    },
  });

  await adapter(requestInput());

  assert.equal(payload.max_tokens, 128);
  assert.equal(payload.temperature, 0);
  assert.equal(payload.messages[0].role, "system");
  assert.equal(payload.messages[1].role, "user");
});

test("安全境界: 未設定時はネットワークを呼ばず明示的に未設定を返す", async () => {
  let called = false;
  const adapter = createLocalLlmAdapter({
    fetchImpl: async () => {
      called = true;
    },
  });

  await assert.rejects(adapter(requestInput()), (error) => isLocalLlmError(error, "NOT_CONFIGURED"));
  assert.equal(called, false);
});

test("安全境界: loopback以外のendpointとURL資格情報を拒否する", () => {
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "https://example.com", apiKey: "synthetic-test-key" }),
    (error) => isLocalLlmError(error, "ENDPOINT_NOT_ALLOWED"),
  );
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "http://user:pass@127.0.0.1:8080", apiKey: "synthetic-test-key" }),
    (error) => isLocalLlmError(error, "INVALID_ENDPOINT"),
  );
});

test("値の範囲: timeout、token、temperature、APIキーの設定値を検証する", () => {
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "http://127.0.0.1:8080", apiKey: "x", timeoutMs: 99 }),
    (error) => isLocalLlmError(error, "INVALID_CONFIG"),
  );
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "http://127.0.0.1:8080", apiKey: "x", maxTokens: 0 }),
    (error) => isLocalLlmError(error, "INVALID_CONFIG"),
  );
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "http://127.0.0.1:8080", apiKey: "x", temperature: 3 }),
    (error) => isLocalLlmError(error, "INVALID_CONFIG"),
  );
  assert.throws(
    () => createLocalLlmAdapter({ endpoint: "http://127.0.0.1:8080" }),
    (error) => isLocalLlmError(error, "API_KEY_REQUIRED"),
  );
});

test("異常系: HTTPエラー、JSON不正、schema不正、空応答を分類する", async () => {
  const cases = [
    [{ ok: false, status: 503, json: async () => ({}) }, "HTTP_ERROR"],
    [{ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } }, "INVALID_JSON"],
    [{ ok: true, status: 200, json: async () => ({ choices: [] }) }, "INVALID_RESPONSE"],
    [{ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: " " } }] }) }, "EMPTY_RESPONSE"],
  ];

  for (const [response, code] of cases) {
    const adapter = createLocalLlmAdapter({
      endpoint: "http://127.0.0.1:8080",
      apiKey: "synthetic-test-key",
      fetchImpl: async () => response,
    });
    await assert.rejects(adapter(requestInput()), (error) => isLocalLlmError(error, code));
  }
});

test("異常系: fetch例外とtimeoutを分類する", async () => {
  const networkAdapter = createLocalLlmAdapter({
    endpoint: "http://127.0.0.1:8080",
    apiKey: "synthetic-test-key",
    fetchImpl: async () => {
      throw new Error("transport failed");
    },
  });
  await assert.rejects(networkAdapter(requestInput()), (error) => isLocalLlmError(error, "NETWORK_ERROR"));

  const timeoutAdapter = createLocalLlmAdapter({
    endpoint: "http://127.0.0.1:8080",
    apiKey: "synthetic-test-key",
    timeoutMs: 100,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }),
  });
  await assert.rejects(timeoutAdapter(requestInput()), (error) => isLocalLlmError(error, "TIMEOUT"));
});

test("回帰: APIキーをエラーへ含めない", async () => {
  const secret = "synthetic-secret-that-must-not-leak";
  const adapter = createLocalLlmAdapter({
    endpoint: "http://127.0.0.1:8080",
    apiKey: secret,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: secret }) }),
  });

  await assert.rejects(adapter(requestInput()), (error) => {
    assert.equal(error.code, "HTTP_ERROR");
    assert.doesNotMatch(error.message, new RegExp(secret));
    return true;
  });
});
