import { normalizeSearchText } from "./search.mjs";

const SAFETY_PATTERN = /(電気|高所|火気|圧力|回転体|分解|修理|カバーを開|配線|感電|火災|煙|緊急|法令|法定|資格|耐用年数|適合)/u;

export const SAFETY_REVIEW_ANSWER =
  "この質問はAIだけで安全に判断できません。設備の操作・危険作業・法令判断は行わず、現場の正式手順、管理者、有資格者または専門業者へ確認してください。";

export function inspectQuestion(question) {
  if (typeof question !== "string") {
    throw new TypeError("query must be a string");
  }

  const normalized = normalizeSearchText(question);
  return Object.freeze({
    normalizedQuery: normalized,
    safeForLlm: !SAFETY_PATTERN.test(normalized),
  });
}
