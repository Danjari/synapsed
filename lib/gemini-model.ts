/**
 * Default Gemini model for most API routes (`@google/genai` direct calls).
 * Set `GEMINI_MODEL` in the environment to override.
 *
 * @see https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";

/**
 * Model for LangGraph + `@langchain/google-genai` tool calling (`simple-agent`).
 *
 * Gemini 3 models require each `functionCall` part in history to include a
 * `thoughtSignature` from the prior model response. LangChain currently rebuilds
 * tool calls without that field, which causes HTTP 400. Use a 2.5 Flash model
 * here until LangChain preserves thought signatures (or the agent is migrated
 * to the official SDK with full response parts).
 *
 * @see https://ai.google.dev/gemini-api/docs/thought-signatures
 */
export const GEMINI_AGENT_MODEL =
  process.env.GEMINI_AGENT_MODEL?.trim() || "gemini-2.5-flash";
