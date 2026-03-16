import "dotenv/config";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

const SERVER_URL = process.env.SERVER_URL?.replace(/\/$/, "");
const TOKEN = process.env.CAPTURE_TOKEN;
const POLL_INTERVAL = 500;
const TMP_PATH = "/tmp/capture.png";

if (!SERVER_URL || !TOKEN) {
  console.error("Missing SERVER_URL or CAPTURE_TOKEN in .env");
  process.exit(1);
}

let busy = false;

console.log(`Capture agent started — polling ${SERVER_URL} every ${POLL_INTERVAL}ms`);

async function poll() {
  if (busy) return;

  try {
    const res = await fetch(`${SERVER_URL}/api/capture/pending`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.error("Invalid token. Check CAPTURE_TOKEN in .env");
        process.exit(1);
      }
      console.error(`Poll response: HTTP ${res.status}`);
      return;
    }

    const data = await res.json();
    if (!data.pending) return;

    busy = true;

    if (data.mode === "ping") {
      console.log("Ping received — sending pong...");
      await fetch(`${SERVER_URL}/api/capture/ack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      console.log("Pong sent");
      return;
    }

    console.log("Capture requested — taking screenshot...");

    try {
      execSync(`screencapture -x ${TMP_PATH}`);
      console.log("Screenshot saved to", TMP_PATH);
    } catch (screenshotErr) {
      console.error("screencapture failed:", screenshotErr.message);
      console.error("Grant Screen Recording permission: System Settings → Privacy & Security → Screen Recording");
      return;
    }

    const file = readFileSync(TMP_PATH);
    console.log(`Screenshot size: ${(file.length / 1024).toFixed(0)} KB — uploading...`);

    const form = new FormData();
    form.append("file", new Blob([file], { type: "image/png" }), "capture.png");

    const uploadRes = await fetch(`${SERVER_URL}/api/capture/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    });

    if (uploadRes.ok) {
      console.log("Screenshot uploaded successfully");
    } else {
      const body = await uploadRes.text();
      console.error(`Upload failed: HTTP ${uploadRes.status} — ${body}`);
    }

    try { unlinkSync(TMP_PATH); } catch {}
  } catch (err) {
    console.error("Poll error:", err.message || err);
  } finally {
    busy = false;
  }
}

setInterval(poll, POLL_INTERVAL);
