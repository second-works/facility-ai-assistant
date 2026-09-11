const CJK_RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u30fc]+/gu;

export function normalizeSearchText(value) {
  if (typeof value !== "string") {
    throw new TypeError("search text must be a string");
  }
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/gu, " ").trim();
}

export function tokenizeSearchText(value) {
  const normalized = normalizeSearchText(value);
  const tokens = new Set(normalized.split(" ").filter(Boolean));

  for (const match of normalized.matchAll(CJK_RUN)) {
    const run = match[0];
    for (let index = 0; index < run.length - 1; index += 1) {
      tokens.add(run.slice(index, index + 2));
    }
  }

  return [...tokens];
}

function validateOptions(options) {
  const topK = options.topK ?? 5;
  const threshold = options.threshold ?? 0.15;

  if (!Number.isInteger(topK) || topK < 1) {
    throw new RangeError("topK must be a positive integer");
  }
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new RangeError("threshold must be a number from 0 to 1");
  }
  return { topK, threshold };
}

function validateChunk(chunk, index) {
  if (!chunk || typeof chunk !== "object") {
    throw new TypeError("chunks[" + index + "] must be an object");
  }
  if (typeof chunk.id !== "string" || chunk.id.trim() === "") {
    throw new TypeError("chunks[" + index + "].id must be a non-empty string");
  }
  if (typeof chunk.documentId !== "string" || chunk.documentId.trim() === "") {
    throw new TypeError("chunks[" + index + "].documentId must be a non-empty string");
  }
  if (typeof chunk.filename !== "string" || chunk.filename.trim() === "") {
    throw new TypeError("chunks[" + index + "].filename must be a non-empty string");
  }
  if (!Number.isInteger(chunk.page) || chunk.page < 1) {
    throw new RangeError("chunks[" + index + "].page must be a positive integer");
  }
  if (typeof chunk.text !== "string" || chunk.text.trim() === "") {
    throw new TypeError("chunks[" + index + "].text must be a non-empty string");
  }
  if (!chunk.metadata || typeof chunk.metadata.title !== "string" || chunk.metadata.title.trim() === "") {
    throw new TypeError("chunks[" + index + "].metadata.title must be a non-empty string");
  }
}

function scoreChunk(queryText, chunk) {
  const normalizedChunk = normalizeSearchText(chunk.text);
  const queryTerms = tokenizeSearchText(queryText);
  if (normalizedChunk.includes(queryText)) {
    return 1;
  }
  const chunkTerms = new Set(tokenizeSearchText(chunk.text));
  const matchedTerms = queryTerms.filter((term) => chunkTerms.has(term));
  return Number((matchedTerms.length / queryTerms.length).toFixed(6));
}

export function searchChunks(chunks, query, options = {}) {
  if (!Array.isArray(chunks)) {
    throw new TypeError("chunks must be an array");
  }
  chunks.forEach(validateChunk);
  const { topK, threshold } = validateOptions(options);
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery === "") {
    return Object.freeze({
      status: "NO_QUERY",
      query: "",
      topK,
      threshold,
      results: Object.freeze([]),
    });
  }

  const results = chunks
    .map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      title: chunk.metadata.title,
      filename: chunk.filename,
      page: chunk.page,
      text: chunk.text,
      score: scoreChunk(normalizedQuery, chunk),
    }))
    .filter((result) => result.score >= threshold)
    .sort((left, right) => right.score - left.score || left.chunkId.localeCompare(right.chunkId))
    .slice(0, topK)
    .map((result) => Object.freeze(result));

  return Object.freeze({
    status: results.length > 0 ? "FOUND" : "NO_MATCH",
    query: normalizedQuery,
    topK,
    threshold,
    results: Object.freeze(results),
  });
}
