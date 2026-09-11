import { normalizeSearchText, searchChunks } from "./search.mjs";

const SAFETY_PATTERN = /(電気|高所|火気|圧力|回転体|分解|修理|カバーを開|配線|感電|火災|煙|緊急|法令|法定|資格|耐用年数|適合)/u;

const NO_QUERY_ANSWER = "質問が入力されていません。設備名や確認したい症状を入力してください。";
const INSUFFICIENT_EVIDENCE_ANSWER = "登録文書から確認できません。推測で補完せず、必要に応じて管理者または専門業者へ確認してください。";
const SAFETY_REVIEW_ANSWER = "この質問はAIだけで安全に判断できません。設備の操作・危険作業・法令判断は行わず、現場の正式手順、管理者、有資格者または専門業者へ確認してください。";

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

  if (SAFETY_PATTERN.test(normalizedQuery)) {
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
