# Capture Agent

A lightweight Node.js script that runs on your MacBook to enable remote screen capture from the web app.

## Prerequisites

- **macOS** (uses the built-in `screencapture` command)
- **Node.js 18+** (for native `fetch` and `FormData` support)

## Setup

1. **Generate a capture token** in the web app:
   - Open **Settings** → **Screen Capture** → click **Generate Token**
   - Copy the token

2. **Configure the agent:**

   ```bash
   cd tools/capture-agent
   cp .env.example .env
   ```

   Edit `.env` and fill in your values:

   ```
   SERVER_URL=https://ai-multi-agent.vercel.app
   CAPTURE_TOKEN=paste_your_token_here
   ```

   For local development, use `SERVER_URL=http://localhost:3000`.

3. **Install dependencies:**

   ```bash
   npm install
   ```

## Running

```bash
npm start
```

You should see:

```
Capture agent started — polling https://ai-multi-agent.vercel.app every 500ms
```

The agent runs silently in the background. When you trigger a capture from the web app, you'll see:

```
Capture requested — taking screenshot...
Screenshot uploaded successfully
```

## Stopping

Press `Ctrl+C` in the terminal.

## How It Works

1. The agent polls `GET /api/capture/pending` every 500ms using the bearer token for auth.
2. When the web app user clicks **Capture Screen**, the server sets the status to "pending".
3. The agent detects the pending request, runs `screencapture -x` (silent, no UI flash), and uploads the PNG to the server.
4. The web app receives the screenshot URL and opens the capture popup.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Invalid token` error | Regenerate the token in Settings and update `.env` |
| `screencapture` permission denied | Grant Screen Recording permission: **System Settings → Privacy & Security → Screen Recording** → enable your terminal app |
| Agent not detected by web app | Make sure the agent is running and `SERVER_URL` points to the correct server |
