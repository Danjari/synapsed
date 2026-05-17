# Synapsed

Synapsed is a Next.js learning platform with:

- AI chat tutoring with class-grounded retrieval
- in-chat assessments
- visual lesson generation (Excalidraw)
- realtime voice mode with shared memory

## Prerequisites

- Node.js 20+ (recommended)
- npm
- Access to required third-party services (OpenAI, Anthropic, Gemini, MongoDB, etc.)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file from the template:

```bash
cp .env.example .env
```

3. Fill all required values in `.env`.

4. Start the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Use `.env.example` as the source of truth for expected keys.

Key groups:

- **AI providers**: OpenAI, Anthropic, Gemini, Mistral
- **Auth/session**: NextAuth + Google OAuth
- **Data/storage**: MongoDB, Pinecone, Supabase, Cloudflare R2
- **App runtime**: base URL and provider selection flags

### Required vs Optional

Minimum for local sign-in + baseline app startup:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_BASE_URL`

Minimum for text tutoring agent (recommended baseline):

- `GEMINI_API_KEY`
- `GEMINI_AGENT_MODEL`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_AI_PROVIDER`

Needed for voice mode (realtime):

- `OPENAI_API_KEY`

Needed for visual Excalidraw lessons:

- `ANTHROPIC_API_KEY`

Needed for class-grounded retrieval (RAG):

- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_ENVIRONMENT` (if your Pinecone setup requires it)

Needed for file/object storage features:

- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_URL`

Optional integrations (feature-specific):

- `MISTRAL_API_KEY`
- `THINKIFIC_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

## Scripts

- `npm run dev`: start local development server
- `npm run build`: prisma generate + production build
- `npm run start`: run built app
- `npm run lint`: run lint checks

## Notes For First-Time Setup

- If you see runtime chunk/module errors in dev (for example missing files in `.next/server`), clear cache:

```bash
rm -rf .next
npm run dev
```

- If issues persist, run a deeper reset:

```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Documentation Map

- Agent architecture and multimodal flow: `lib/agent/README.md`
- Agent quick operational guide: `AGENT_QUICKSTART.md`
- In-chat assessment details: `inChatAssessment.md`
- Survey system details: `SURVEY_SYSTEM_README.md`
- Additional product/implementation notes:
  - `IMPLEMENTATION_SUMMARY.md`
  - `MEMORY_MANAGEMENT_DRAWBACKS.md`
  - `PROFESSOR_ANALYTICS_FEATURES.md`
  - `PROFESSOR_ASSESSMENT_DASHBOARD_PRD.md`

## Tech Stack (High Level)

- Next.js App Router
- React + TypeScript
- Prisma + MongoDB
- LangGraph + Gemini (agent orchestration)
- OpenAI Realtime (voice transport)
- Anthropic + Excalidraw MCP (visual lessons)
