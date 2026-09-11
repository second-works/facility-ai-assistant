import { answerQuestion } from "../src/assistant.mjs";
import { DEMO_CHUNKS } from "./demo-data.mjs";

export function renderResult(result, nodes) {
  nodes.status.textContent = statusLabel(result.status);
  nodes.status.dataset.status = result.status;
  nodes.status.className = "status status--" + result.status.toLowerCase();
  nodes.answer.textContent = result.answer;
  nodes.sources.replaceChildren();

  if (result.sources.length === 0) {
    const empty = nodes.document.createElement("li");
    empty.className = "source-empty";
    empty.textContent = "出典はありません。登録文書から確認できる根拠がない状態です。";
    nodes.sources.append(empty);
    return;
  }

  for (const source of result.sources) {
    const item = nodes.document.createElement("li");
    item.className = "source-card";

    const title = nodes.document.createElement("strong");
    title.textContent = source.title;

    const location = nodes.document.createElement("span");
    location.textContent = source.filename + " / p." + source.page;

    const evidence = nodes.document.createElement("p");
    evidence.textContent = source.text;

    item.append(title, location, evidence);
    nodes.sources.append(item);
  }
}

function statusLabel(status) {
  const labels = {
    ANSWERED: "根拠あり / fallback",
    INSUFFICIENT_EVIDENCE: "根拠不足",
    NO_QUERY: "入力待ち",
    SAFETY_REVIEW_REQUIRED: "安全確認が必要",
  };
  return labels[status] || "状態不明";
}

function initialize() {
  const form = document.querySelector("#ask-form");
  const question = document.querySelector("#question");
  const button = document.querySelector("#ask-button");
  const nodes = {
    document,
    status: document.querySelector("#status"),
    answer: document.querySelector("#answer"),
    sources: document.querySelector("#sources-list"),
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "検索中…";

    try {
      const result = answerQuestion(DEMO_CHUNKS, question.value, { topK: 3, threshold: 0.2 });
      renderResult(result, nodes);
    } finally {
      button.disabled = false;
      button.textContent = "検索する";
    }
  });

  document.querySelectorAll("[data-query]").forEach((sample) => {
    sample.addEventListener("click", () => {
      question.value = sample.dataset.query || "";
      question.focus();
    });
  });
}

if (typeof document !== "undefined") {
  initialize();
}
