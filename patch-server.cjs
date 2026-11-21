/**
 * Post-build patch: inject /api/export-video handler into dist/server/server.js.
 * This works around TanStack Start's createAPIFileRoute not being picked up
 * in production builds for this project's configuration.
 */
const fs = require("node:fs");
const path = require("node:path");

const serverPath = path.join(__dirname, "dist", "server", "server.js");
let content = fs.readFileSync(serverPath, "utf-8");

// Find the "const fetch = createStartHandler(defaultStreamHandler);" line and
// wrap it with our API interceptor.
const fetchLine = 'const fetch = createStartHandler(defaultStreamHandler);';

if (!content.includes(fetchLine)) {
  console.error("ERROR: Could not find fetch line in server.js — patch may be out of date");
  process.exit(1);
}

// Inject the api-export handler as a module-level async function
const apiHandler = `
// ─── Injected: POST /api/export-video handler ───
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const TEMP_DIR = "/tmp/ps-exports";
const FONT_FILE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

function espeakTTS(text, outputMp3Path) {
  return new Promise((resolve, reject) => {
    const tmpWav = outputMp3Path.replace(/\.mp3$/,"") + ".wav";
    // Write text to a temp file to avoid shell escaping issues
    const tmpTxt = outputMp3Path.replace(/\.mp3$/,"") + ".txt";
    writeFileSync(tmpTxt, text, "utf-8");
    const proc = spawn("espeak", ["-f", tmpTxt, "-w", tmpWav, "-s", "150", "-p", "50", "-a", "100"]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", async (code) => {
      try { if (existsSync(tmpTxt)) rmSync(tmpTxt); } catch {}
      if (code !== 0 || !existsSync(tmpWav)) {
        return reject(new Error("espeak exited " + code + ": " + stderr.slice(0,200)));
      }
      // Convert WAV to MP3 using ffmpeg
      try {
        await runFfmpeg(["-i", tmpWav, "-codec:a", "libmp3lame", "-b:a", "128k", outputMp3Path, "-y"], 30000);
        try { rmSync(tmpWav); } catch {}
        resolve();
      } catch (e) {
        reject(new Error("espeak ffmpeg conversion failed: " + e.message));
      }
    });
    proc.on("error", (e) => reject(new Error("espeak spawn failed: " + e.message)));
    setTimeout(() => { proc.kill(); reject(new Error("espeak timeout")); }, 30000);
  });
}


function elevenlabsTTS(text, outputMp3Path) {
  return new Promise(async (resolve, reject) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return reject(new Error("ELEVENLABS_API_KEY not set"));

    try {
      const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam — deep, dramatic male voice
      const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;

      const body = JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true
        }
      });

      const resp = await _globalFetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: body,
        signal: AbortSignal.timeout(60000)
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        return reject(new Error("ElevenLabs HTTP " + resp.status + ": " + errText.slice(0, 200)));
      }

      const audioBuffer = Buffer.from(await resp.arrayBuffer());
      if (audioBuffer.length < 100) return reject(new Error("ElevenLabs returned empty audio"));
      writeFileSync(outputMp3Path, audioBuffer);
      console.log("TTS: ElevenLabs succeeded (" + voiceId + ", " + audioBuffer.length + " bytes)");
      resolve();
    } catch (e) {
      reject(new Error("ElevenLabs TTS failed: " + e.message));
    }
  });
}

async function ttsWithFallback(text, mp3Path) {
  // 1. Try ElevenLabs (natural AI voice) first
  try {
    await elevenlabsTTS(text, mp3Path);
    return;
  } catch (e) {
    console.warn("ElevenLabs TTS failed, trying Google TTS:", e.message);
  }

  // 2. Try Google Translate TTS; fall back to espeak
  try {
    const MAX_CHUNK = 200;
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = "";
    for (const s of sentences) {
      if (current && (current.length + s.length + 1) > MAX_CHUNK) {
        chunks.push(current);
        current = s;
      } else {
        current = current ? current + " " + s : s;
      }
    }
    if (current) chunks.push(current);

    const buffers = [];
    for (const chunk of chunks.slice(0, 15)) {
      const enc = encodeURIComponent(chunk);
      const url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=" + enc;
      try {
        const resp = await _globalFetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          if (buf.length > 100) buffers.push(buf);
          else console.warn("Google TTS: chunk returned small buffer (" + buf.length + " bytes)");
        } else {
          console.warn("Google TTS: HTTP " + resp.status + " for chunk");
        }
      } catch (e) {
        console.warn("Google TTS: chunk fetch failed:", e.message);
      }
    }
    if (buffers.length > 0) {
      writeFileSync(mp3Path, Buffer.concat(buffers));
      console.log("TTS: Google TTS succeeded (" + buffers.length + " chunks)");
      return;
    }
  } catch (e) {
    console.warn("Google TTS failed, falling back to espeak:", e.message);
  }
  
  console.log("TTS: Falling back to espeak...");
  await espeakTTS(text, mp3Path);
  console.log("TTS: espeak completed");
}

async function downloadImage(url, destPath) {
  try {
    const resp = await _globalFetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(destPath, buf);
    return buf.length > 1000;
  } catch { return false; }
}

function getAudioDuration(mp3Path) {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", ["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1", mp3Path]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.on("close", () => { const d = parseFloat(out.trim()); resolve(isNaN(d) ? 20 : d); });
    proc.on("error", () => resolve(20));
    setTimeout(() => { proc.kill(); resolve(20); }, 5000);
  });
}

function runFfmpeg(args, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString().slice(0, 1000); });
    proc.on("close", (code) => { if (code === 0) resolve(); else reject(new Error("ffmpeg exit " + code)); });
    proc.on("error", reject);
    setTimeout(() => { proc.kill(); reject(new Error("ffmpeg timeout")); }, timeoutMs);
  });
}

function escapeText(s) { return s.replace(/[:'\\\\%]/g, function(c) { return "\\\\" + c; }); }

async function handleExportVideo(request) {
  try {
    const body = await request.json();
    const title = body.title || "";
    const description = body.description || "";
    const year = body.year || 0;
    const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 8) : [];

    if (!title || !description) {
      return Response.json({ error: "title and description required" }, { status: 400 });
    }

    const exportId = randomUUID().slice(0, 8);
    const tempPath = join(TEMP_DIR, "ps-export-" + exportId);

    try {
      mkdirSync(tempPath, { recursive: true });
      const mp3Path = join(tempPath, "narration.mp3");
      await ttsWithFallback(description, mp3Path);
      const audioDurationSec = await getAudioDuration(mp3Path);

      const downloadedImages = [];
      for (let i = 0; i < images.length; i++) {
        const dest = join(tempPath, "img" + i + ".jpg");
        if (await downloadImage(images[i], dest)) downloadedImages.push(dest);
      }

      if (downloadedImages.length === 0) {
        const fallback = join(tempPath, "fallback.jpg");
        await runFfmpeg(["-f","lavfi","-i","color=c=#0a0a0f:s=1920x1080:d=1","-frames:v","1",fallback,"-y"], 10000);
        downloadedImages.push(fallback);
      }

      const imgCount = downloadedImages.length;
      const imgDuration = Math.max(3, audioDurationSec / imgCount);
      const fps = 30;

      const ffInputs = [];
      for (let i = 0; i < imgCount; i++) ffInputs.push("-loop","1","-t",imgDuration.toFixed(4),"-i",downloadedImages[i]);
      ffInputs.push("-i", mp3Path);

      const filters = [];
      let prevLabel = "";
      for (let i = 0; i < imgCount; i++) {
        const frames = Math.ceil(imgDuration * fps);
        const outLabel = "v" + i;
        filters.push("[" + i + ":v]zoompan=z='min(zoom+0.0005,1.15)':d=" + frames + ":s=1080x1920,setpts=PTS-STARTPTS[" + outLabel + "]");
        if (i === 0) { prevLabel = outLabel; }
        else {
          const offset = i * imgDuration;
          const merged = "vm" + i;
          filters.push("[" + prevLabel + "][" + outLabel + "]xfade=transition=fade:duration=0.5:offset=" + offset.toFixed(2) + "[" + merged + "]");
          prevLabel = merged;
        }
      }

      const displayTitle = title.length > 50 ? title.slice(0, 47) + "..." : title;
      const videoOutput = imgCount === 1 ? "v0" : prevLabel;
      filters.push("[" + videoOutput + "]drawtext=text='" + escapeText(displayTitle) + "':fontsize=32:fontcolor=white@0.9:x=(w-text_w)/2:y=24:shadowcolor=black@0.7:shadowx=2:shadowy=2:fontfile=" + FONT_FILE + ":bordercolor=black@0.5:borderw=1[vidbody]");

      // ─── End card watermark ───
      let totalVideoDuration = 0;
      for (let g = 0; g < imgCount; g++) totalVideoDuration += imgDuration;
      totalVideoDuration = Math.min(totalVideoDuration, audioDurationSec) + 0.5 * (imgCount - 1);

      const endCardPath = join(tempPath, "endcard.png");
      await runFfmpeg(["-f","lavfi","-i","color=c=#0a0a0f:s=1080x1920:d=1","-frames:v","1",endCardPath,"-y"], 10000);
      const endCardIdx = imgCount + 1; // audio is at imgCount, end card after it
      ffInputs.push("-loop","1","-t","2.5","-i",endCardPath);

      const endCardLabel = "ec";
      filters.push("[" + endCardIdx + ":v]zoompan=z='1':d=" + Math.ceil(2.5 * fps) + ":s=1080x1920,setpts=PTS-STARTPTS,fade=t=in:d=0.5[" + endCardLabel + "]");
      filters.push("[" + endCardLabel + "]drawtext=text='Made with Past Shadows':fontsize=28:fontcolor=white@0.8:x=(w-text_w)/2:y=h/2-30:shadowcolor=black@0.7:shadowx=2:shadowy=2:fontfile=" + FONT_FILE + "[ec1]");
      filters.push("[ec1]drawtext=text='pastshadows.ctonew.app':fontsize=18:fontcolor=c9a96e@0.7:x=(w-text_w)/2:y=h/2+10:shadowcolor=black@0.5:shadowx=1:shadowy=1:fontfile=" + FONT_FILE + "[endcardfinal]");
      filters.push("[vidbody][endcardfinal]xfade=transition=fade:duration=0.75:offset=" + Math.max(0, totalVideoDuration - 2.5).toFixed(2) + "[outv]");

      const outputMp4 = join(tempPath, "output.mp4");
      await runFfmpeg([...ffInputs,"-filter_complex",filters.join(";"),"-map","[outv]","-map",imgCount + ":a:0","-c:v","libx264","-preset","fast","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart","-r",String(fps),outputMp4,"-y"]);

      if (!existsSync(outputMp4)) throw new Error("Video generation failed");

      const videoBuf = readFileSync(outputMp4);
      const cleanupPath = tempPath;
      setTimeout(() => { try { rmSync(cleanupPath, { recursive: true, force: true }); } catch {} }, 10000);

      const safeFilename = title.replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 60) || "dark-history";
      return Response.json({
        videoBase64: videoBuf.toString("base64"),
        filename: safeFilename + "-" + (year || "history") + ".mp4",
        size: videoBuf.length,
      });
    } catch (err) {
      if (tempPath) setTimeout(() => { try { rmSync(tempPath, { recursive: true, force: true }); } catch {} }, 1000);
      return Response.json({ error: err.message || "Export failed" }, { status: 500 });
    }
  } catch(err) {
    console.error("export-video: JSON parse failed:", err.message || err);
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

// ─── Injected: POST /api/elevenlabs-narrate handler ───
async function handleElevenLabsRequest(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.text) return Response.json({ error: "Missing text field" }, { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return Response.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 503 });

    const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam
    const url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;

    const elBody = JSON.stringify({
      text: body.text.slice(0, 5000),
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true }
    });

    const resp = await _globalFetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: elBody,
      signal: AbortSignal.timeout(45000)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return Response.json({ error: "ElevenLabs HTTP " + resp.status + ": " + errText.slice(0, 200) }, { status: 502 });
    }

    const audioBuffer = await resp.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    return Response.json({ audioBase64, format: "mp3" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ─── End injection ───
`;

// Replace the fetch line with wrapper + api handler
const replacement = apiHandler + `
const _globalFetch = globalThis.fetch;
const _originalFetch = createStartHandler(defaultStreamHandler);
const fetch = async (request) => {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/export-video") {
    return handleExportVideo(request);
  }
  if (request.method === "POST" && url.pathname === "/api/elevenlabs-narrate") {
    return handleElevenLabsRequest(request);
  }
  return _originalFetch(request);
};
`;

content = content.replace(fetchLine, replacement.replace(/\$/g, "$$"));

fs.writeFileSync(serverPath, content);
console.log("✅ Patched server.js with /api/export-video handler");
