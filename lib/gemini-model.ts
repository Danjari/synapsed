/**
 * Gemini model id for `generateContent` and LangChain Google integrations.
 * Set `GEMINI_MODEL` in the environment to override (e.g. `gemini-2.5-flash`).
 * Default: Gemini 3 Flash (preview).
 *
 * @see https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";
