# AI Assistant

An AI-powered preparation chatbot with real-time speech transcription. Built with Next.js 15, Vercel AI SDK, and Azure Speech Services.

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#project-structure"><strong>Project Structure</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy</strong></a>
</p>

---

## Features

### AI Chat Engine
- **Streaming responses** via Vercel AI SDK (`streamText`) with multi-step tool use (`maxSteps: 5`)
- **Switchable AI models** — o3-mini (default), gpt-4o-mini, gpt-3.5-turbo
- **Customizable system prompt** with structured response formats
- **Customizable settings** — change model and system prompt on the fly via a settings dialog (persisted in `localStorage`)
- **Tool calling** — built-in `getWeather` tool with rendered weather card UI

### Live Speech Transcription
- **Azure Speech-to-Text** integration using Microsoft Cognitive Services SDK
- **Real-time continuous recognition** with interim (in-progress) and finalized results
- **Dual audio source** — microphone input or system audio capture
- **Send-to-chat** — one-click injection of transcript into the AI chat via custom DOM events
- **Resizable split layout** — draggable divider between chat and transcript panels

### Chat Persistence & History
- **Vercel Postgres (Neon)** database with Drizzle ORM for chat and user storage
- **Auto-save on completion** — chats saved after each AI response finishes
- **Sidebar history** — browse, select, and delete past conversations (fetched via SWR)
- **URL-based routing** — each chat has a unique UUID route (`/chat/[id]`)

### Authentication
- **NextAuth.js v5** with Credentials provider (email + bcrypt-hashed password)
- **Registration flow** with automatic sign-in
- **Skip login** — temporary guest sessions for quick access
- **Route protection** — middleware guards chat routes, redirects unauthenticated users

### File Uploads
- **Multimodal input** — attach images (JPEG, PNG) and PDFs (max 5 MB)
- **Vercel Blob storage** for uploaded files
- **Clipboard paste** support for images

### UI / UX
- **Dark / light theme** toggle via `next-themes`
- **Markdown rendering** with syntax highlighting (`react-markdown`, `react-syntax-highlighter`, `remark-gfm`)
- **Scroll-to-bottom** button for long conversations
- **Toast notifications** via Sonner
- **Animated transitions** with Framer Motion
- **Responsive design** with Tailwind CSS and shadcn/ui (Radix UI primitives)

---

## Architecture 

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                           │
│                                                                     │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐   │
│  │         Chat Panel           │  │    Live Transcript Panel   │   │
│  │                              │  │                            │   │
│  │  ┌────────────────────────┐  │  │  Azure Speech-to-Text SDK  │   │
│  │  │   Message List         │  │  │  ┌──────────────────────┐  │   │
│  │  │   (Markdown + Tools)   │  │  │  │ Mic / System Audio   │  │   │
│  │  └────────────────────────┘  │  │  └──────────┬───────────┘  │   │
│  │  ┌────────────────────────┐  │  │             │              │   │
│  │  │  Multimodal Input      │  │  │  Real-time transcript      │   │
│  │  │  (Text + File Upload)  │  │  │             │              │   │
│  │  └────────────┬───────────┘  │  │  ┌──────────▼───────────┐  │   │
│  │               │              │◄─┼──┤  "Send to Chat" btn  │  │   │
│  └───────────────┼──────────────┘  │  └──────────────────────┘  │   │
│                  │    ▲            └────────────────────────────┘   │
│   ┌──────────────┼────┼───────────────────────────────────────┐     │
│   │   Navbar:  History│ Theme Toggle │ Model Settings │ Auth  │     │
│   └──────────────┼────┼───────────────────────────────────────┘     │
└──────────────────┼────┼─────────────────────────────────────────────┘
                   │    │  useChat() SSE stream
                   ▼    │
┌──────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER (App Router)                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      API Routes                             │ │
│  │                                                             │ │
│  │  POST /api/chat ──────► streamText() ──► OpenAI API         │ │
│  │    • model selection     (AI SDK)        (o3-mini / 4o-mini │ │
│  │    • system prompt                        / 3.5-turbo)      │ │
│  │    • tool execution                                         │ │
│  │    • onFinish → save                                        │ │
│  │                                                             │ │
│  │  DELETE /api/chat ────► deleteChatById()                    │ │
│  │  GET /api/history ────► getChatsByUserId()                  │ │
│  │  POST /api/files/upload → Vercel Blob                       │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────┼───────────────────────────────┐ │
│  │              Auth (NextAuth.js v5)                          │ │
│  │                                                             │ │
│  │  Middleware ── route protection ── JWT sessions             │ │
│  │  Credentials provider ── bcrypt password hashing            │ │
│  │  Server Actions: login / register / skipLogin / signOut     │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│                                                                  │
│  ┌────────────────────┐    ┌─────────────────────────────────┐   │
│  │  Vercel Postgres   │    │  Vercel Blob                    │   │
│  │  (Neon)            │    │                                 │   │
│  │                    │    │  Uploaded files                 │   │
│  │  ┌──────────────┐  │    │  (images, PDFs)                 │   │
│  │  │ User         │  │    └─────────────────────────────────┘   │
│  │  │  id (uuid)   │  │                                          │
│  │  │  email       │  │    ┌─────────────────────────────────┐   │
│  │  │  password    │  │    │  OpenAI API                     │   │
│  │  ├──────────────┤  │    │  LLM inference                  │   │
│  │  │ Chat         │  │    └─────────────────────────────────┘   │
│  │  │  id (uuid)   │  │                                          │
│  │  │  createdAt   │  │    ┌─────────────────────────────────┐   │
│  │  │  messages    │  │    │  Azure Speech Services          │   │
│  │  │  userId (FK) │  │    │  Real-time speech-to-text       │   │
│  │  └──────────────┘  │    └─────────────────────────────────┘   │
│  │                    │                                          │
│  │  Drizzle ORM       │                                          │
│  └────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User types or speaks** → input goes to the Chat component (text) or LiveTranscript (speech)
2. **LiveTranscript** converts speech to text via Azure SDK, user clicks "Send" to dispatch a `transcript-message` custom event
3. **Chat component** receives the event via `window.addEventListener`, calls `append()` to add the message
4. **`useChat` hook** sends a POST to `/api/chat` with messages, model ID, and system prompt
5. **Server route** selects the OpenAI model, runs `streamText()` with tools, streams SSE response back
6. **On completion**, the full conversation is upserted to Postgres via Drizzle ORM
7. **History sidebar** fetches saved chats via SWR from `/api/history`

---

## Tech Stack

| Layer | Technology |
|-------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript |
| **AI** | Vercel AI SDK 3.4, `@ai-sdk/openai` |
| **Speech** | Microsoft Cognitive Services Speech SDK |
| **Database** | Vercel Postgres (Neon) + Drizzle ORM |
| **File Storage** | Vercel Blob |
| **Auth** | NextAuth.js v5 (Credentials provider, bcrypt) |
| **UI** | React 19 RC, Tailwind CSS, shadcn/ui (Radix UI) |
| **State** | SWR (data fetching), localStorage (settings) |
| **Rendering** | react-markdown, react-syntax-highlighter, remark-gfm |
| **Animation** | Framer Motion |

---

## Project Structure

```
ai-multi-agent/
├── ai/
│   ├── index.ts                 # Default model config & system prompt
│   └── custom-middleware.ts     # AI SDK language model middleware
├── app/
│   ├── (auth)/                  # Auth route group
│   │   ├── actions.ts           # Server actions (login, register, skip, signOut)
│   │   ├── auth.ts              # NextAuth config (Credentials provider)
│   │   ├── auth.config.ts       # Auth callbacks & route guards
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (chat)/                  # Chat route group
│   │   ├── page.tsx             # New chat entry (generates UUID)
│   │   ├── chat/[id]/
│   │   │   ├── page.tsx         # Load existing chat from DB
│   │   │   └── resizable-layout.tsx  # Split: Chat + LiveTranscript
│   │   └── api/
│   │       ├── chat/route.ts    # POST (stream) / DELETE
│   │       ├── history/route.ts # GET chat list
│   │       └── files/upload/route.ts  # POST file → Blob
│   ├── globals.css
│   └── layout.tsx               # Root layout with Navbar + ThemeProvider
├── components/
│   ├── custom/                  # App-specific components
│   │   ├── chat.tsx             # Main chat UI with useChat hook
│   │   ├── live-transcript.tsx  # Azure Speech-to-Text panel
│   │   ├── model-setting.tsx    # Model & system prompt settings dialog
│   │   ├── multimodal-input.tsx # Text input + file attachments
│   │   ├── message.tsx          # Single message renderer
│   │   ├── markdown.tsx         # Markdown renderer
│   │   ├── history.tsx          # Sidebar chat history
│   │   ├── overview.tsx         # Empty-state welcome screen
│   │   └── weather.tsx          # Weather tool result card
│   └── ui/                     # shadcn/ui primitives
├── db/
│   ├── schema.ts               # Drizzle schema (User, Chat tables)
│   ├── queries.ts              # DB query functions (CRUD)
│   └── migrate.ts              # Migration runner
├── lib/
│   ├── drizzle/                # Generated SQL migrations
│   └── utils.ts                # Utility functions (cn)
├── middleware.ts               # NextAuth route protection
├── drizzle.config.ts           # Drizzle Kit config
├── tailwind.config.ts
└── package.json
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- pnpm
- A Vercel Postgres database (or any Neon-compatible Postgres)
- An OpenAI API key
- (Optional) Azure Speech Services key for live transcription

### Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/ai-multi-agent.git
cd ai-multi-agent
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file with the required environment variables:

```env
OPENAI_API_KEY=sk-...
AUTH_SECRET=<random-32-char-secret>
POSTGRES_URL=postgres://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

> Generate `AUTH_SECRET` with: `openssl rand -base64 32`

4. Run database migrations:

```bash
npx tsx db/migrate
```

5. Start the development server:

```bash
pnpm dev
```

The app will be available at [localhost:3000](http://localhost:3000/).

---

## Deploy Your Own

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET,OPENAI_API_KEY&envDescription=Learn%20more%20about%20how%20to%20get%20the%20API%20Keys%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&stores=[{%22type%22:%22postgres%22},{%22type%22:%22blob%22}])

Vercel will automatically provision a Postgres database and Blob store, and inject the corresponding environment variables.

---

## Model Providers

The default model is OpenAI `o3-mini`. You can switch between models at runtime via the settings dialog:

| Model | Description |
|---|---|
| `o3-mini` | Default — optimized reasoning model |
| `gpt-4o-mini` | Fast, cost-effective multimodal model |
| `gpt-3.5-turbo` | Legacy fast model |

With the [Vercel AI SDK](https://sdk.vercel.ai/docs), additional providers (Anthropic, Cohere, etc.) can be added with minimal code changes.
