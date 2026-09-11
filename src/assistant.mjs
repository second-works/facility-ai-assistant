import { normalizeSearchText, searchChunks } from "./search.mjs";
import { createLocalLlmAdapter } from "./llm-adapter.mjs";
import { inspectQuestion, SAFETY_REVIEW_ANSWER } from "./safety-guard.mjs";

const NO_QUERY_ANSWER = "質問が入力されていません。設備名や確認したい症状を入力してください。";
const INSUFFICIENT_EVIDENCE_ANSWER = "登録文書から確認できません。推測で補完せず、必要に応じて管理者または専門業者へ確認してください。";
const LLM_FALLBACK_NOTE = "Local LLMは利用できないため、retrieval fallbackを表示しています。";

function freezeSources(sources) {
  return Object.freeze(sources.map((source) => Object.freeze({ ...source })));
}

function buildFallbackAnswer(sources) {
  const evidence = sources
    .map((source) => "- " + source.title + "（" + source.filename + " p." + source.page + "）: " + source.text)
    .join("\n");
  return "retrieval fallback（LLM未接続）: 登録文書で確認できる範囲では、以下の根拠を参照してください。\n" + evidence;
}

export function answerQuestion(chunks, query, options = {}) {
  if (typeof query !== "string") {
    throw new TypeError("query must be a string");
  }

  const normalizedQuery = normalizeSearchText(query);
  const search = searchChunks(chunks, normalizedQuery, options);
  const sources = freezeSources(search.results);

  if (search.status === "NO_QUERY") {
    return Object.freeze({
      status: "NO_QUERY",
      mode: "none",
      query: "",
      answer: NO_QUERY_ANSWER,
      sources: Object.freeze([]),
    });
  }

  if (!inspectQuestion(normalizedQuery).safeForLlm) {
    return Object.freeze({
      status: "SAFETY_REVIEW_REQUIRED",
      mode: "retrieval-fallback",
      query: normalizedQuery,
      answer: SAFETY_REVIEW_ANSWER,
      sources,
    });
  }

  if (search.status === "NO_MATCH") {
    return Object.freeze({
      status: "INSUFFICIENT_EVIDENCE",
      mode: "retrieval-fallback",
      query: normalizedQuery,
      answer: INSUFFICIENT_EVIDENCE_ANSWER,
      sources: Object.freeze([]),
    });
  }

  return Object.freeze({
    status: "ANSWERED",
    mode: "retrieval-fallback",
    query: normalizedQuery,
    answer: buildFallbackAnswer(sources),
    sources,
  });
}

export async function answerQuestionWithLlm(chunks, query, options = {}) {
  const baseResult = answerQuestion(chunks, query, options);
  if (baseResult.status !== "ANSWERED" || (!options.llmAdapter && !options.llm)) {
    return baseResult;
  }

  try {
    const adapter = options.llmAdapter || createLocalLlmAdapter(options.llm);
    const generated = await adapter({
      question: baseResult.query,
      sources: baseResult.sources,
    });

    return Object.freeze({
      ...baseResult,
      mode: generated.mode,
      answer: generated.text,
    });
  } catch (error) {
    return Object.freeze({
      ...baseResult,
      mode: "retrieval-fallback",
      fallbackReason: error?.code || "LLM_ERROR",
      answer: baseResult.answer + "\n\n" + LLM_FALLBACK_NOTE,
    });
  }
}
