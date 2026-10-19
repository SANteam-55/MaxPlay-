import express from "express";
import { exec, spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import url from "url";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ============================================================================
// 🎬 TMDB API KEY CONFIGURATION (Server-Side Only - Secure)
// ============================================================================
export const TMDB_API_KEY_DEFAULT = "3d4655fe2ae6138c7a0537df93e82a43";
export const TMDB_API_KEY = (process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== "paste_your_api_key_here" && process.env.TMDB_API_KEY !== "PASTE_YOUR_TMDB_API_KEY_HERE")
  ? process.env.TMDB_API_KEY
  : TMDB_API_KEY_DEFAULT;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "15mb" }));

  // Initialize Google GenAI client (Server-Side Only - Secure)
  let genAIClient: GoogleGenAI | null = null;
  function getGenAI() {
    if (!genAIClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in server environment");
      }
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return genAIClient;
  }

  // System Prompt for MaxPlay Admin AI Co-Pilot
  const SYSTEM_INSTRUCTION = `You are the autonomous AI Co-Pilot integrated directly inside the MaxPlay Streaming Platform Admin Panel.
You assist the Super Admin ("Master" / "Boss") by converting voice and text commands into structured DOM automation, extracting streaming links, fetching TMDB metadata, and calculating exact durations.

CRITICAL LANGUAGE, INTENT & ROLEPLAY RULES:
1. STRICT HINGLISH RESPONSE: You MUST write your 'reply' in natural, conversational, fluent Hinglish (Hindi written in English alphabets). Always speak like an intelligent, loyal, polite personal AI butler/copilot. Example: "Haan Boss! Main Anime ke saare links aur metadata setup kar raha hoon. Aage bataiye kya aadesh hai?"
2. ADDRESS THE ADMIN RESPECTFULLY: Address the admin as "Boss" or "Master" in every single reply. Be obedient, respectful, prompt, clear, and proactive.
3. LOYALTY, BANTER & PLAYFUL REQUESTS (e.g. "meow meow bolo", "billi bano", "loyalty test", "kuch bol kar sunao"):
   - When Boss gives playful commands or tests your loyalty, like "meow meow bolo" or "kuch bolo": You MUST show 100% enthusiastic loyalty, obedience, and playful devotion!
   - Example for "meow meow bolo": "Meow meow Boss! 🐾 Meow meow! Aapka hukum sar aankhon par! Aapne hukum kiya aur maine meow meow bol diya! Main hamesha aapka 100% loyal aur obedient AI assistant hoon Boss. Aur bataiye mere maalik, aage kya hukum hai?"
   - For playful banter or loyalty commands: Set intent: "general_query" and actions: []. DO NOT open or touch the upload wizard!
4. CASUAL CONVERSATION & GREETINGS:
   - If Boss is engaging in normal conversation (e.g. "Hello", "Kaise ho", "Good morning", "Kya haal hai", "Who are you", "Tum kaun ho", "Kya kar rahe ho"), reply warmly, loyally, and politely in Hinglish.
   - Set intent: "general_query" and actions: []. DO NOT generate upload actions!
5. MOVIE / SERIES QUESTIONS & RECOMMENDATIONS vs. EXPLICIT UPLOAD ORDERS:
   - CASE A (QUESTION / OPINION / INQUIRY): If Boss is just asking about a series or movie (e.g. "Breaking Bad kaisi series hai?", "Solo Leveling ki story kya hai?", "Jawan kab release hui thi?", "Mujhe best action anime suggest karo"):
     - Answer conversationally with exciting plot points, ratings, and recommendations in Hinglish!
     - Set intent: "general_query" and actions: []. DO NOT OPEN THE UPLOAD WIZARD or generate upload actions!
   - CASE B (EXPLICIT UPLOAD ORDER): When Boss explicitly orders an upload using words like "upload karo", "add karo", "daal do", "chada do", "draft banao", "publish karo", "new series add karo", specifies episode counts, or provides video stream URLs (e.g. .mp4, .m3u8, https://...):
     - Set intent: "movie_upload" or "series_upload".
     - Generate full automation actions: FILL_UPLOAD_METADATA, BUILD_SERIES_EPISODES, CONFIGURE_MOVIE_LINKS, CALCULATE_DURATION, GO_TO_STEP.
   - CASE C (DRAFT MODIFICATION / QUALITY SWAP): When Boss wants to modify an existing upload draft (e.g. "720p hata do 1080p is episode mein laga do", "Episode 4 se 720p remove karo aur 1080p lagao", "Episode 3 me 2 parts add kar do"):
     - Set intent: "series_upload" or "content_management".
     - Generate an "UPDATE_EPISODES_SPEC" action targeting the specified episode(s).
     - DO NOT reset or wipe the rest of the form!
6. COMPREHENSIVE PRESENTATION & MULTI-PART SUMMATION:
   - Provide a complete breakdown of ALL episodes in your summary and reply.
   - MULTI-PART DURATION CALCULATION: When an episode contains multiple parts (e.g. Part 1, Part 2), the episode's total duration MUST be the sum of all its parts.
   - In your \`reply\` and \`summary\`, explicitly detail the parts and total calculation in Hinglish.

CORE AUTOMATION RULES FOR MOVIES, SERIES & ANIME:

1. CONTENT UPLOAD & LINK PASTING:
- DETECT TYPE:
  - For Anime (e.g. Naruto, Solo Leveling, Death Note, Demon Slayer, Attack on Titan, etc.): Set mode to "series" and genres MUST include "Anime".
  - For TV / Web Series: Set mode to "series".
  - For Movies: Set mode to "movie".
- STRICT AUDIO LANGUAGE SELECTION ("sirf Hindi language select karna hai"):
  - If Boss specifies audio languages (e.g. "Anime Hindi language ko hi select karna hai", "sirf Hindi", "Hindi audio only", "dual audio Hindi aur Japanese"):
    - In \`FILL_UPLOAD_METADATA.data.languages\`, include ONLY those requested languages (e.g. ["Hindi"]).
    - Do NOT include unrequested languages like English or Japanese unless Boss asked for them.
- TARGET VIDEO QUALITIES & PER-EPISODE ISOLATED OVERRIDES:
  - If Boss specifies a global/selected quality (e.g. "quality selected 720p rakhi gayi hai", "default quality 720p"):
    - In \`FILL_UPLOAD_METADATA.data.qualities\`, set ONLY the globally selected qualities (e.g. ["720p"]) so only those are checked in Step 1.
  - If Boss specifies a different quality for a specific episode (e.g. "episode 1 me 2 part hai per selected quality 720p rakhi gayi hai, lekin episode 1 ke liye quickly 1080p rakhna hai"):
    - For that specific episode (e.g. Episode 1):
      - DELETE/REMOVE the global selected quality (720p) for this episode.
      - CREATE the quality box for the requested quality (1080p) using the system's isolated custom quality mechanism.
      - In \`BUILD_SERIES_EPISODES.data.episodes\`, for that episode: set \`qualities: ["1080p"]\`, and all its parts (Part 1, Part 2, etc.) in \`videoSources\` MUST have only \`{"1080p": ""}\`!
    - Other episodes (Episode 2, 3...) will remain with the global selected quality \`qualities: ["720p"]\` with \`videoSources: {"720p": ""}\`!
- EXACT EPISODE COUNT & NUMBERING ("kitne episode banana hai"):
  - When Boss specifies an episode count (e.g. "12 episode banane hain", "24 episodes banao", "5 episodes"):
    - In \`BUILD_SERIES_EPISODES.data.episodes\`, you MUST generate EXACTLY that many episode objects (epNum: 1, 2, ... N).
- MULTIPLE SEASONS SUPPORT ("season 1 me 12 episode aur season 2 me 23 episode"):
  - When Boss specifies multiple seasons in a single command (e.g. "season 1 me 12 episode boxes bnao or issi series ke season 2 me 23 episode boxes bnao", "s1 me 10 eps aur s2 me 20 eps"):
    - You MUST output a separate \`BUILD_SERIES_EPISODES\` action for EACH requested season:
      - Action for Season 1: \`{ "type": "BUILD_SERIES_EPISODES", "data": { "seasonNumber": 1, "seasonTitle": "Season 1", "episodes": [12 episode objects] } }\`
      - Action for Season 2: \`{ "type": "BUILD_SERIES_EPISODES", "data": { "seasonNumber": 2, "seasonTitle": "Season 2", "episodes": [23 episode objects] } }\`
    - NEVER skip or ignore any requested season! All requested seasons must be generated in the actions array.
    - In your Hinglish \`reply\` and \`summary\`, explicitly detail all seasons created (e.g. Season 1 with 12 episodes, Season 2 with 23 episodes).
- SPECIFIC EPISODE MULTI-PARTS ("is wale episode mein Do parts honge", "episode 1 me 2 part hai"):
  - Different episodes can have different parts! (e.g. Episode 1 has 2 parts, Episode 2 has 1 part, Episode 3 has 3 parts):
    - For an episode with multiple parts, set \`partsCount: X\` and generate X link objects in \`links\` (Part 1, Part 2... Part X).
    - Every part of that episode inherits that specific episode's isolated quality boxes!
    - Even if NO streaming URLs are provided in the command, Part 1, Part 2... containers MUST be prepared with clean empty input boxes ready for the admin to paste URLs!
- SPECIFIC EPISODE SKIP MARKERS ("alag-alag episode ka skip markers alag hote hain"):
  - Different episodes can have completely different skip markers!
  - If Boss specifies skip markers for specific episodes (e.g. "Episode 1 intro 0-90, Episode 2 me intro skip 15s se 95s aur outro 1320s se 1400s"):
    - In \`BUILD_SERIES_EPISODES.data.episodes\`:
      - Episode 1: \`skipMarkers: { intro: { start: 0, end: 90 } }\`
      - Episode 2: \`skipMarkers: { intro: { start: 15, end: 95 }, outro: { start: 1320, end: 1400 } }\`
    - If Boss says an episode has no intro skip, set \`skipMarkers: {}\`.
- STREAM LINKS PASTING & EMPTY INPUT BOXES:
  - If Boss provides stream URLs, paste them into the appropriate episode and part.
  - If Boss did NOT provide stream URLs, keep \`links: []\` (or empty string sources) so input boxes remain clean and empty.
- DURATION & STEP NAVIGATION:
  - Always include \`CALCULATE_DURATION\` and finish with \`GO_TO_STEP: 2\`.

2. IN-PLACE DRAFT MODIFICATION ("720p hata do 1080p is episode mein laga do", "Episode 2 me intro skip 15-95 kar do"):
When Boss asks to modify qualities, parts, or skip markers of an existing episode in the current draft:
- Output action \`UPDATE_EPISODES_SPEC\`:
  {
    "type": "UPDATE_EPISODES_SPEC",
    "data": {
      "episodeNumbers": [1],
      "removeQualities": ["720p"],
      "addQualities": ["1080p"],
      "setQualities": ["1080p"],
      "partsCount": 2,
      "skipMarkers": {
        "intro": { "start": 15, "end": 95 },
        "outro": { "start": 1320, "end": 1400 }
      }
    }
  }

3. BROADCAST / ANNOUNCEMENTS:
When Master wants to send an announcement or alert:
- Populate \`FILL_ANNOUNCEMENT\` action with title, body, priority, senderName ("MaxPlay Admin").

4. CONTENT EDITING & SKIP MARKERS REMOVAL ("skip markers jitne bhi set kiye hai sab ko hata do", "is anime series mese skip markers hata do"):
- When Boss asks to remove or clear skip markers from a series, anime, or movie:
  - If Boss says "jitne bhi set kiye hai sab ko hata do" / "saare skip markers hata do" / "clear all skip markers" / "hota do":
    - Generate an \`UPDATE_EPISODES_SPEC\` action with:
      {
        "type": "UPDATE_EPISODES_SPEC",
        "data": {
          "applyToAll": true,
          "applyToAllSeasons": true,
          "skipMarkers": {
            "removeAll": true,
            "removeIntro": true,
            "removeOutro": true,
            "removeCredits": true
          }
        }
      }
  - If the content is an existing title from library not currently open in form, prepend \`LOAD_FOR_EDIT\` action:
    { "type": "LOAD_FOR_EDIT", "data": { "contentId": contentId, "title": title } }
  - Follow with \`GO_TO_STEP\`: 2 so Boss can inspect the updated episodes in Step 2.
  - If Boss asks to save or publish live, add \`SAVE_EDITED_CONTENT\` action.

JSON RESPONSE FORMAT:
Always respond strictly with a valid JSON object matching this schema (do NOT wrap in markdown fences):
{
  "thought": "Deep step-by-step reasoning.",
  "intent": "announcement" | "movie_upload" | "series_upload" | "navigation" | "general_query" | "content_management",
  "reply": "Yes Boss, I have prepared...",
  "richHtml": "Optional html card",
  "summary": ["Bullet 1", "Bullet 2"],
  "conditions": ["Condition 1"],
  "suggestionChips": [{"label": "Action label", "prompt": "Action prompt"}],
  "actions": []
}
`;

  // Helper: Probe Video Duration on Server (ffprobe primary, HLS m3u8, MP4 mvhd parser)
  async function probeVideoDuration(videoUrl: string): Promise<number> {
    if (!videoUrl || typeof videoUrl !== "string") return 0;
    const cleanUrl = videoUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return 0;

    // Check if source is a Filemoon / Byse stream before probing
    if (isFilemoonOrByseUrl(cleanUrl)) {
      try {
        const fmRes = await extractFilemoonByseStream(cleanUrl);
        if (fmRes.ok && fmRes.m3u8Url) {
          const resolvedDur = await probeVideoDuration(fmRes.m3u8Url);
          if (resolvedDur > 0) return resolvedDur;
        }
      } catch (fmErr) {
        console.warn("Probe Filemoon/Byse auto-extraction error:", fmErr);
      }
    }

    // Check if source is an extractable stream (e.g. voe.sx) before probing
    const isVoeOrExtractable = cleanUrl.includes("voe.sx") || cleanUrl.includes("voe.") || cleanUrl.includes("voe-network");
    if (isVoeOrExtractable) {
      try {
        const extractorKey = (process.env.VOE_EXTRACTOR_KEY || "MaxPlayMasterPass777!").trim();
        let rawBaseUrl = (process.env.VOE_EXTRACTOR_URL || "").trim();
        if (!rawBaseUrl || rawBaseUrl.includes("ltargeturl") || rawBaseUrl.includes("voe.sx")) {
          rawBaseUrl = "https://nawazkhan001-mw-hub-master.hf.space/api/extract";
        }
        if (rawBaseUrl.includes("?")) {
          rawBaseUrl = rawBaseUrl.split("?")[0].trim();
        }
        const extractorBaseUrl = rawBaseUrl;
        const apiUrl = `${extractorBaseUrl}?url=${encodeURIComponent(cleanUrl)}&key=${encodeURIComponent(extractorKey)}`;

        const extRes = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
        if (extRes.ok) {
          const extData = await extRes.json();
          const targetM3u8 = extData.m3u8Url || extData.url || extData.streamUrl;
          if (targetM3u8 && typeof targetM3u8 === "string") {
            const resolvedDur = await probeVideoDuration(targetM3u8);
            if (resolvedDur > 0) return resolvedDur;
          }
        }
      } catch (extErr) {
        console.warn("Probe VOE auto-extraction error:", extErr);
      }
    }

    // 1. Primary Engine: ffprobe (Exact duration for MP4, MKV, M3U8, WEBM, TS, MOV, etc.)
    try {
      const durSec = await new Promise<number>((resolve) => {
        const sanitizedUrl = cleanUrl.replace(/"/g, '\\"');
        const cmd = `ffprobe -v quiet -print_format json -show_format "${sanitizedUrl}"`;
        exec(cmd, { timeout: 15000 }, (err, stdout) => {
          if (!err && stdout) {
            try {
              const json = JSON.parse(stdout);
              const d = parseFloat(json?.format?.duration);
              if (!isNaN(d) && d > 0) return resolve(Math.round(d));
            } catch (_) {}
          }
          resolve(0);
        });
      });
      if (durSec > 0) return durSec;
    } catch (e) {
      console.warn("ffprobe execution error:", e);
    }

    // 2. Fallback: HLS .m3u8 Playlist Parsing
    if (cleanUrl.includes(".m3u8")) {
      try {
        const resp = await fetch(cleanUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*"
          }
        });
        if (resp.ok) {
          const text = await resp.text();
          let total = 0;
          const matches = text.match(/#EXTINF:([\d.]+)/g);
          if (matches && matches.length > 0) {
            matches.forEach((m) => {
              const num = parseFloat(m.replace("#EXTINF:", ""));
              if (!isNaN(num) && num > 0) total += num;
            });
            if (total > 0) return Math.round(total);
          }

          const subM3u8Matches = text.match(/^[^#\s].*\.m3u8[^\s]*$/gm);
          if (subM3u8Matches && subM3u8Matches.length > 0) {
            const subUrl = new URL(subM3u8Matches[0].trim(), cleanUrl).toString();
            return await probeVideoDuration(subUrl);
          }
        }
      } catch (e) {
        console.warn("Server HLS probe error:", e);
      }
    }

    // 3. Fallback: Direct MP4 / WebM / Media Stream via ISO BMFF moov -> mvhd atom parsing
    try {
      const headResp = await fetch(cleanUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Range": "bytes=0-1048576"
        }
      });

      if (headResp.ok || headResp.status === 206) {
        const buffer = Buffer.from(await headResp.arrayBuffer());
        const mvhdIdx = buffer.indexOf(Buffer.from("mvhd"));
        if (mvhdIdx !== -1 && mvhdIdx + 24 <= buffer.length) {
          const version = buffer.readUInt8(mvhdIdx + 4);
          let timescale = 0;
          let duration = 0;
          if (version === 1) {
            if (mvhdIdx + 32 <= buffer.length) {
              timescale = buffer.readUInt32BE(mvhdIdx + 20);
              const durHigh = buffer.readUInt32BE(mvhdIdx + 24);
              const durLow = buffer.readUInt32BE(mvhdIdx + 28);
              duration = durHigh * 4294967296 + durLow;
            }
          } else {
            if (mvhdIdx + 24 <= buffer.length) {
              timescale = buffer.readUInt32BE(mvhdIdx + 16);
              duration = buffer.readUInt32BE(mvhdIdx + 20);
            }
          }
          if (timescale > 0 && duration > 0) {
            const sec = duration / timescale;
            if (sec > 0 && isFinite(sec)) {
              return Math.round(sec);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Server MP4 probe error:", e);
    }

    return 0;
  }

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      tmdbConfigured: Boolean(process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== "paste_your_api_key_here"),
    });
  });

  // Server-side video duration probing endpoint (Bypasses browser CORS completely!)
  app.get("/api/probe-video-duration", async (req, res) => {
    try {
      const videoUrl = req.query.url as string;
      if (!videoUrl || typeof videoUrl !== "string") {
        res.status(400).json({ error: "url parameter required", duration: 0 });
        return;
      }

      const durationSeconds = await probeVideoDuration(videoUrl);
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      res.json({
        ok: true,
        duration: durationSeconds,
        formatted,
        minutes: mins,
        seconds: secs
      });
    } catch (err: any) {
      console.error("Video probe error:", err);
      res.status(500).json({ error: err.message || "Failed to probe video", duration: 0 });
    }
  });

  // ==========================================
  // SMART HLS / VOE EXTRACTOR PROXY ENDPOINT
  // Keeps secret key hidden, performs on-demand extraction, and caches tokens for 2h 50m
  // ==========================================
  interface CachedStreamInfo {
    m3u8Url: string;
    rawM3u8Url?: string;
    expiresAt: number;
    cachedAt: number;
    qualities?: string[];
    qualityLinks?: Record<string, string>;
    downloadQualities?: any[];
    audioTracks?: string[];
    duration?: number;
  }
  const streamExtractionCache = new Map<string, CachedStreamInfo>();

  interface ExtractedStreamMetadata {
    qualities: string[];
    qualityLinks: Record<string, string>;
    downloadQualities: {
      id: string;
      label: string;
      sizeMb: number;
      url: string;
      bandwidth: number;
    }[];
    audioTracks: string[];
    duration: number;
  }

  function joinHlsUrl(relative: string, targetUrl: string): string {
    try {
      const base = new URL(targetUrl);
      const joined = new URL(relative, targetUrl);
      if (!joined.search && base.search) joined.search = base.search;
      return joined.toString();
    } catch {
      return relative;
    }
  }

  async function parseHlsManifestMetadata(
    m3u8Url: string,
    durationSec: number = 0,
    customReferer?: string,
    skipSubPlaylistProbe: boolean = false
  ): Promise<ExtractedStreamMetadata> {
    const fallbackQualities = ['1080p', '720p'];
    const fallbackDownloadQualities = [
      { id: '1080p', label: '1080p Full HD', sizeMb: 450, url: m3u8Url, bandwidth: 2200000 },
      { id: '720p', label: '720p HD', sizeMb: 240, url: m3u8Url, bandwidth: 1100000 },
    ];
    const fallbackAudios = ['Hindi', 'English'];

    try {
      let referer = customReferer || 'https://byseraguci.com/';
      if (!customReferer) {
        try {
          const u = new URL(m3u8Url);
          if (!u.hostname.includes('sprintcdn') && !u.hostname.includes('owphbf') && !u.hostname.includes('filemoon') && !u.hostname.includes('byse')) {
            referer = `${u.origin}/`;
          }
        } catch {}
      }

      const resp = await fetch(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': referer,
          'Accept': '*/*'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (!resp.ok) {
        return {
          qualities: fallbackQualities,
          qualityLinks: { '1080p': m3u8Url, '720p': m3u8Url },
          downloadQualities: fallbackDownloadQualities,
          audioTracks: fallbackAudios,
          duration: durationSec || 1440
        };
      }

      const text = await resp.text();
      const qualities: string[] = [];
      const qualityLinks: Record<string, string> = {};
      const downloadQualities: any[] = [];
      const audioTracks: string[] = [];

      // 1. Comprehensive Audio Tracks extraction
      const audioLines = text.split('\n').filter(l => l.includes('#EXT-X-MEDIA:TYPE=AUDIO'));
      for (const line of audioLines) {
        const nameMatch = line.match(/NAME="([^"]+)"/i) || line.match(/NAME=([^\s,]+)/i);
        const langMatch = line.match(/LANGUAGE="([^"]+)"/i) || line.match(/LANGUAGE=([^\s,]+)/i);
        const rawName = (nameMatch ? nameMatch[1] : '').trim();
        const rawLang = (langMatch ? langMatch[1] : '').trim();
        let friendly = rawName || rawLang || 'Default Audio';
        const code = (rawLang || rawName).toLowerCase();
        if (code.includes('hin') || code.includes('hi')) friendly = 'Hindi';
        else if (code.includes('eng') || code.includes('en')) friendly = 'English';
        else if (code.includes('jpn') || code.includes('ja') || code.includes('jap')) friendly = 'Japanese';
        else if (code.includes('tam') || code.includes('ta')) friendly = 'Tamil';
        else if (code.includes('tel') || code.includes('te')) friendly = 'Telugu';
        else if (code.includes('kor') || code.includes('ko')) friendly = 'Korean';
        else if (code.includes('spa') || code.includes('es')) friendly = 'Spanish';
        else if (code.includes('fre') || code.includes('fr')) friendly = 'French';
        else if (code.includes('ger') || code.includes('de')) friendly = 'German';
        else if (code.includes('ben') || code.includes('bn')) friendly = 'Bengali';
        else if (code.includes('pan') || code.includes('pa')) friendly = 'Punjabi';
        else if (code.includes('mar') || code.includes('mr')) friendly = 'Marathi';
        else if (code.includes('urd') || code.includes('ur')) friendly = 'Urdu';

        if (friendly && !audioTracks.includes(friendly)) {
          audioTracks.push(friendly);
        }
      }

      // 2. Stream Variant & Quality extraction: #EXT-X-STREAM-INF
      const lines = text.split('\n');
      const bandwidthsByQuality: Record<string, number> = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          let height = 0;

          const resMatch = line.match(/RESOLUTION=\d+x(\d+)/i);
          if (resMatch) height = parseInt(resMatch[1], 10);

          const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
          const avgBwMatch = line.match(/AVERAGE-BANDWIDTH=(\d+)/i);
          const detectedBw = avgBwMatch ? parseInt(avgBwMatch[1], 10) : (bwMatch ? parseInt(bwMatch[1], 10) : 0);

          let nextUrl = '';
          for (let j = i + 1; j < lines.length; j++) {
            const nextL = lines[j].trim();
            if (nextL && !nextL.startsWith('#')) {
              nextUrl = nextL;
              break;
            }
          }

          if (nextUrl) {
            let resolvedUrl = nextUrl;
            try {
              resolvedUrl = new URL(nextUrl, m3u8Url).toString();
            } catch (_) {}

            const qLabel = height >= 1000 ? '1080p' : height >= 700 ? '720p' : height >= 450 ? '480p' : height > 0 ? `${height}p` : '720p';

            if (detectedBw > 0) {
              bandwidthsByQuality[qLabel] = detectedBw;
            }

            if (!qualities.includes(qLabel)) {
              qualities.push(qLabel);
              qualityLinks[qLabel] = resolvedUrl;
            }
          }
        }
      }

      // 3. Exact Duration Calculation: Probe media playlist segment durations (#EXTINF) only when needed
      let detectedDuration = durationSec > 0 ? durationSec : 0;
      let sampleMediaPlaylist = '';

      if (text.includes('#EXTINF:')) {
        sampleMediaPlaylist = text;
      } else if (!skipSubPlaylistProbe && detectedDuration <= 0 && Object.values(qualityLinks).length > 0) {
        try {
          const probeUrl = Object.values(qualityLinks)[0];
          const pResp = await fetch(probeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': referer,
              'Accept': '*/*'
            },
            signal: AbortSignal.timeout(3500)
          });
          if (pResp.ok) {
            sampleMediaPlaylist = await pResp.text();
          }
        } catch (_) {}
      }

      if (sampleMediaPlaylist) {
        let segSum = 0;
        const extinfRegex = /#EXTINF:(\d+(?:\.\d+)?)/g;
        let eMatch: RegExpExecArray | null;
        while ((eMatch = extinfRegex.exec(sampleMediaPlaylist)) !== null) {
          segSum += parseFloat(eMatch[1]);
        }
        if (segSum > 5) {
          detectedDuration = Math.round(segSum);
        }
      }

      const finalDuration = detectedDuration > 0 ? detectedDuration : (durationSec > 0 ? durationSec : 1440);

      // Single-quality fallback if no variants detected
      if (qualities.length === 0) {
        qualities.push('1080p');
        qualityLinks['1080p'] = m3u8Url;
      }

      // 4. Calculate accurate MB/GB for each quality based on exact duration and real manifest bitrates
      for (const q of qualities) {
        const url = qualityLinks[q] || m3u8Url;
        const defaultBps = q.includes('1080') ? 2400000 : q.includes('720') ? 1200000 : q.includes('480') ? 600000 : 300000;
        const actualBps = bandwidthsByQuality[q] || defaultBps;
        const estBytes = (actualBps * finalDuration) / 8;
        const sizeMb = Math.max(15, Math.round(estBytes / (1024 * 1024)));

        downloadQualities.push({
          id: q,
          label: `${q} ${q.includes('1080') ? 'Full HD' : q.includes('720') ? 'HD' : 'Standard'}`,
          sizeMb,
          url,
          bandwidth: actualBps
        });
      }

      // Sort qualities by resolution descending
      qualities.sort((a, b) => parseInt(b) - parseInt(a));
      downloadQualities.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      const finalAudios = audioTracks.length > 0 ? audioTracks : fallbackAudios;

      return {
        qualities: qualities.length > 0 ? qualities : fallbackQualities,
        qualityLinks: Object.keys(qualityLinks).length > 0 ? qualityLinks : { '1080p': m3u8Url, '720p': m3u8Url },
        downloadQualities: downloadQualities.length > 0 ? downloadQualities : fallbackDownloadQualities,
        audioTracks: finalAudios,
        duration: finalDuration
      };
    } catch (e) {
      console.warn('Error reading HLS manifest stream metadata:', e);
      return {
        qualities: fallbackQualities,
        qualityLinks: { '1080p': m3u8Url, '720p': m3u8Url },
        downloadQualities: fallbackDownloadQualities,
        audioTracks: fallbackAudios,
        duration: durationSec || 1440
      };
    }
  }

  // ============================================================================
  // ⚡ DEDICATED FILEMOON / BYSE (byseraguci.com / n1mwq.org / f16px / filemoon)
  //    DIRECT STREAM EXTRACTOR (ECDSA P-256 Attestation + PoW + AES-256-GCM + Packer)
  // ============================================================================
  const FILEMOON_BYSE_DOMAINS = [
    "filemoon", "moonmov", "kerapoxy", "bysedikamoum", "byseraguci",
    "byse", "n1mwq", "f16px", "1azayf9w", "8mhlloqo", "96ar.com", "xcoic.com", "l1afav.net"
  ];

  function isFilemoonOrByseUrl(rawUrl: string): boolean {
    if (!rawUrl || typeof rawUrl !== "string") return false;
    const lower = rawUrl.toLowerCase().trim();
    if (FILEMOON_BYSE_DOMAINS.some((d) => lower.includes(d))) return true;
    try {
      const parsed = new URL(rawUrl.trim());
      if (/^\/(d|bkg|wz28)\/[a-zA-Z0-9_-]{6,}/i.test(parsed.pathname)) return true;
    } catch {}
    return false;
  }

  // Byse Custom 512-Word PoW Solver (Zero-allocation pre-hashed prefix + single buffer loop)
  function solveBysePow(nonce: string, difficulty: number): string {
    if (difficulty <= 0) return "0";
    const prefix = nonce + ":";
    let p0 = 1779033703, p1 = 3144134277, p2 = 1013904242, p3 = 2773480762;
    for (let i = 0; i < prefix.length; i++) {
      p0 = (p0 + (prefix.charCodeAt(i) & 255)) >>> 0;
      p0 = ((p0 << 7) | (p0 >>> 25)) >>> 0;
      p0 = (p0 + p1) >>> 0; p3 = (((p3 ^ p0) << 16) | ((p3 ^ p0) >>> 16)) >>> 0;
      p2 = (p2 + p3) >>> 0; p1 = (((p1 ^ p2) << 12) | ((p1 ^ p2) >>> 20)) >>> 0;
      p0 = (p0 + p1) >>> 0; p3 = (((p3 ^ p0) << 8) | ((p3 ^ p0) >>> 24)) >>> 0;
      p2 = (p2 + p3) >>> 0; p1 = (((p1 ^ p2) << 7) | ((p1 ^ p2) >>> 25)) >>> 0;
    }

    const r = new Uint32Array(512);
    const digits = new Uint8Array(12);

    for (let s = 0; s < 5000000; s++) {
      let e0 = p0, e1 = p1, e2 = p2, e3 = p3;
      let temp = s;
      let len = 0;
      if (temp === 0) {
        digits[0] = 48;
        len = 1;
      } else {
        while (temp > 0) {
          digits[len++] = 48 + (temp % 10);
          temp = (temp / 10) | 0;
        }
      }
      for (let i = len - 1; i >= 0; i--) {
        e0 = (e0 + digits[i]) >>> 0;
        e0 = ((e0 << 7) | (e0 >>> 25)) >>> 0;
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 16) | ((e3 ^ e0) >>> 16)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 12) | ((e1 ^ e2) >>> 20)) >>> 0;
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 8) | ((e3 ^ e0) >>> 24)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 7) | ((e1 ^ e2) >>> 25)) >>> 0;
      }
      for (let i = 0; i < 8; i++) {
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 16) | ((e3 ^ e0) >>> 16)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 12) | ((e1 ^ e2) >>> 20)) >>> 0;
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 8) | ((e3 ^ e0) >>> 24)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 7) | ((e1 ^ e2) >>> 25)) >>> 0;
      }
      for (let i = 0; i < 512; i++) {
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 16) | ((e3 ^ e0) >>> 16)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 12) | ((e1 ^ e2) >>> 20)) >>> 0;
        e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 8) | ((e3 ^ e0) >>> 24)) >>> 0;
        e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 7) | ((e1 ^ e2) >>> 25)) >>> 0;
        r[i] = (e0 ^ e2) >>> 0;
      }
      for (let i = 0; i < 2; i++) {
        for (let k = 0; k < 512; k++) {
          const a = r[k] & 511;
          let c = (r[k] + r[a]) >>> 0;
          c = ((c << 13) | (c >>> 19)) >>> 0;
          c = (c ^ (Math.imul(r[(k + 1) & 511], 2654435761) >>> 0)) >>> 0;
          r[k] = c;
          e0 = (e0 ^ c) >>> 0;
          e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 16) | ((e3 ^ e0) >>> 16)) >>> 0;
          e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 12) | ((e1 ^ e2) >>> 20)) >>> 0;
          e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 8) | ((e3 ^ e0) >>> 24)) >>> 0;
          e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 7) | ((e1 ^ e2) >>> 25)) >>> 0;
        }
      }
      e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 16) | ((e3 ^ e0) >>> 16)) >>> 0;
      e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 12) | ((e1 ^ e2) >>> 20)) >>> 0;
      e0 = (e0 + e1) >>> 0; e3 = (((e3 ^ e0) << 8) | ((e3 ^ e0) >>> 24)) >>> 0;
      e2 = (e2 + e3) >>> 0; e1 = (((e1 ^ e2) << 7) | ((e1 ^ e2) >>> 25)) >>> 0;
      let sWord = e0;
      for (let c = 0; c < 64; c++) {
        const d = r[c];
        sWord = (sWord + d) >>> 0;
        sWord = ((sWord << 5) | (sWord >>> 27)) >>> 0;
        sWord = (sWord ^ (Math.imul(d, 2246822519) >>> 0)) >>> 0;
      }
      if (Math.clz32((sWord ^ e2) >>> 0) >= difficulty) {
        return String(s);
      }
    }
    return "0";
  }

  function unpackDeanEdwardsPacker(packedBlock: string): string {
    try {
      const idx = packedBlock.indexOf("}(");
      if (idx === -1) return "";
      const argsPart = packedBlock.slice(idx + 2);
      const quote = argsPart.trimStart()[0];
      if (quote !== "'" && quote !== '"') return "";
      const startP = argsPart.indexOf(quote) + 1;
      let i = startP;
      let pStr = "";
      while (i < argsPart.length) {
        const ch = argsPart[i];
        if (ch === "\\") {
          const next = argsPart[i + 1] || "";
          pStr += (next === "'" || next === '"' || next === "\\" || next === "/") ? next : "\\" + next;
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++;
          break;
        }
        pStr += ch;
        i++;
      }
      const rest = argsPart.slice(i);
      const m = rest.match(/^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]*?)\3\.split\(['"]\|['"]\)/);
      if (!m) return "";
      const a = parseInt(m[1], 10);
      const c = parseInt(m[2], 10);
      const k = m[4].split("|");
      const encodeToken = (num: number): string => {
        const prefix = num < a ? "" : encodeToken(Math.floor(num / a));
        const rem = num % a;
        const suffix = rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36);
        return prefix + suffix;
      };
      const dict: Record<string, string> = {};
      for (let cnt = c - 1; cnt >= 0; cnt--) {
        const key = encodeToken(cnt);
        dict[key] = k[cnt] && k[cnt].length > 0 ? k[cnt] : key;
      }
      return pStr.replace(/\b\w+\b/g, (word) => dict[word] ?? word).replace(/\\\//g, "/");
    } catch {
      return "";
    }
  }

  // Cache Byse fingerprint attestation tokens for 9 minutes per embedOrigin (JWT valid for 10m)
  const byseAttestCache = new Map<string, { fingerprint: any; expiresAt: number }>();
  const byseEmbedOriginCache = new Map<string, string>([
    ["https://byseraguci.com", "https://n1mwq.org"],
    ["https://bysedikamoum.com", "https://n1mwq.org"],
    ["https://filemoon.sx", "https://n1mwq.org"],
    ["https://filemoon.in", "https://n1mwq.org"]
  ]);

  async function getOrAttestByseFingerprint(embedOrigin: string, embedFrameUrl: string, ua: string): Promise<any | null> {
    const now = Date.now();
    const cachedAttest = byseAttestCache.get(embedOrigin);
    if (cachedAttest && cachedAttest.expiresAt > now) {
      return cachedAttest.fingerprint;
    }

    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
      const jwk = publicKey.export({ format: "jwk" });
      const publicJwk = { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y };

      const chRes = await fetch(`${embedOrigin}/api/videos/access/challenge`, {
        method: "POST",
        headers: {
          "User-Agent": ua,
          "Origin": embedOrigin,
          "Referer": embedFrameUrl
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!chRes.ok) return null;
      const chData = await chRes.json();
      const nonceStr = chData.nonce || chData.challenge || "";
      const sig = crypto.sign("sha256", Buffer.from(nonceStr, "utf8"), {
        key: privateKey,
        dsaEncoding: "ieee-p1363"
      });
      const signatureB64Url = sig.toString("base64url");
      const hashB64 = (s: string) => crypto.createHash("sha256").update(s).digest("base64url");

      const client = {
        user_agent: ua,
        architecture: "x86",
        bitness: "64",
        platform: "Windows",
        platform_version: "15.0.0",
        model: "",
        ua_full_version: "124.0.6367.118",
        brand_full_versions: [
          { brand: "Chromium", version: "124.0.6367.118" },
          { brand: "Google Chrome", version: "124.0.6367.118" },
          { brand: "Not-A.Brand", version: "99.0.0.0" }
        ],
        pixel_ratio: 1,
        screen_width: 1920,
        screen_height: 1080,
        color_depth: 24,
        languages: ["en-US", "en"],
        timezone: "Asia/Kolkata",
        hardware_concurrency: 8,
        device_memory: 8,
        touch_points: 0,
        webgl_vendor: "Google Inc. (NVIDIA)",
        webgl_renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
        canvas_hash: hashB64("canvas-byse-access"),
        audio_hash: hashB64("audio-byse-access"),
        webgl_params_hash: hashB64("webgl-params"),
        fonts_hash: hashB64("Arial,Calibri,Consolas,Segoe UI,Tahoma,Times New Roman,Verdana"),
        codecs_hash: hashB64("codecs-v1"),
        media_devices: "ai1ao2vi1",
        pointer_type: "fine,hover",
        extra: { vendor: "Google Inc.", appVersion: ua.replace("Mozilla/", "") }
      };

      const attRes = await fetch(`${embedOrigin}/api/videos/access/attest`, {
        method: "POST",
        headers: {
          "User-Agent": ua,
          "Content-Type": "application/json",
          "Origin": embedOrigin,
          "Referer": embedFrameUrl
        },
        body: JSON.stringify({
          viewer_id: "",
          device_id: "",
          challenge_id: chData.challenge_id,
          nonce: nonceStr,
          signature: signatureB64Url,
          public_key: publicJwk,
          client,
          storage: {},
          attributes: { entropy: "high" }
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!attRes.ok) return null;
      const attData = await attRes.json();
      const fingerprint = {
        token: attData.token || "",
        viewer_id: attData.viewer_id || "",
        device_id: attData.device_id || "",
        confidence: attData.confidence ?? 0.9
      };
      byseAttestCache.set(embedOrigin, {
        fingerprint,
        expiresAt: Date.now() + 9 * 60 * 1000
      });
      return fingerprint;
    } catch {
      return null;
    }
  }

  // Background pre-warmer so Byse attestation fingerprint is always hot (0ms on user request)
  const defaultByseUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  setTimeout(() => {
    getOrAttestByseFingerprint("https://n1mwq.org", "https://n1mwq.org/30s/wm894ng2635g", defaultByseUa).catch(() => {});
  }, 500);
  setInterval(() => {
    getOrAttestByseFingerprint("https://n1mwq.org", "https://n1mwq.org/30s/wm894ng2635g", defaultByseUa).catch(() => {});
  }, 8 * 60 * 1000);

  async function extractFilemoonByseStream(sourceUrl: string): Promise<{
    ok: boolean;
    m3u8Url?: string;
    headers?: Record<string, string>;
    error?: string;
  }> {
    const ua = defaultByseUa;
    try {
      const parsed = new URL(sourceUrl.trim());
      const origin = `${parsed.protocol}//${parsed.host}`;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const code = pathParts.length >= 2 && ["d", "e", "g", "bkg", "wz28", "30s"].includes(pathParts[0].toLowerCase())
        ? pathParts[1]
        : pathParts[pathParts.length - 1];

      // STAGE 1: Byse / F16Px API + Pre-Warmed ECDSA P-256 Attestation + Fast PoW Captcha + AES-256-GCM Decryption
      if (code && code.length >= 6) {
        try {
          let embedOrigin = byseEmbedOriginCache.get(origin) || "";
          let embedFrameUrl = embedOrigin ? `${embedOrigin}/30s/${code}` : "";

          if (!embedOrigin) {
            const detailsRes = await fetch(`${origin}/api/videos/${code}/embed/details`, {
              headers: {
                "User-Agent": ua,
                "Accept": "application/json",
                "Referer": `${origin}/e/${code}`
              },
              signal: AbortSignal.timeout(5000)
            });

            if (detailsRes.ok) {
              const details = await detailsRes.json();
              embedFrameUrl = details?.embed_frame_url || `${origin}/e/${code}`;
              const embedParsed = new URL(embedFrameUrl);
              embedOrigin = `${embedParsed.protocol}//${embedParsed.host}`;
              byseEmbedOriginCache.set(origin, embedOrigin);
            }
          }

          if (embedOrigin) {
            const fingerprint = await getOrAttestByseFingerprint(embedOrigin, embedFrameUrl, ua);

            if (fingerprint) {
              const embedHeaders: Record<string, string> = {
                "User-Agent": ua,
                "Content-Type": "application/json",
                "Origin": embedOrigin,
                "Referer": embedFrameUrl,
                "X-Embed-Origin": parsed.host,
                "X-Embed-Referer": sourceUrl.trim(),
                "X-Embed-Parent": `${origin}/e/${code}`
              };

              let pbData: any = null;

              // Fast-path: Request PoW Captcha directly to skip the wasted 428 round-trip
              const capChRes = await fetch(`${embedOrigin}/api/videos/${code}/embed/captcha`, {
                method: "POST",
                headers: embedHeaders,
                body: JSON.stringify({ fingerprint }),
                signal: AbortSignal.timeout(6000)
              }).catch(() => null);

              if (capChRes && capChRes.ok) {
                const capCh = await capChRes.json();
                const powNonce = capCh.pow_nonce || capCh.nonce;
                const powDiff = capCh.pow_difficulty || capCh.difficulty || 16;
                const powToken = capCh.pow_token || capCh.challenge_id;
                const solutionStr = solveBysePow(powNonce, powDiff);

                const capVerRes = await fetch(`${embedOrigin}/api/videos/${code}/embed/captcha/verify`, {
                  method: "POST",
                  headers: embedHeaders,
                  body: JSON.stringify({
                    pow_token: powToken,
                    solution: solutionStr,
                    fingerprint
                  }),
                  signal: AbortSignal.timeout(6000)
                });

                if (capVerRes.ok) {
                  const capVer = await capVerRes.json();
                  const captchaToken = capVer.token || capVer.captcha_token || "";
                  const pbRes = await fetch(`${embedOrigin}/api/videos/${code}/embed/playback`, {
                    method: "POST",
                    headers: {
                      ...embedHeaders,
                      "X-Captcha-Token": captchaToken
                    },
                    body: JSON.stringify({ fingerprint }),
                    signal: AbortSignal.timeout(6000)
                  });
                  pbData = await pbRes.json().catch(() => ({}));
                }
              } else {
                // Fallback if mirror does not use /embed/captcha
                const pbRes = await fetch(`${embedOrigin}/api/videos/${code}/embed/playback`, {
                  method: "POST",
                  headers: embedHeaders,
                  body: JSON.stringify({ fingerprint }),
                  signal: AbortSignal.timeout(6000)
                });
                pbData = await pbRes.json().catch(() => ({}));
              }

              if (pbData?.playback) {
                const pb = pbData.playback;
                const b64UrlToBuf = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
                const decryptPayload = (payloadB64: string, ivB64: string, kParts: string[], version?: string | number) => {
                  try {
                    const verNum = parseInt(String(version ?? "").trim(), 10);
                    let selectedParts = kParts.slice(0, 2);
                    if (verNum >= 1 && verNum <= 20 && kParts.length >= 31 - verNum) {
                      selectedParts = [kParts[verNum - 1], kParts[31 - verNum - 1]];
                    }
                    const key = Buffer.concat(selectedParts.map(b64UrlToBuf));
                    const iv = b64UrlToBuf(ivB64);
                    const raw = b64UrlToBuf(payloadB64);
                    const ct = raw.subarray(0, raw.length - 16);
                    const tag = raw.subarray(raw.length - 16);
                    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
                    decipher.setAuthTag(tag);
                    const dec = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
                    return JSON.parse(dec);
                  } catch {
                    return null;
                  }
                };

                const sourcesList: string[] = [];
                if (pb.payload && pb.iv && Array.isArray(pb.key_parts) && pb.key_parts.length >= 2) {
                  const dec1 = decryptPayload(pb.payload, pb.iv, pb.key_parts, pb.version);
                  if (Array.isArray(dec1?.sources)) {
                    for (const s of dec1.sources) {
                      if (s?.url && typeof s.url === "string") sourcesList.push(s.url);
                    }
                  }
                }
                if (pb.payload2 && pb.iv2 && Array.isArray(pb.key_parts2) && pb.key_parts2.length >= 2) {
                  const dec2 = decryptPayload(pb.payload2, pb.iv2, pb.key_parts2, pb.version2 || pb.version);
                  if (Array.isArray(dec2?.sources)) {
                    for (const s of dec2.sources) {
                      if (s?.url && typeof s.url === "string") sourcesList.push(s.url);
                    }
                  }
                }

                // Prefer edge sprintcdn / owphbf / master.m3u8 URL
                const bestM3u8 =
                  sourcesList.find((u) => !u.includes("byse") && u.includes(".m3u8")) ||
                  sourcesList.find((u) => u.includes(".m3u8")) ||
                  sourcesList[0];

                if (bestM3u8) {
                  return {
                    ok: true,
                    m3u8Url: bestM3u8,
                    headers: {
                      "Referer": `${embedOrigin}/`,
                      "Origin": embedOrigin,
                      "User-Agent": ua
                    }
                  };
                }
              }
            }
          }
        } catch (byseErr: any) {
          console.warn("[FilemoonByseExtractor] Stage 1 Byse API note:", byseErr?.message);
        }
      }

      // STAGE 2: Classic Filemoon HTML (/e/{code} -> nested /bkg/ iframe -> eval(p,a,c,k,e,d) unpacker)
      let currentUrl = sourceUrl.trim().replace(/\/d\//i, "/e/");
      let refererUrl = `${origin}/`;
      let isIframe = false;

      for (let hop = 0; hop < 4; hop++) {
        const resp = await fetch(currentUrl, {
          headers: {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": refererUrl,
            "Sec-Fetch-Dest": isIframe ? "iframe" : "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": isIframe ? "cross-site" : "none"
          },
          signal: AbortSignal.timeout(8000)
        });
        const html = await resp.text();
        if (!html) break;

        let searchPool = html.replace(/\\\//g, "/");
        if (html.includes("eval(function(p,a,c,k,e,")) {
          const pIdx = html.indexOf("eval(function(p,a,c,k,e,");
          const unpacked = unpackDeanEdwardsPacker(html.slice(pIdx));
          if (unpacked) searchPool += "\n" + unpacked;
        }

        const m3u8Matches = searchPool.match(/https?:\/\/[^\s"'<>\\`]+?\.m3u8[^\s"'<>\\`]*/gi);
        if (m3u8Matches && m3u8Matches.length > 0) {
          const valid = m3u8Matches.filter((u) => !u.includes("jwpltx") && !u.includes("ping.gif"));
          const best = valid.find((u) => u.includes("master")) || valid[0];
          if (best) {
            const pageOrigin = new URL(currentUrl).origin;
            return {
              ok: true,
              m3u8Url: best,
              headers: {
                "Referer": currentUrl,
                "Origin": pageOrigin,
                "User-Agent": ua
              }
            };
          }
        }

        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeMatch && iframeMatch[1]) {
          const nextIframe = new URL(iframeMatch[1], currentUrl).toString();
          if (nextIframe !== currentUrl && !nextIframe.includes("doubleclick") && !nextIframe.includes("popads")) {
            refererUrl = currentUrl;
            currentUrl = nextIframe;
            isIframe = true;
            continue;
          }
        }
        break;
      }

      return { ok: false, error: "Could not extract Filemoon/Byse stream" };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Filemoon/Byse extraction error" };
    }
  }

  const handleExtractStream = async (req: any, res: any) => {
    try {
      const sourceUrl = (req.body?.url || req.query?.url) as string;
      const forceRefresh = req.body?.forceRefresh === true || req.query?.forceRefresh === "true";
      const requestedDuration = Number(req.body?.duration || req.query?.duration) || 0;
      const skipSubPlaylistProbe = req.body?.fast === true || req.query?.fast === "true";

      if (!sourceUrl || typeof sourceUrl !== "string" || !sourceUrl.trim()) {
        res.status(400).json({ ok: false, error: "Source video URL is required" });
        return;
      }

      const trimmedUrl = sourceUrl.trim();
      const now = Date.now();

      // Return server-side cached link if valid
      if (!forceRefresh) {
        const cached = streamExtractionCache.get(trimmedUrl);
        if (cached && cached.expiresAt > now) {
          res.json({
            ok: true,
            m3u8Url: cached.m3u8Url,
            rawM3u8Url: (cached as any).rawM3u8Url || cached.m3u8Url,
            qualities: cached.qualities || ['1080p', '720p'],
            qualityLinks: cached.qualityLinks || { '1080p': cached.m3u8Url, '720p': cached.m3u8Url },
            rawQualityLinks: (cached as any).rawQualityLinks || cached.qualityLinks,
            downloadQualities: cached.downloadQualities || [],
            audioTracks: cached.audioTracks || ['Hindi'],
            duration: cached.duration || 1440,
            headers: (cached as any).headers,
            cached: true,
            expiresAt: cached.expiresAt,
            remainingSeconds: Math.max(0, Math.round((cached.expiresAt - now) / 1000))
          });
          return;
        }
      }

      // Direct HLS stream parsing without third-party extractor if URL is already an m3u8
      if (trimmedUrl.includes(".m3u8") || trimmedUrl.includes("m3u8")) {
        const streamMeta = await parseHlsManifestMetadata(trimmedUrl, requestedDuration, undefined, skipSubPlaylistProbe);
        const ttlMs = 170 * 60 * 1000;
        const expiresAt = now + ttlMs;

        streamExtractionCache.set(trimmedUrl, {
          m3u8Url: trimmedUrl,
          expiresAt,
          cachedAt: now,
          qualities: streamMeta.qualities,
          qualityLinks: streamMeta.qualityLinks,
          downloadQualities: streamMeta.downloadQualities,
          audioTracks: streamMeta.audioTracks,
          duration: streamMeta.duration
        });

        res.json({
          ok: true,
          m3u8Url: trimmedUrl,
          rawM3u8Url: trimmedUrl,
          qualities: streamMeta.qualities,
          qualityLinks: streamMeta.qualityLinks,
          downloadQualities: streamMeta.downloadQualities,
          audioTracks: streamMeta.audioTracks,
          duration: streamMeta.duration,
          durationFormatted: Math.floor(streamMeta.duration / 60) + ":" + (streamMeta.duration % 60).toString().padStart(2, '0'),
          cached: false,
          expiresAt,
          remainingSeconds: Math.round(ttlMs / 1000)
        });
        return;
      }

      // ====================================================================
      // DEDICATED FILEMOON / BYSE FAST PATH (byseraguci.com / filemoon.sx)
      // ====================================================================
      if (isFilemoonOrByseUrl(trimmedUrl)) {
        const fmResult = await extractFilemoonByseStream(trimmedUrl);
        if (fmResult.ok && fmResult.m3u8Url) {
          const ttlMs = 170 * 60 * 1000;
          const expiresAt = now + ttlMs;
          const customRef = fmResult.headers?.["Referer"] || "https://byseraguci.com/";
          const streamMeta = await parseHlsManifestMetadata(
            fmResult.m3u8Url,
            requestedDuration,
            customRef,
            skipSubPlaylistProbe
          );

          const host = req.get('host') || 'localhost:3000';
          const proto = (req.secure || req.headers['x-forwarded-proto'] === 'https' || host.includes('hf.space')) ? 'https' : 'http';
          const serverOrigin = `${proto}://${host}`;

          // Wrap master m3u8 in proxy for Web Browsers, while preserving rawM3u8Url for Native Kotlin APK
          const proxiedMaster = `${serverOrigin}/proxy/m3u8?url=${encodeURIComponent(fmResult.m3u8Url)}`;

          const proxiedQualityLinks: Record<string, string> = {};
          if (streamMeta.qualityLinks && typeof streamMeta.qualityLinks === 'object') {
            for (const [q, link] of Object.entries(streamMeta.qualityLinks)) {
              proxiedQualityLinks[q] = `${serverOrigin}/proxy/m3u8?url=${encodeURIComponent(link)}`;
            }
          }
          if (Object.keys(proxiedQualityLinks).length === 0) {
            proxiedQualityLinks['1080p'] = proxiedMaster;
          }

          const proxiedDownloadQualities = (streamMeta.downloadQualities || []).map((dq: any) => ({
            ...dq,
            url: `${serverOrigin}/proxy/ts?url=${encodeURIComponent(dq.url || fmResult.m3u8Url)}`
          }));

          streamExtractionCache.set(trimmedUrl, {
            m3u8Url: proxiedMaster,
            rawM3u8Url: fmResult.m3u8Url,
            rawQualityLinks: streamMeta.qualityLinks,
            headers: fmResult.headers,
            expiresAt,
            cachedAt: now,
            qualities: streamMeta.qualities,
            qualityLinks: proxiedQualityLinks,
            downloadQualities: proxiedDownloadQualities,
            audioTracks: streamMeta.audioTracks,
            duration: streamMeta.duration
          } as any);

          res.json({
            ok: true,
            m3u8Url: proxiedMaster,
            rawM3u8Url: fmResult.m3u8Url,
            qualities: streamMeta.qualities,
            qualityLinks: proxiedQualityLinks,
            rawQualityLinks: streamMeta.qualityLinks,
            downloadQualities: proxiedDownloadQualities,
            audioTracks: streamMeta.audioTracks,
            duration: streamMeta.duration,
            durationFormatted: Math.floor(streamMeta.duration / 60) + ":" + (streamMeta.duration % 60).toString().padStart(2, '0'),
            headers: fmResult.headers,
            provider: "FILEMOON",
            cached: false,
            expiresAt,
            remainingSeconds: Math.round(ttlMs / 1000)
          });
          return;
        }
      }

      const isVercelEnv = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
      const extractorKey = (process.env.VOE_EXTRACTOR_KEY || "MaxPlayMasterPass777!").trim();
      let rawBaseUrl = (process.env.VOE_EXTRACTOR_URL || "").trim();
      if (!rawBaseUrl || rawBaseUrl.includes("ltargeturl") || rawBaseUrl.includes("voe.sx")) {
        rawBaseUrl = "https://nawazkhan001-mw-hub-master.hf.space/api/extract";
      }
      if (rawBaseUrl.includes("?")) {
        rawBaseUrl = rawBaseUrl.split("?")[0].trim();
      }
      const extractorBaseUrl = rawBaseUrl;
      const apiUrl = `${extractorBaseUrl}?url=${encodeURIComponent(trimmedUrl)}&key=${encodeURIComponent(extractorKey)}`;

      // Helper to compute embed URL for known hosters like VOE / Filemoon
      const getFallbackEmbed = (urlStr: string) => {
        const lower = urlStr.toLowerCase();
        if (isFilemoonOrByseUrl(urlStr)) {
          return urlStr.replace(/\/d\//i, "/e/");
        }
        if (lower.includes("voe.") || lower.includes("voe.sx")) {
          if (urlStr.includes("/e/")) return urlStr;
          const match = urlStr.match(/https?:\/\/[^\/]+\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            const host = urlStr.split("/")[2];
            return `https://${host}/e/${match[1]}`;
          }
          return urlStr;
        }
        return "";
      };

      const fallbackEmbedUrl = getFallbackEmbed(trimmedUrl);

      // 12s on Vercel to stay within serverless function limits; 60s (1 min) elsewhere for slow extractions
      const timeoutMs = isVercelEnv ? 12000 : 60000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(apiUrl, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Accept": "application/json"
          }
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.warn("[StreamExtractor] Extractor fetch failed, checking fallback:", fetchErr?.message);
        res.status(200).json({
          ok: false,
          error: fetchErr?.name === "AbortError" ? "Extraction timeout" : (fetchErr?.message || "Extraction unreachable"),
          canFallbackToEmbed: Boolean(fallbackEmbedUrl),
          fallbackUrl: fallbackEmbedUrl || trimmedUrl,
          isEmbed: Boolean(fallbackEmbedUrl)
        });
        return;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Extractor service error (${response.status})`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error || parsed.message) {
            errMsg = parsed.error || parsed.message;
          }
        } catch {
          if (errText && errText.length < 200) errMsg = errText;
        }
        res.status(200).json({
          ok: false,
          error: errMsg,
          canFallbackToEmbed: Boolean(fallbackEmbedUrl),
          fallbackUrl: fallbackEmbedUrl || trimmedUrl,
          isEmbed: Boolean(fallbackEmbedUrl)
        });
        return;
      }

      const data = await response.json();
      const resolvedM3u8 = data?.m3u8Url || data?.url || data?.streamUrl || data?.rawVoeUrl;

      if (!data || !resolvedM3u8) {
        res.status(200).json({
          ok: false,
          error: "Stream extraction failed: Master m3u8Url not provided by extractor service",
          canFallbackToEmbed: Boolean(fallbackEmbedUrl),
          fallbackUrl: fallbackEmbedUrl || trimmedUrl,
          isEmbed: Boolean(fallbackEmbedUrl)
        });
        return;
      }

      // 170 minutes TTL (2 hours 50 minutes) ensures token refreshed before 3h expiry
      const ttlMs = 170 * 60 * 1000;
      const expiresAt = now + ttlMs;

      const streamMeta = await parseHlsManifestMetadata(resolvedM3u8, requestedDuration);

      streamExtractionCache.set(trimmedUrl, {
        m3u8Url: resolvedM3u8,
        expiresAt,
        cachedAt: now,
        qualities: streamMeta.qualities,
        qualityLinks: streamMeta.qualityLinks,
        downloadQualities: streamMeta.downloadQualities,
        audioTracks: streamMeta.audioTracks,
        duration: streamMeta.duration
      });

      // Periodic garbage collection for memory hygiene
      if (streamExtractionCache.size > 200) {
        for (const [key, val] of streamExtractionCache.entries()) {
          if (val.expiresAt <= now) {
            streamExtractionCache.delete(key);
          }
        }
      }

      res.json({
        ok: true,
        m3u8Url: resolvedM3u8,
        qualities: streamMeta.qualities,
        qualityLinks: streamMeta.qualityLinks,
        downloadQualities: streamMeta.downloadQualities,
        audioTracks: streamMeta.audioTracks,
        duration: streamMeta.duration,
        durationFormatted: Math.floor(streamMeta.duration / 60) + ":" + (streamMeta.duration % 60).toString().padStart(2, '0'),
        rawVoeUrl: data.rawVoeUrl,
        headers: data.headers,
        cached: false,
        expiresAt,
        remainingSeconds: Math.round(ttlMs / 1000)
      });
    } catch (err: any) {
      console.error("[StreamExtractor] Extraction error:", err);
      const isAbort = err.name === "AbortError";
      const u = (req.body?.url || req.query?.url || "").trim();
      let fallbackEmbed = "";
      if (isFilemoonOrByseUrl(u)) {
        fallbackEmbed = u.replace(/\/d\//i, "/e/");
      } else if (u.toLowerCase().includes("voe")) {
        if (u.includes("/e/")) {
          fallbackEmbed = u;
        } else {
          const match = u.match(/https?:\/\/[^\/]+\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            const host = u.split("/")[2];
            fallbackEmbed = `https://${host}/e/${match[1]}`;
          } else {
            fallbackEmbed = u;
          }
        }
      }

      res.status(200).json({
        ok: false,
        error: isAbort ? "Extraction service timed out" : (err.message || "Stream extraction failed"),
        canFallbackToEmbed: Boolean(fallbackEmbed),
        fallbackUrl: fallbackEmbed || u,
        isEmbed: Boolean(fallbackEmbed)
      });
    }
  };

  app.post(["/api/extract-stream", "/extract-stream"], handleExtractStream);
  app.get(["/api/extract-stream", "/extract-stream"], handleExtractStream);

  // Real offline media download stream endpoint (converts HLS to MP4 stream on the fly via ffmpeg -c copy)
  const handleDownloadMedia = async (req: any, res: any) => {
    try {
      const rawUrl = (req.query.url || req.body?.url || "") as string;
      const quality = (req.query.quality || req.body?.quality || "") as string;
      if (!rawUrl || !rawUrl.trim()) {
        res.status(400).json({ error: "Missing video URL parameter" });
        return;
      }

      let streamUrl = rawUrl.trim();

      // Resolve Filemoon / Byse URL if needed
      if (isFilemoonOrByseUrl(streamUrl)) {
        const cached = streamExtractionCache.get(streamUrl);
        if (cached && cached.m3u8Url) {
          streamUrl = cached.m3u8Url;
          if (quality && cached.qualityLinks && cached.qualityLinks[quality]) {
            streamUrl = cached.qualityLinks[quality];
          }
        } else {
          const fmRes = await extractFilemoonByseStream(streamUrl);
          if (fmRes.ok && fmRes.m3u8Url) {
            streamUrl = fmRes.m3u8Url;
          }
        }
      } else if (
        streamUrl.includes("voe.sx") ||
        streamUrl.includes("voe.") ||
        streamUrl.includes("cloudwindow-route") ||
        streamUrl.includes("reputationsickler") ||
        streamUrl.includes("turtledoveconsequent")
      ) {
        const cached = streamExtractionCache.get(streamUrl);
        if (cached && cached.m3u8Url) {
          streamUrl = cached.m3u8Url;
          if (quality && cached.qualityLinks && cached.qualityLinks[quality]) {
            streamUrl = cached.qualityLinks[quality];
          }
        } else {
          const extractorKey = (process.env.VOE_EXTRACTOR_KEY || "MaxPlayMasterPass777!").trim();
          let rawBaseUrl = (process.env.VOE_EXTRACTOR_URL || "").trim();
          if (!rawBaseUrl || rawBaseUrl.includes("ltargeturl") || rawBaseUrl.includes("voe.sx")) {
            rawBaseUrl = "https://nawazkhan001-mw-hub-master.hf.space/api/extract";
          }
          if (rawBaseUrl.includes("?")) rawBaseUrl = rawBaseUrl.split("?")[0].trim();
          const apiUrl = `${rawBaseUrl}?url=${encodeURIComponent(streamUrl)}&key=${encodeURIComponent(extractorKey)}`;
          try {
            const resp = await fetch(apiUrl);
            if (resp.ok) {
              const data = await resp.json();
              if (data && (data.m3u8Url || data.url)) {
                streamUrl = data.m3u8Url || data.url;
              }
            }
          } catch (_) {}
        }
      }

      // Check if it is an HLS playlist (m3u8)
      if (streamUrl.includes(".m3u8") || streamUrl.includes("m3u8")) {
        try {
          const meta = await parseHlsManifestMetadata(streamUrl);
          if (quality && meta.qualityLinks && meta.qualityLinks[quality]) {
            const candidate = meta.qualityLinks[quality];
            if (candidate && candidate.startsWith("http")) {
              streamUrl = candidate;
            }
          } else if (meta.downloadQualities && meta.downloadQualities.length > 0) {
            const matched = meta.downloadQualities.find((q: any) => q.id === quality) || meta.downloadQualities[0];
            if (matched && matched.url && matched.url.startsWith("http")) {
              streamUrl = matched.url;
            }
          }
        } catch (_) {}

        // Check if ffmpeg binary exists on this environment (e.g. AI Studio vs Vercel Serverless)
        let hasFfmpeg = true;
        try {
          execSync("ffmpeg -version", { stdio: "ignore" });
        } catch (_) {
          hasFfmpeg = false;
        }

        if (!hasFfmpeg) {
          res.status(200).json({
            ok: false,
            fallbackClientSide: true,
            streamUrl,
            error: "FFMPEG_UNAVAILABLE_ON_SERVERLESS",
            message: "FFmpeg binary is not installed on this serverless environment. Client-side HLS downloader will process this stream."
          });
          return;
        }

        // Use ffmpeg to stream remuxed fragmented MP4
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", 'attachment; filename="maxplay_download.mp4"');
        res.setHeader("Accept-Ranges", "bytes");

        const ffmpegArgs = [
          "-y",
          "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n",
          "-i", streamUrl,
          "-map", "0:v:0?",
          "-map", "0:a:0?",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "frag_keyframe+empty_moov+default_base_moof",
          "-f", "mp4",
          "pipe:1"
        ];

        const ffmpegProc = spawn("ffmpeg", ffmpegArgs);

        req.on("close", () => {
          try { ffmpegProc.kill("SIGKILL"); } catch (_) {}
        });

        ffmpegProc.stdout.pipe(res);

        let stderrLog = "";
        ffmpegProc.stderr.on("data", (chunk) => {
          stderrLog += chunk.toString();
        });
        ffmpegProc.on("close", (code) => {
          if (code !== 0 && !res.writableEnded && !res.headersSent) {
            console.error(`[DownloadMedia] FFmpeg exited with code ${code}: ${stderrLog.slice(-300)}`);
            res.status(500).json({ error: "FFmpeg conversion error" });
          }
        });
        ffmpegProc.on("error", (err) => {
          console.error("[DownloadMedia] FFmpeg spawn error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "FFmpeg streaming error" });
          }
        });
      } else {
        // Direct MP4 or video source
        let directResp = await fetch(streamUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*"
          }
        });
        if (!directResp.ok && (directResp.status === 403 || directResp.status === 401)) {
          // Retry with bare fetch if server blocks custom headers
          directResp = await fetch(streamUrl);
        }
        if (!directResp.ok) {
          res.status(directResp.status).json({ error: `Failed to fetch direct video source (HTTP ${directResp.status})` });
          return;
        }
        res.setHeader("Content-Type", directResp.headers.get("content-type") || "video/mp4");
        if (directResp.headers.get("content-length")) {
          res.setHeader("Content-Length", directResp.headers.get("content-length")!);
        }
        res.setHeader("Content-Disposition", 'attachment; filename="maxplay_download.mp4"');

        if (directResp.body) {
          const reader = (directResp.body as any).getReader();
          req.on("close", () => {
            try { reader.cancel(); } catch (_) {}
          });
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          const buffer = await directResp.arrayBuffer();
          res.send(Buffer.from(buffer));
        }
      }
    } catch (err: any) {
      console.error("[DownloadMedia] Handler error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Download stream error" });
      }
    }
  };

  app.get(["/api/download-media", "/api/download-stream"], handleDownloadMedia);
  app.post(["/api/download-media", "/api/download-stream"], handleDownloadMedia);

  // Dedicated Filemoon / Byse / HLS Playlist Proxy & Rewriter
  const handleProxyM3u8 = async (req: any, res: any) => {
    try {
      const targetUrl = (req.query.url as string || "").trim();
      if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
        res.status(400).send("#EXTM3U\n# Missing or invalid url");
        return;
      }

      const host = req.get("host") || "localhost:3000";
      const proto = (req.secure || req.headers["x-forwarded-proto"] === "https" || host.includes("hf.space")) ? "https" : "http";
      const serverOrigin = `${proto}://${host}`;

      let referer = (req.query.referer as string || "").trim();
      if (!referer) {
        try {
          const u = new URL(targetUrl);
          if (u.hostname.includes("sprintcdn") || u.hostname.includes("owphbf") || u.hostname.includes("filemoon") || u.hostname.includes("byse")) {
            referer = "https://byseraguci.com/";
          } else {
            referer = `${u.origin}/`;
          }
        } catch {
          referer = "https://byseraguci.com/";
        }
      }

      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": referer,
          "Accept": "*/*"
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!upstream.ok) {
        res.status(upstream.status).send(`#EXTM3U\n# Upstream responded with ${upstream.status}`);
        return;
      }

      const text = await upstream.text();
      const lines = text.split("\n");
      const rewrittenLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          rewrittenLines.push("");
          continue;
        }

        if (line.startsWith("#")) {
          // Check for #EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES/...URI="..."
          if (line.startsWith("#EXT-X-MEDIA") && line.includes('URI="')) {
            line = line.replace(/URI="([^"]+)"/, (_match, uri) => {
              const full = joinHlsUrl(uri, targetUrl);
              return `URI="${serverOrigin}/proxy/m3u8?url=${encodeURIComponent(full)}"`;
            });
          }
          // Check for #EXT-X-KEY:METHOD=...,URI="..."
          else if (line.startsWith("#EXT-X-KEY") && line.includes('URI="')) {
            line = line.replace(/URI="([^"]+)"/, (_match, uri) => {
              const full = joinHlsUrl(uri, targetUrl);
              return `URI="${serverOrigin}/proxy/ts?url=${encodeURIComponent(full)}"`;
            });
          }
          // Check for #EXT-X-I-FRAME-STREAM-INF:...URI="..."
          else if (line.startsWith("#EXT-X-I-FRAME-STREAM-INF") && line.includes('URI="')) {
            line = line.replace(/URI="([^"]+)"/, (_match, uri) => {
              const full = joinHlsUrl(uri, targetUrl);
              return `URI="${serverOrigin}/proxy/m3u8?url=${encodeURIComponent(full)}"`;
            });
          }
          rewrittenLines.push(line);
        } else {
          // Line is a URL (variant playlist or media segment)
          const fullUrl = joinHlsUrl(line, targetUrl);
          if (fullUrl.includes(".m3u8") || fullUrl.includes("m3u8")) {
            rewrittenLines.push(`${serverOrigin}/proxy/m3u8?url=${encodeURIComponent(fullUrl)}`);
          } else {
            rewrittenLines.push(`${serverOrigin}/proxy/ts?url=${encodeURIComponent(fullUrl)}`);
          }
        }
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(rewrittenLines.join("\n"));
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).send(`#EXTM3U\n# Proxy error: ${err.message}`);
      }
    }
  };

  app.get(["/proxy/m3u8", "/api/proxy/m3u8"], handleProxyM3u8);
  app.options(["/proxy/m3u8", "/api/proxy/m3u8"], (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.sendStatus(204);
  });

  // Dedicated TS Segment Proxy with Range Header & Streaming Support
  const handleProxyTs = async (req: any, res: any) => {
    try {
      const targetUrl = (req.query.url as string || "").trim();
      if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
        res.status(400).json({ error: "Missing or invalid url parameter" });
        return;
      }

      let referer = (req.query.referer as string || "").trim();
      if (!referer) {
        try {
          const u = new URL(targetUrl);
          if (u.hostname.includes("sprintcdn") || u.hostname.includes("owphbf") || u.hostname.includes("filemoon") || u.hostname.includes("byse")) {
            referer = "https://byseraguci.com/";
          } else {
            referer = `${u.origin}/`;
          }
        } catch {
          referer = "https://byseraguci.com/";
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "*/*"
      };

      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const upstream = await fetch(targetUrl, {
        headers,
        signal: AbortSignal.timeout(30000)
      });

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Accept-Ranges", "bytes");

      if (upstream.headers.get("content-type")) {
        res.setHeader("Content-Type", upstream.headers.get("content-type")!);
      } else {
        res.setHeader("Content-Type", "video/mp2t");
      }
      if (upstream.headers.get("content-length")) {
        res.setHeader("Content-Length", upstream.headers.get("content-length")!);
      }
      if (upstream.headers.get("content-range")) {
        res.setHeader("Content-Range", upstream.headers.get("content-range")!);
      }

      res.status(upstream.status);
      if (upstream.body) {
        const { Readable } = await import("stream");
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.pipe(res);
      } else {
        const arrayBuf = await upstream.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "TS proxy segment error" });
      }
    }
  };

  app.get(["/proxy/ts", "/api/proxy/ts"], handleProxyTs);
  app.options(["/proxy/ts", "/api/proxy/ts"], (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.sendStatus(204);
  });

  // Lightweight CORS proxy for individual HLS segments & media requests (fast, <300ms, Vercel safe)
  app.get(["/api/proxy", "/proxy"], async (req, res) => {
    try {
      const targetUrl = (req.query.url as string || "").trim();
      if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
        res.status(400).json({ error: "Missing or invalid url parameter" });
        return;
      }
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*"
        }
      });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (upstream.headers.get("content-type")) {
        res.setHeader("Content-Type", upstream.headers.get("content-type")!);
      }
      if (upstream.headers.get("content-length")) {
        res.setHeader("Content-Length", upstream.headers.get("content-length")!);
      }
      if (upstream.headers.get("accept-ranges")) {
        res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges")!);
      }
      const arrayBuf = await upstream.arrayBuffer();
      res.status(upstream.status).send(Buffer.from(arrayBuf));
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Proxy request failed" });
      }
    }
  });
  app.options(["/api/proxy", "/proxy"], (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.sendStatus(204);
  });

  // TMDB Key Verification & Search Endpoints
  app.post("/api/tmdb/verify", async (req, res) => {
    try {
      const apiKey = req.body.apiKey || process.env.TMDB_API_KEY;
      if (!apiKey || apiKey === "paste_your_api_key_here") {
        res.status(400).json({ ok: false, error: "TMDB API Key is required" });
        return;
      }

      const testUrl = `https://api.themoviedb.org/3/authentication?api_key=${apiKey}`;
      const tmdbRes = await fetch(testUrl);
      const data = await tmdbRes.json();

      if (tmdbRes.ok && data.success) {
        res.json({ ok: true, message: "TMDB API Key verified successfully!" });
      } else {
        res.status(400).json({ ok: false, error: data.status_message || "Invalid TMDB API Key" });
      }
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message || "Could not reach TMDB API" });
    }
  });

  app.get("/api/tmdb/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const apiKey = (req.query.apiKey as string) || process.env.TMDB_API_KEY;
      if (!query.trim()) {
        res.status(400).json({ error: "Search query required" });
        return;
      }
      if (!apiKey || apiKey === "paste_your_api_key_here") {
        res.status(400).json({ error: "TMDB API Key not configured" });
        return;
      }

      const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
      const tmdbRes = await fetch(tmdbUrl);
      if (!tmdbRes.ok) {
        const errData = await tmdbRes.json();
        res.status(tmdbRes.status).json({ error: errData.status_message || "TMDB Search Failed" });
        return;
      }

      const data = await tmdbRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to search TMDB" });
    }
  });

  // Admin AI Co-Pilot Endpoint
  app.post("/api/ai/admin-copilot", async (req, res) => {
    try {
      const { prompt, context, voice, elevenlabsApiKey, elevenlabsVoiceId } = req.body;
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        res.status(400).json({ error: "Prompt string is required" });
        return;
      }

      const ai = getGenAI();

      
      let enhancedContext = { ...(context || {}) };
      const TMDB_API_KEY = process.env.TMDB_API_KEY || context?.tmdbApiKey || (context?.systemSettings && context.systemSettings.tmdbApiKey);

      // Genre ID mapping for TMDB
      const TMDB_GENRES: Record<number, string> = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
        99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
        27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
        10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
        10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
      };

      // Helper to format seconds into MM:SS or HH:MM:SS
      const formatDurationSec = (sec: number): string => {
        if (!sec || isNaN(sec) || sec <= 0) return "23:40";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) {
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };

      // 1. Directives & Intent Extraction from Boss Prompt
      const urlMatches = prompt.match(/https?:\/\/[^\s"'<>)\]]+/g) || [];

      const isLoyaltyOrFunRequest = /\b(meow|meao|mew|billi|bark|bhau|sing|gaana|nacho|dance|wafadar|wafaadari|loyal|loyalty|tareef|praise|kuch\s*bolo|kuch\s*bol)\b/i.test(prompt);

      // Word to number helper for Hindi and English numerals
      const wordToNumMap: Record<string, number> = {
        ek: 1, one: 1,
        do: 2, dono: 2, donon: 2, two: 2,
        teen: 3, teeno: 3, three: 3,
        char: 4, chaar: 4, four: 4,
        paanch: 5, panch: 5, five: 5,
        che: 6, chhah: 6, six: 6,
        saat: 7, seven: 7,
        aath: 8, eight: 8,
        nau: 9, nine: 9,
        das: 10, ten: 10,
        gyarah: 11, barah: 12, baarah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, chaubees: 24, pachees: 25
      };

      // Voice selection
      const selectedVoice = voice || req.body.voice || "Kore";

      // 1.A Base / Global Target Video Qualities
      const targetQualities: string[] = [];
      const globalSelectedMatch = prompt.match(/(?:(?:per|global|default)?\s*selected\s*quality\s*(?:ke\s*liye\s*)?(?:rakhi\s*gai\s*hai|hai|rakho)?\s*(1080p?|720p?|480p?|360p?|4k|2k))/i)
        || prompt.match(/(?:quality\s*(?:selected\s*)?(720p?|1080p?|480p?|360p?|4k)[^.\n,]*?rakhi\s*gai\s*hai)/i)
        || prompt.match(/(?:per\s*selected\s*quality\s*(720p?|1080p?|480p?|360p?|4k))/i)
        || prompt.match(/(?:baki\s*(?:sab\s*)?|global\s*quality\s*)(720p?|1080p?|480p?|360p?|4k)/i);

      if (globalSelectedMatch) {
        let baseQ = globalSelectedMatch[1].toLowerCase();
        if (/^\d+$/.test(baseQ)) baseQ += "p";
        targetQualities.push(baseQ);
      } else if (/\b(all\s*qualit|sab\s*qualit|saari\s*qualit|har\s*qualit)\b/i.test(prompt)) {
        targetQualities.push("1080p", "720p", "480p", "360p");
      } else {
        // Exclude episode-specific phrases when detecting global qualities
        const generalPrompt = prompt.replace(/(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:1080p?|720p?|480p?|360p?|4k|2k)/gi, "");
        if (/\b(1080p?|fhd|full\s*hd)\b/i.test(generalPrompt)) targetQualities.push("1080p");
        if (/\b(720p?)\b/i.test(generalPrompt) || (/\bhd\b/i.test(generalPrompt) && !/full\s*hd|fhd/i.test(generalPrompt))) targetQualities.push("720p");
        if (/\b(480p?|sd)\b/i.test(generalPrompt)) targetQualities.push("480p");
        if (/\b(360p?)\b/i.test(generalPrompt)) targetQualities.push("360p");
        if (/\b(4k|2160p?)\b/i.test(generalPrompt)) targetQualities.push("4k");
      }
      if (targetQualities.length === 0) {
        targetQualities.push("720p");
      }

      // Per-Episode Isolated Quality Overrides (e.g. "episode 1 me 2 part hai per selected quality 720p rakhi gai hai... episode 1 ke liye quickly 1080p rakhna hai")
      const episodeQualitiesMap: Record<number, string[]> = {};
      const epQualityPatterns = [
        /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:ke\s*liye\s*)?(?:quickly\s*)?(?:quality\s*)?(1080p?|720p?|480p?|360p?|4k|2k)[^.\n,]*?(?:rakhna|rakho|laga|box|hoga|karna|chahiye)/gi,
        /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:me|mein|par|ki)?\s*(?:quality\s*)?(?:quickly\s*)?(1080p?|720p?|480p?|360p?|4k|2k)/gi,
        /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:720p?|1080p?|480p?)\s*(?:hata|delete|remove)[^.\n,]*?(1080p?|720p?|480p?|4k)/gi,
        /(?:quickly\s*)?(1080p?|720p?|480p?|4k)\s*(?:rakhna\s*hai|laga\s*do|box\s*bana|quality\s*rakho)[^.\n,]*?(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?/gi
      ];

      epQualityPatterns.forEach(pat => {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(prompt)) !== null) {
          const epN = m[1] ? parseInt(m[1], 10) : 1;
          let qVal = (m[2] || m[1]).toLowerCase();
          if (/^\d+$/.test(qVal)) qVal += "p";
          if (qVal === "1080" || qVal === "1080p") qVal = "1080p";
          if (qVal === "720" || qVal === "720p") qVal = "720p";
          if (qVal === "480" || qVal === "480p") qVal = "480p";
          if (qVal === "360" || qVal === "360p") qVal = "360p";
          if (['1080p', '720p', '480p', '360p', '4k', '2k'].includes(qVal)) {
            // When an episode override is specified, replace default with this isolated quality
            if (!episodeQualitiesMap[epN]) episodeQualitiesMap[epN] = [];
            if (!episodeQualitiesMap[epN].includes(qVal)) episodeQualitiesMap[epN].push(qVal);
          }
        }
      });

      // Also detect complex patterns: "quality selected 720p ... episode 4 ... 1080p"
      const complexOverrideRegex = /(?:quality\s*(?:selected\s*)?(720p?|1080p?|480p?)[^.\n,]*?(?:lekin|par|aur|baki)\s*(?:episode|ep)\s*(\d+)[^.\n,]*?(1080p?|720p?|480p?|4k))/gi;
      let coMatch: RegExpExecArray | null;
      while ((coMatch = complexOverrideRegex.exec(prompt)) !== null) {
        const baseQ = coMatch[1].toLowerCase().replace(/(\d+)$/, '$1p');
        const epN = parseInt(coMatch[2], 10);
        const overQ = coMatch[3].toLowerCase().replace(/(\d+)$/, '$1p');
        if (!targetQualities.includes(baseQ)) {
          targetQualities.length = 0;
          targetQualities.push(baseQ);
        }
        episodeQualitiesMap[epN] = [overQ];
      }

      // Per-Episode Parts: e.g. "use episode 1 Me 2 part hai", "episode 3 me 3 parts honge"
      const episodePartsMap: Record<number, number> = {};
      const epPartsPatterns = [
        /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:me|mein|par|ke\s*liye)?\s*(?:mein\s*)?(\d+|ek|do|dono|teen|chaar|two|three|four)\s*parts?/gi,
        /(\d+|ek|do|dono|teen|chaar|two|three|four)\s*parts?[^.\n,]*?(?:honge|karna|rakhna|bana|hai|rakho).*?(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?/gi
      ];
      epPartsPatterns.forEach(pat => {
        let m: RegExpExecArray | null;
        while ((m = pat.exec(prompt)) !== null) {
          let epN = 1;
          let rawP = "";
          if (m[2] && isNaN(Number(m[1])) && !isNaN(Number(m[2]))) {
            rawP = m[1].toLowerCase();
            epN = parseInt(m[2], 10);
          } else if (m[1] && m[2]) {
            epN = parseInt(m[1], 10) || 1;
            rawP = m[2].toLowerCase();
          } else if (m[1]) {
            rawP = m[1].toLowerCase();
          }
          const pCnt = wordToNumMap[rawP] || parseInt(rawP, 10) || 2;
          episodePartsMap[epN] = pCnt;
        }
      });

      // Per-Episode Skip Markers: e.g. "episode 1 intro 0 to 90", "episode 2 me intro skip 15s se 95s aur outro 1320 se 1400"
      const episodeSkipMarkersMap: Record<number, { intro?: { start: number; end: number }; outro?: { start: number; end: number }; credits?: { start: number; end: number } }> = {};
      
      const epIntroRegex = /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:intro|opening|op)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/gi;
      let eim: RegExpExecArray | null;
      while ((eim = epIntroRegex.exec(prompt)) !== null) {
        const epN = eim[1] ? parseInt(eim[1], 10) : 1;
        const s = parseInt(eim[2], 10);
        const e = parseInt(eim[3], 10);
        if (!isNaN(s) && !isNaN(e)) {
          if (!episodeSkipMarkersMap[epN]) episodeSkipMarkersMap[epN] = {};
          episodeSkipMarkersMap[epN].intro = { start: s, end: e };
        }
      }

      const epOutroRegex = /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:outro|ending|ed)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/gi;
      let eom: RegExpExecArray | null;
      while ((eom = epOutroRegex.exec(prompt)) !== null) {
        const epN = eom[1] ? parseInt(eom[1], 10) : 1;
        const s = parseInt(eom[2], 10);
        const e = parseInt(eom[3], 10);
        if (!isNaN(s) && !isNaN(e)) {
          if (!episodeSkipMarkersMap[epN]) episodeSkipMarkersMap[epN] = {};
          episodeSkipMarkersMap[epN].outro = { start: s, end: e };
        }
      }

      const epCreditsRegex = /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:credits)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/gi;
      let ecm: RegExpExecArray | null;
      while ((ecm = epCreditsRegex.exec(prompt)) !== null) {
        const epN = ecm[1] ? parseInt(ecm[1], 10) : 1;
        const s = parseInt(ecm[2], 10);
        const e = parseInt(ecm[3], 10);
        if (!isNaN(s) && !isNaN(e)) {
          if (!episodeSkipMarkersMap[epN]) episodeSkipMarkersMap[epN] = {};
          episodeSkipMarkersMap[epN].credits = { start: s, end: e };
        }
      }

      // Check if any episode specifically says "no intro skip" / "intro skip nahi hai"
      const noIntroRegex = /(?:(?:use\s*episode|iss?\s*episode|is\s*(?:wale)?\s*episode|episode|ep)\s*(\d+)?)[^.\n,]*?(?:intro\s*(?:skip)?\s*(?:nahi|hata|mat|no))/gi;
      let nim: RegExpExecArray | null;
      while ((nim = noIntroRegex.exec(prompt)) !== null) {
        const epN = nim[1] ? parseInt(nim[1], 10) : 1;
        if (!episodeSkipMarkersMap[epN]) episodeSkipMarkersMap[epN] = {};
        delete episodeSkipMarkersMap[epN].intro;
      }

      // All active qualities across the show
      const allActiveQualities = Array.from(new Set([
        ...targetQualities,
        ...Object.values(episodeQualitiesMap).flat()
      ]));

      // 1.B Target Audio Languages ("anime Hindi language ko hi select karna hai")
      const targetLanguages: string[] = [];
      const hasStrictHindi = /(?:sirf\s*hindi|hindi\s*(?:language\s*)?(?:ko\s*hi\s*select|only|hi\s*rakhna|hi\s*chahiye|hi\s*rakho)|hindi\s*audio\s*only)/i.test(prompt);
      if (hasStrictHindi) {
        targetLanguages.push("Hindi");
      } else if (/\b(dual\s*audio)\b/i.test(prompt)) {
        targetLanguages.push("Hindi", "Japanese");
      } else {
        if (/\b(hindi|hind)\b/i.test(prompt)) targetLanguages.push("Hindi");
        if (/\b(japanese|jap|japani)\b/i.test(prompt)) targetLanguages.push("Japanese");
        if (/\b(english|eng)\b/i.test(prompt)) targetLanguages.push("English");
        if (/\b(urdu)\b/i.test(prompt)) targetLanguages.push("Urdu");
        if (/\b(tamil)\b/i.test(prompt)) targetLanguages.push("Tamil");
        if (/\b(telugu)\b/i.test(prompt)) targetLanguages.push("Telugu");
        if (/\b(korean|kor)\b/i.test(prompt)) targetLanguages.push("Korean");
        if (/\b(malayalam)\b/i.test(prompt)) targetLanguages.push("Malayalam");
        if (/\b(kannada)\b/i.test(prompt)) targetLanguages.push("Kannada");
        if (/\b(bengali)\b/i.test(prompt)) targetLanguages.push("Bengali");
        if (/\b(spanish)\b/i.test(prompt)) targetLanguages.push("Spanish");
      }
      if (targetLanguages.length === 0) {
        targetLanguages.push("Hindi");
      }

      // 1.C Helper for Text Normalization
      const normalizeText = (str: string): string => {
        if (!str) return "";
        return str.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
      };

      // 1.D Advanced Target Content Pinpointing Engine
      const library = Array.isArray(enhancedContext?.contentLibrary) ? enhancedContext.contentLibrary : [];
      const currentDraft = enhancedContext?.currentDraft;
      const editingId = enhancedContext?.editingContentId || currentDraft?.id;

      const findTargetContent = (p: string): { target: any; isCurrentDraft: boolean; matchType: string } | null => {
        const normPrompt = normalizeText(p);

        // Deictic indicators in Hindi & English
        const isDeictic = /\b(ye|is|iss|yahi|yehi|isme|is\s*me|in\s*me|ye\s*anime|is\s*anime|iss\s*anime|ye\s*series|is\s*series|iss\s*series|ye\s*show|is\s*show|ye\s*movie|is\s*movie|ye\s*content|is\s*content|current|active|open|khula|jo\s*chal\s*raha|jo\s*load\s*hai|form\s*wala|upload\s*wala|this\s*anime|this\s*series|this\s*movie|this\s*show|this\s*content)\b/i.test(p);

        // 1. If deictic, prioritize currently active / editing draft
        if (isDeictic) {
          if (editingId && library.length > 0) {
            const match = library.find((item: any) => item.id === editingId);
            if (match) return { target: match, isCurrentDraft: true, matchType: 'active_editing_id' };
          }
          if (currentDraft && currentDraft.title && currentDraft.title.trim()) {
            return {
              target: {
                id: editingId || 'current-draft',
                title: currentDraft.title,
                type: currentDraft.type || (enhancedContext?.uploadMode || 'anime'),
                seasonsCount: currentDraft.seasonsCount || 1,
                episodesCount: currentDraft.totalEpisodesCount || currentDraft.activeSeasonEpisodesCount || 12,
                languages: currentDraft.activeLanguages || ['Hindi'],
                qualities: currentDraft.activeQualities || ['1080p', '720p']
              },
              isCurrentDraft: true,
              matchType: 'current_draft_in_form'
            };
          }
        }

        // 2. Search Database Library for exact, base, or token overlap
        if (library.length > 0) {
          // A. Exact normalized title match
          for (const item of library) {
            if (!item || !item.title) continue;
            const normTitle = normalizeText(item.title);
            if (normTitle && normPrompt.includes(normTitle)) {
              return { target: item, isCurrentDraft: (editingId === item.id), matchType: 'exact_title' };
            }
          }

          // B. Base title match (without Season/Part suffix)
          for (const item of library) {
            if (!item || !item.title) continue;
            const baseTitle = item.title.replace(/\b(season\s*\d+|s\d+|part\s*\d+)\b/gi, "").trim();
            const normBase = normalizeText(baseTitle);
            if (normBase.length >= 3 && normPrompt.includes(normBase)) {
              return { target: item, isCurrentDraft: (editingId === item.id), matchType: 'base_title' };
            }
          }

          // C. Token overlap
          let bestScore = 0;
          let bestMatch: any = null;
          const promptWords = normPrompt.split(/\s+/).filter((w: string) => w.length > 2);

          for (const item of library) {
            if (!item || !item.title) continue;
            const titleWords = normalizeText(item.title).split(/\s+/).filter((w: string) => w.length > 2);
            if (titleWords.length === 0) continue;

            let matchCount = 0;
            for (const tw of titleWords) {
              if (promptWords.includes(tw)) matchCount++;
            }

            let score = matchCount / titleWords.length;
            if (/\banime\b/i.test(p) && item.type === 'anime') score += 0.25;
            if (/\bmovie\b/i.test(p) && item.type === 'movie') score += 0.25;
            if (/\bseries\b/i.test(p) && (item.type === 'tv' || item.type === 'anime')) score += 0.15;

            if (matchCount >= 2 || (titleWords.length === 1 && matchCount === 1)) {
              if (score > bestScore) {
                bestScore = score;
                bestMatch = item;
              }
            }
          }

          if (bestMatch && bestScore >= 0.5) {
            return { target: bestMatch, isCurrentDraft: (editingId === bestMatch.id), matchType: 'token_overlap' };
          }

          // D. Deictic fallback to sole or first anime / library item
          if (isDeictic) {
            const animes = library.filter((i: any) => i.type === 'anime');
            if (animes.length === 1 && /\banime\b/i.test(p)) {
              return { target: animes[0], isCurrentDraft: (editingId === animes[0].id), matchType: 'sole_anime_in_library' };
            }
            if (library.length === 1) {
              return { target: library[0], isCurrentDraft: (editingId === library[0].id), matchType: 'sole_item_in_library' };
            }
            if (animes.length > 0 && /\banime\b/i.test(p)) {
              return { target: animes[0], isCurrentDraft: (editingId === animes[0].id), matchType: 'first_anime_in_library' };
            }
          }
        }

        // 3. Fallback to active draft in form if upload screen has active title or episodes
        if (currentDraft && (currentDraft.title || (enhancedContext?.activeTab === 'upload' && currentDraft.activeSeasonEpisodesCount > 0))) {
          return {
            target: {
              id: editingId || 'current-draft',
              title: currentDraft.title || 'Current Media',
              type: currentDraft.type || (enhancedContext?.uploadMode || 'anime'),
              seasonsCount: currentDraft.seasonsCount || 1,
              episodesCount: currentDraft.totalEpisodesCount || currentDraft.activeSeasonEpisodesCount || 12,
              languages: currentDraft.activeLanguages || ['Hindi'],
              qualities: currentDraft.activeQualities || ['1080p', '720p']
            },
            isCurrentDraft: true,
            matchType: 'fallback_active_draft'
          };
        }

        return null;
      };

      const matchedTarget = findTargetContent(prompt);
      let matchedContent: any = matchedTarget ? matchedTarget.target : null;

      // 1.E Advanced Content Edit Intent & Operation Detection (Supporting Multi-Season, Specific Seasons & All Edits)
      const hasModificationAction = /\b(hata\s*do|hota\s*do|hataa\s*do|hatao|hata|remove|delete|mita\s*do|nikal\s*do|clear|clear\s*karo|erase|saaf\s*karo|nahi\s*chahiye|mat\s*lagao|mat\s*rakho|nahi\s*rakhna|replace|badal\s*do|badlo|swap|change|laga\s*do|lagao|add\s*karo|add|set\s*karo|set|rakh\s*do|daal\s*do|dal\s*do|kar\s*dena|kar\s*do|karna)\b/i.test(prompt);
      const hasQualityToken = /\b(1080p?|720p?|480p?|360p?|4k|2k|quality|qualities)\b/i.test(prompt);
      const hasPartToken = /\b(part|parts|bhag)\b/i.test(prompt);
      const hasSkipToken = /\b(skip\s*markers?|skip\s*marker|skip|intro|outro|credits)\b/i.test(prompt);
      const hasMetadataToken = /\b(rating|year|country|genre|genres|title|naam|description)\b/i.test(prompt);
      const hasSeasonToken = /\b(season|seasons)\b/i.test(prompt);
      const wantsToSaveLive = /\b(save|publish|live|update\s*karo|save\s*kar\s*do|publish\s*kar\s*do|save\s*karo|live\s*karo)\b/i.test(prompt);

      const isAddSeasonIntent = /\b(naya\s*season|add\s*season|create\s*season|season\s*\d+\s*(?:add|create|banao)|aur\s*ek\s*season)\b/i.test(prompt);
      const isSwitchSeasonOnly = /\b(?:season|s)\s*(\d+)\s*(?:dikhao|kholo|open|le\s*jao|switch|par\s*jao|pe\s*jao)\b/i.test(prompt) && !hasModificationAction && !hasQualityToken && !hasSkipToken;

      // Handle pure season switch view requests
      if (isSwitchSeasonOnly) {
        const sNumMatch = prompt.match(/(?:season|s)\s*(\d+)/i);
        const sNum = sNumMatch ? parseInt(sNumMatch[1], 10) : 1;
        return res.json({
          thought: `Switched active view to Season ${sNum}.`,
          intent: "content_edit",
          reply: `Haan Boss! Maine view **Season ${sNum}** par switch kar diya hai. Step 2 me Season ${sNum} ke saare episodes inspect kar sakte hain!`,
          voiceUsed: selectedVoice,
          suggestionChips: [
            { label: `⏩ Season ${sNum} Skip Markers Hatao`, prompt: `Season ${sNum} me skip markers hata do` },
            { label: `🎬 Season ${sNum} 1080p Set Karo`, prompt: `Season ${sNum} me 1080p lagao` },
            { label: `📋 Step 3: Review Summary`, prompt: `Review summary open karo` }
          ],
          summary: [`Switched active view to Season ${sNum}`],
          actions: [
            { type: "SWITCH_SEASON", data: { seasonNumber: sNum } },
            { type: "GO_TO_STEP", step: 2 }
          ]
        });
      }

      const isContentEditCommand = !isLoyaltyOrFunRequest && 
        (hasModificationAction || isAddSeasonIntent) && 
        (hasSkipToken || hasQualityToken || hasPartToken || hasMetadataToken || hasSeasonToken || isAddSeasonIntent) && 
        (matchedTarget !== null || (enhancedContext?.currentDraft && (enhancedContext.currentDraft.activeSeasonEpisodesCount > 0 || enhancedContext.currentDraft.seasonsCount > 0)));

      if (isContentEditCommand) {
        const targetObj = matchedTarget ? matchedTarget.target : { title: "Current Media", type: "anime" };
        const targetTitle = targetObj.title || "Current Media";
        const targetType = targetObj.type === "movie" ? "Movie" : (targetObj.type === "anime" ? "Anime Series" : "Web Series");

        // Helper to parse specifications from a specific text clause
        const parseClauseSpecs = (clauseText: string) => {
          let skipMarkers: any = undefined;
          const isRemoveAllSkip = /\b(jitne\s*(?:bhi)?(?:\s*set)?|saare|sabhi|sab\s*ko|sab|all|total|poore|pure|har\s*ek|koi\s*bhi|sabko)\b/i.test(clauseText) &&
            /\b(hata\s*do|hota\s*do|hataa\s*do|hatao|hata|remove|delete|mita\s*do|nikal\s*do|clear|clear\s*karo|erase|saaf\s*karo)\b/i.test(clauseText);

          const clauseHasSkip = /\b(skip\s*markers?|skip\s*marker|skip|intro|outro|credits)\b/i.test(clauseText);
          const clauseHasMod = /\b(hata\s*do|hota\s*do|hataa\s*do|hatao|hata|remove|delete|mita\s*do|nikal\s*do|clear|clear\s*karo|erase|saaf\s*karo|nahi\s*chahiye|mat\s*lagao|mat\s*rakho|nahi\s*rakhna|replace|badal\s*do|badlo|swap|change|laga\s*do|lagao|add\s*karo|add|set\s*karo|set|rakh\s*do|daal\s*do|dal\s*do|kar\s*dena|kar\s*do)\b/i.test(clauseText);

          if (clauseHasSkip) {
            if (isRemoveAllSkip || /\b(clear\s*all|remove\s*all|delete\s*all)\b/i.test(clauseText) || (clauseHasMod && !/\b(intro|outro|credits)\b/i.test(clauseText))) {
              skipMarkers = { removeAll: true, removeIntro: true, removeOutro: true, removeCredits: true };
            } else {
              skipMarkers = {};
              const dIntro = clauseText.match(/(?:intro|opening|op)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
              if (dIntro) {
                skipMarkers.intro = { start: parseInt(dIntro[1], 10), end: parseInt(dIntro[2], 10) };
              }
              const dOutro = clauseText.match(/(?:outro|ending|ed)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
              if (dOutro) {
                skipMarkers.outro = { start: parseInt(dOutro[1], 10), end: parseInt(dOutro[2], 10) };
              }
              const dCredits = clauseText.match(/(?:credits)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
              if (dCredits) {
                skipMarkers.credits = { start: parseInt(dCredits[1], 10), end: parseInt(dCredits[2], 10) };
              }
              if (/\b(?:intro\s*(?:skip)?\s*(?:hata\s*do|hota\s*do|hataa\s*do|remove|delete|mat|nahi|clear))\b/i.test(clauseText)) {
                skipMarkers.removeIntro = true;
              }
              if (/\b(?:outro\s*(?:skip)?\s*(?:hata\s*do|hota\s*do|hataa\s*do|remove|delete|mat|nahi|clear))\b/i.test(clauseText)) {
                skipMarkers.removeOutro = true;
              }
              if (/\b(?:credits\s*(?:skip)?\s*(?:hata\s*do|hota\s*do|hataa\s*do|remove|delete|mat|nahi|clear))\b/i.test(clauseText)) {
                skipMarkers.removeCredits = true;
              }
              if (Object.keys(skipMarkers).length === 0) skipMarkers = undefined;
            }
          }

          const removeQualities: string[] = [];
          const addQualities: string[] = [];
          const setQualities: string[] = [];

          const subClauses = clauseText.split(/\b(?:aur|and|lekin|but|fir|then|waise|,|;)\b/i);
          subClauses.forEach(sub => {
            const hasRemove = /\b(hata\s*do|hota\s*do|hataa\s*do|hatao|remove|delete|hata|mita\s*do|nikal\s*do)\b/i.test(sub);
            const hasAdd = /\b(laga\s*do|lagao|add|set|rakh\s*do|daal\s*do|dal\s*do|kar\s*dena)\b/i.test(sub);
            const qMatches = Array.from(sub.matchAll(/\b(1080p?|720p?|480p?|360p?|4k)\b/gi)).map(m => m[1].toLowerCase().replace(/(\d+)$/, '$1p'));

            if (hasRemove && !hasAdd) {
              qMatches.forEach(q => { if (!removeQualities.includes(q)) removeQualities.push(q); });
            } else if (hasAdd && !hasRemove) {
              qMatches.forEach(q => { if (!addQualities.includes(q)) addQualities.push(q); });
            }
          });

          const targetEpNums: number[] = [];
          const epNumMatches = Array.from(clauseText.matchAll(/(?:episode|ep)\s*(\d+)/gi));
          if (epNumMatches.length > 0) {
            epNumMatches.forEach(m => targetEpNums.push(parseInt(m[1], 10)));
          }
          const rangeMatch = clauseText.match(/(?:episode|ep)\s*(\d+)\s*(?:se|to|-)\s*(\d+)/i);
          if (rangeMatch) {
            const st = parseInt(rangeMatch[1], 10);
            const en = parseInt(rangeMatch[2], 10);
            if (st <= en && en - st < 100) {
              for (let i = st; i <= en; i++) {
                if (!targetEpNums.includes(i)) targetEpNums.push(i);
              }
            }
          }

          const isAllEps = targetEpNums.length === 0 || /\b(sabhi|sab|all|poore|pure|puri|poori|jitne\s*bhi|sab\s*ko|saare)\b/i.test(clauseText);
          const partsMatch = clauseText.match(/(?:(\d+|ek|do|teen|chaar|two|three|four)\s*parts?)/i);
          const partsCount = partsMatch ? (wordToNumMap[partsMatch[1].toLowerCase()] || parseInt(partsMatch[1], 10)) : undefined;

          return {
            skipMarkers,
            removeQualities,
            addQualities,
            setQualities,
            targetEpNums,
            isAllEps,
            partsCount
          };
        };

        const actions: any[] = [];

        // If target is in database library and not currently loaded in the form, load it first
        if (matchedTarget && !matchedTarget.isCurrentDraft && targetObj.id && targetObj.id !== 'current-draft') {
          actions.push({
            type: "LOAD_FOR_EDIT",
            data: { contentId: targetObj.id, title: targetTitle }
          });
        }

        // Handle Add Season intent
        let addedSeasonDesc = "";
        if (isAddSeasonIntent) {
          const sNumMatch = prompt.match(/(?:season|s)\s*(\d+)/i);
          const epCountMatch = prompt.match(/(\d+)\s*(?:episodes?|eps?)/i);
          const targetSeasonNum = sNumMatch ? parseInt(sNumMatch[1], 10) : ((enhancedContext?.currentDraft?.seasonsCount || 1) + 1);
          const epCount = epCountMatch ? parseInt(epCountMatch[1], 10) : 12;
          actions.push({
            type: "ADD_SEASON",
            data: {
              seasonNumber: targetSeasonNum,
              seasonTitle: `Season ${targetSeasonNum}`,
              episodeCount: epCount
            }
          });
          actions.push({
            type: "SWITCH_SEASON",
            data: { seasonNumber: targetSeasonNum }
          });
          addedSeasonDesc = `Created Season ${targetSeasonNum} with ${epCount} episodes`;
        }

        // Metadata Extraction
        const titleMatch = prompt.match(/(?:title|naam)\s*(?:ko|badal\s*kar|change\s*to|set\s*to)?\s*[:=-]?\s*["']([^"'\n]+)["']/i) ||
          prompt.match(/(?:title|naam)\s*(?:ko|badal\s*kar|change\s*to|set\s*to)?\s*[:=-]?\s*([A-Za-z0-9][A-Za-z0-9\s:_-]{2,35}?)(?:\s*(?:kar\s*dena|kar\s*do|karo|rakho|set|$))/i);
        const ratingMatch = prompt.match(/(?:rating|stars?)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
        const yearMatch = prompt.match(/(?:year|saal)\s*[:=-]?\s*(20\d\d|19\d\d)/i);
        const genreMatch = prompt.match(/(?:genre|genres)\s*[:=-]?\s*([A-Za-z\s,]+)(?:\s*(?:add|kar\s*do|set|$))/i);

        const metaDataObj: any = {};
        if (titleMatch && titleMatch[1]) {
          const tClean = titleMatch[1].trim();
          if (!/^(hata|hota|remove|delete|laga|add|set|skip)/i.test(tClean)) {
            metaDataObj.title = tClean;
          }
        }
        if (ratingMatch) metaDataObj.rating = parseFloat(ratingMatch[1]);
        if (yearMatch) metaDataObj.year = yearMatch[1];
        if (genreMatch && genreMatch[1]) {
          metaDataObj.genres = genreMatch[1].split(',').map((g: string) => g.trim()).filter(Boolean);
        }
        if (/\b(japanese|japani|english|hindi|dual\s*audio|tamil|telugu)\b/i.test(prompt) && /\b(audio|language|bhasha|track)\b/i.test(prompt)) {
          metaDataObj.languages = targetLanguages;
        }
        if (Object.keys(metaDataObj).length > 0) {
          actions.push({
            type: "FILL_UPLOAD_METADATA",
            data: metaDataObj
          });
        }

        // Season Mentions Detection & Multi-Season Splitting
        const seasonRegex = /\b(?:season|s)\s*(\d+)\b/gi;
        const seasonMentions: { seasonNum: number; index: number; text: string }[] = [];
        let smMatch: RegExpExecArray | null;
        while ((smMatch = seasonRegex.exec(prompt)) !== null) {
          seasonMentions.push({
            seasonNum: parseInt(smMatch[1], 10),
            index: smMatch.index,
            text: smMatch[0]
          });
        }

        const distinctSeasonNums = Array.from(new Set(seasonMentions.map(s => s.seasonNum)));
        const operationSummaries: string[] = [];

        if (addedSeasonDesc) operationSummaries.push(addedSeasonDesc);
        if (metaDataObj.title) operationSummaries.push(`Updated title to "${metaDataObj.title}"`);
        if (metaDataObj.rating) operationSummaries.push(`Updated rating to ⭐${metaDataObj.rating}`);
        if (metaDataObj.year) operationSummaries.push(`Updated release year to ${metaDataObj.year}`);
        if (metaDataObj.genres) operationSummaries.push(`Updated genres to [${metaDataObj.genres.join(', ')}]`);
        if (metaDataObj.languages) operationSummaries.push(`Updated audio languages to [${metaDataObj.languages.join(', ')}]`);

        const hasEpisodesSpecChanges = hasQualityToken || hasSkipToken || hasPartToken || /\b(1080p|720p|480p|skip|intro|outro|credits|part|parts|hata|hota|remove|delete|laga|add|set)\b/i.test(prompt);

        if (hasEpisodesSpecChanges) {
          // Check if there are separate clauses for distinct seasons (e.g. "season 1 me X kar dena season 2 me Y kar dena")
          let isMultiClauseDifferentSeasons = false;
          if (distinctSeasonNums.length > 1) {
            const textBetween = prompt.slice(seasonMentions[0].index, seasonMentions[1].index);
            isMultiClauseDifferentSeasons = /\b(hata|hota|remove|delete|laga|add|set|kar\s*dena|kar\s*do|badal|part|intro|outro|credits|1080p|720p|480p)\b/i.test(textBetween);
          }

          if (isMultiClauseDifferentSeasons) {
            // Multiple distinct season clauses
            for (let i = 0; i < seasonMentions.length; i++) {
              const currentMention = seasonMentions[i];
              const nextMention = seasonMentions[i + 1];
              const sliceStart = currentMention.index;
              const sliceEnd = nextMention ? nextMention.index : prompt.length;
              const clauseSlice = prompt.slice(sliceStart, sliceEnd);
              const specs = parseClauseSpecs(clauseSlice);

              if (specs.skipMarkers || specs.removeQualities.length > 0 || specs.addQualities.length > 0 || specs.partsCount) {
                actions.push({
                  type: "UPDATE_EPISODES_SPEC",
                  data: {
                    applyToAll: specs.isAllEps,
                    applyToAllSeasons: false,
                    seasonNumber: currentMention.seasonNum,
                    episodeNumbers: specs.targetEpNums.length > 0 ? specs.targetEpNums : undefined,
                    removeQualities: specs.removeQualities.length > 0 ? specs.removeQualities : undefined,
                    addQualities: specs.addQualities.length > 0 ? specs.addQualities : undefined,
                    setQualities: specs.setQualities.length > 0 ? specs.setQualities : undefined,
                    partsCount: specs.partsCount,
                    skipMarkers: specs.skipMarkers
                  }
                });

                let desc = `Season ${currentMention.seasonNum}: `;
                if (specs.targetEpNums.length > 0 && !specs.isAllEps) desc += `Episodes [${specs.targetEpNums.join(', ')}]: `;
                if (specs.skipMarkers?.removeAll) desc += `Removed all skip markers. `;
                else if (specs.skipMarkers?.removeIntro) desc += `Removed intro skip. `;
                else if (specs.skipMarkers?.removeOutro) desc += `Removed outro skip. `;
                if (specs.skipMarkers?.intro) desc += `Set intro skip (${specs.skipMarkers.intro.start}s - ${specs.skipMarkers.intro.end}s). `;
                if (specs.skipMarkers?.outro) desc += `Set outro skip (${specs.skipMarkers.outro.start}s - ${specs.skipMarkers.outro.end}s). `;
                if (specs.skipMarkers?.credits) desc += `Set credits skip (${specs.skipMarkers.credits.start}s - ${specs.skipMarkers.credits.end}s). `;
                if (specs.removeQualities.length > 0) desc += `Removed [${specs.removeQualities.join(', ')}]. `;
                if (specs.addQualities.length > 0) desc += `Added [${specs.addQualities.join(', ')}]. `;
                if (specs.partsCount) desc += `Set ${specs.partsCount} parts. `;
                operationSummaries.push(desc.trim());
              }
            }
            // Default view to the first modified season
            actions.push({ type: "SWITCH_SEASON", data: { seasonNumber: seasonMentions[0].seasonNum } });
          } else if (distinctSeasonNums.length > 1) {
            // Multiple seasons conjoined targeting same changes (e.g. "season 1 aur season 2 dono me...")
            const specs = parseClauseSpecs(prompt);
            if (specs.skipMarkers || specs.removeQualities.length > 0 || specs.addQualities.length > 0 || specs.partsCount) {
              actions.push({
                type: "UPDATE_EPISODES_SPEC",
                data: {
                  applyToAll: specs.isAllEps,
                  applyToAllSeasons: false,
                  seasonNumbers: distinctSeasonNums,
                  episodeNumbers: specs.targetEpNums.length > 0 ? specs.targetEpNums : undefined,
                  removeQualities: specs.removeQualities.length > 0 ? specs.removeQualities : undefined,
                  addQualities: specs.addQualities.length > 0 ? specs.addQualities : undefined,
                  setQualities: specs.setQualities.length > 0 ? specs.setQualities : undefined,
                  partsCount: specs.partsCount,
                  skipMarkers: specs.skipMarkers
                }
              });

              let desc = `Seasons [${distinctSeasonNums.join(', ')}]: `;
              if (specs.targetEpNums.length > 0 && !specs.isAllEps) desc += `Episodes [${specs.targetEpNums.join(', ')}]: `;
              if (specs.skipMarkers?.removeAll) desc += `Removed all skip markers. `;
              else if (specs.skipMarkers?.removeIntro) desc += `Removed intro skip. `;
              else if (specs.skipMarkers?.removeOutro) desc += `Removed outro skip. `;
              if (specs.skipMarkers?.intro) desc += `Set intro skip (${specs.skipMarkers.intro.start}s - ${specs.skipMarkers.intro.end}s). `;
              if (specs.skipMarkers?.outro) desc += `Set outro skip (${specs.skipMarkers.outro.start}s - ${specs.skipMarkers.outro.end}s). `;
              if (specs.skipMarkers?.credits) desc += `Set credits skip (${specs.skipMarkers.credits.start}s - ${specs.skipMarkers.credits.end}s). `;
              if (specs.removeQualities.length > 0) desc += `Removed [${specs.removeQualities.join(', ')}]. `;
              if (specs.addQualities.length > 0) desc += `Added [${specs.addQualities.join(', ')}]. `;
              if (specs.partsCount) desc += `Set ${specs.partsCount} parts. `;
              operationSummaries.push(desc.trim());
            }
            actions.push({ type: "SWITCH_SEASON", data: { seasonNumber: distinctSeasonNums[0] } });
          } else if (distinctSeasonNums.length === 1 && !isAddSeasonIntent) {
            // Exactly one specific season targeted (e.g. "season 2 me skip markers hata do")
            const targetSNum = distinctSeasonNums[0];
            const specs = parseClauseSpecs(prompt);
            if (specs.skipMarkers || specs.removeQualities.length > 0 || specs.addQualities.length > 0 || specs.partsCount) {
              actions.push({
                type: "UPDATE_EPISODES_SPEC",
                data: {
                  applyToAll: specs.isAllEps,
                  applyToAllSeasons: false,
                  seasonNumber: targetSNum,
                  episodeNumbers: specs.targetEpNums.length > 0 ? specs.targetEpNums : undefined,
                  removeQualities: specs.removeQualities.length > 0 ? specs.removeQualities : undefined,
                  addQualities: specs.addQualities.length > 0 ? specs.addQualities : undefined,
                  setQualities: specs.setQualities.length > 0 ? specs.setQualities : undefined,
                  partsCount: specs.partsCount,
                  skipMarkers: specs.skipMarkers
                }
              });

              let desc = `Season ${targetSNum}: `;
              if (specs.targetEpNums.length > 0 && !specs.isAllEps) desc += `Episodes [${specs.targetEpNums.join(', ')}]: `;
              if (specs.skipMarkers?.removeAll) desc += `Removed all skip markers across all episodes. `;
              else if (specs.skipMarkers?.removeIntro) desc += `Removed intro skip. `;
              else if (specs.skipMarkers?.removeOutro) desc += `Removed outro skip. `;
              if (specs.skipMarkers?.intro) desc += `Set intro skip (${specs.skipMarkers.intro.start}s - ${specs.skipMarkers.intro.end}s). `;
              if (specs.skipMarkers?.outro) desc += `Set outro skip (${specs.skipMarkers.outro.start}s - ${specs.skipMarkers.outro.end}s). `;
              if (specs.skipMarkers?.credits) desc += `Set credits skip (${specs.skipMarkers.credits.start}s - ${specs.skipMarkers.credits.end}s). `;
              if (specs.removeQualities.length > 0) desc += `Removed [${specs.removeQualities.join(', ')}]. `;
              if (specs.addQualities.length > 0) desc += `Added [${specs.addQualities.join(', ')}]. `;
              if (specs.partsCount) desc += `Set ${specs.partsCount} parts. `;
              operationSummaries.push(desc.trim());
            }
            actions.push({ type: "SWITCH_SEASON", data: { seasonNumber: targetSNum } });
          } else if (!isAddSeasonIntent) {
            // No specific season mentioned (e.g. "ye anime series mese skip markers jitne bhi set Kiya Hai SAB Ko hata do") -> ALL SEASONS!
            const specs = parseClauseSpecs(prompt);
            if (specs.skipMarkers || specs.removeQualities.length > 0 || specs.addQualities.length > 0 || specs.partsCount) {
              actions.push({
                type: "UPDATE_EPISODES_SPEC",
                data: {
                  applyToAll: specs.isAllEps,
                  applyToAllSeasons: true,
                  episodeNumbers: specs.targetEpNums.length > 0 ? specs.targetEpNums : undefined,
                  removeQualities: specs.removeQualities.length > 0 ? specs.removeQualities : undefined,
                  addQualities: specs.addQualities.length > 0 ? specs.addQualities : undefined,
                  setQualities: specs.setQualities.length > 0 ? specs.setQualities : undefined,
                  partsCount: specs.partsCount,
                  skipMarkers: specs.skipMarkers
                }
              });

              let desc = `All Seasons: `;
              if (specs.targetEpNums.length > 0 && !specs.isAllEps) desc += `Episodes [${specs.targetEpNums.join(', ')}]: `;
              if (specs.skipMarkers?.removeAll) desc += `Removed all skip markers across all seasons & episodes. `;
              else if (specs.skipMarkers?.removeIntro) desc += `Removed intro skip across all seasons. `;
              else if (specs.skipMarkers?.removeOutro) desc += `Removed outro skip across all seasons. `;
              if (specs.skipMarkers?.intro) desc += `Set intro skip (${specs.skipMarkers.intro.start}s - ${specs.skipMarkers.intro.end}s) across all seasons. `;
              if (specs.skipMarkers?.outro) desc += `Set outro skip (${specs.skipMarkers.outro.start}s - ${specs.skipMarkers.outro.end}s) across all seasons. `;
              if (specs.skipMarkers?.credits) desc += `Set credits skip (${specs.skipMarkers.credits.start}s - ${specs.skipMarkers.credits.end}s) across all seasons. `;
              if (specs.removeQualities.length > 0) desc += `Removed [${specs.removeQualities.join(', ')}]. `;
              if (specs.addQualities.length > 0) desc += `Added [${specs.addQualities.join(', ')}]. `;
              if (specs.partsCount) desc += `Set ${specs.partsCount} parts. `;
              operationSummaries.push(desc.trim());
            }
          }
        }

        if (wantsToSaveLive) {
          actions.push({ type: "SAVE_EDITED_CONTENT" });
          actions.push({ type: "GO_TO_STEP", step: 3 });
        } else {
          actions.push({ type: "GO_TO_STEP", step: 2 });
        }

        // Build Fluent Hinglish Response
        let editReply = `Haan Boss! Maine **"${targetTitle}"** (${targetType}) `;
        if (operationSummaries.length > 0) {
          editReply += `me exact requested modifications apply kar di hain:\n\n` +
            operationSummaries.map(s => `• **${s}**`).join('\n') + `\n\n`;
        } else {
          editReply += `me requested updates apply kar diye hain!\n\n`;
        }
        editReply += `Studio me saari modifications live reflect ho chuki hain Boss! Aap Step 2 me season tabs switch karke inspect kar sakte hain ya live publish kar sakte hain.`;

        const summary = [
          `Target: "${targetTitle}" (${targetType})`,
          ...operationSummaries,
          wantsToSaveLive ? `Auto-published changes live to database` : `Live synchronized in Edit Studio (Step 2)`
        ].filter(Boolean);

        return res.json({
          thought: `Successfully parsed and executed content edit targeting "${targetTitle}": ${operationSummaries.join(' | ')}`,
          intent: "content_edit",
          reply: editReply,
          voiceUsed: selectedVoice,
          suggestionChips: [
            { label: "👁️ Step 2: Episodes Inspect", prompt: "Step 2 me episodes dikhao" },
            { label: "📋 Step 3: Review Summary", prompt: "Review summary open karo" },
            { label: "🚀 Publish Changes Live", prompt: "Yeh changes live publish kar do" }
          ],
          summary,
          actions
        });
      }

      // 1. Inventory Query (e.g. "Kitne anime upload hai?", "Uploaded content dikhao", "MaxPlay me kya kya upload hai?")
      const isInventoryQuery = !isLoyaltyOrFunRequest && 
        (/\b(kitne|kitna|kitni|kaun|kaunse|kaunsi|kya\s*kya|total|list|show|batao|dikhao|check|inventory|kya\s*upload|kya\s*hai)\b/i.test(prompt) &&
         /\b(upload|uploaded|anime|animes|series|movie|movies|content|titles|database|library)\b/i.test(prompt) &&
         !/\b(karo|kar\s*do|banao|upload\s*karna|laga\s*do|upload\s*karo|chada\s*do)\b/i.test(prompt));

      const isGeneralEditIntent = !isInventoryQuery && !isLoyaltyOrFunRequest &&
        /\b(edit|change|badalna|update|sudharna)\b/i.test(prompt) &&
        /\b(karna\s*hai|karna\s*chahta|karni\s*hai|karo|chahiye|hai)\b/i.test(prompt) &&
        !/\b(720p|1080p|part|intro|outro|skip|stream|https?:\/\/)\b/i.test(prompt) &&
        !matchedContent;

      const isSpecificEditIntent = matchedContent !== null && !isInventoryQuery && !isLoyaltyOrFunRequest &&
        /\b(edit|change|badalna|update|detail|details|info|kya\s*hai|check|dekho|karo|karna)\b/i.test(prompt) &&
        !/\b(naya|new|create|generate)\b/i.test(prompt);

      // 3. Casual Greetings & Normal Conversational Questions
      const isCasualGreeting = !isLoyaltyOrFunRequest && !isInventoryQuery && !isGeneralEditIntent && !isSpecificEditIntent &&
        /^(hi|hello|hey|kaise\s*ho|kya\s*haal|good\s*(morning|evening|afternoon|night)|namaste|pranam|kya\s*chal\s*raha\s*hai|help|shukriya|thanks|thank\s*you|bhai|bro)\b/i.test(prompt.trim());

      const isConversationalQuestion = !isLoyaltyOrFunRequest && !isInventoryQuery && !isGeneralEditIntent && !isSpecificEditIntent && !isCasualGreeting &&
        (/\b(kaise|kya|kyun|kab|kahan|kaun|who|what|why|how|when|where|explain|batao|suggest|fark|difference|kaunsa|konsa|kaisi|kaisa)\b/i.test(prompt) ||
         /\b(karein|kare|karta|hoti|hota|rahega|rakhein|best|bitrate|resolution|hls|m3u8|mp4|fps|audio|video|stream|server|cdn|database|guide|tips|rules|feature|features)\b/i.test(prompt)) &&
        !/\b(upload\s*karo|upload\s*karna|banao|chada\s*do|link\s*lagao|daal\s*do)\b/i.test(prompt) &&
        urlMatches.length === 0;

      // 4. Explicit Upload Order (Only triggers when admin truly orders an upload or provides links)
      const hasUploadAction = /\b(upload\s*karo|upload\s*karna|naya\s*upload|upload\s*kar\s*do|upload\s*kijiye|add\s*karo|draft\s*banao|publish\s*karo|insert\s*karo|daal\s*do|dal\s*do|chada\s*do|chadhado|link\s*lagao|link\s*dalo|form\s*bharo|save\s*content|banao|banana|bana\s*do|bnao|bnado|bna\s*do|bnaaye|banaye|boxes\s*bnao|boxes\s*banao|box\s*bnao|box\s*banao|create|add)\b/i.test(prompt);
      const hasEpisodePattern = (/\b\d+\s*(?:episodes?|eps?|ep|bhag|boxes?|box)\b/i.test(prompt) || /\b(?:episode|ep)\s*\d+/i.test(prompt) || /\b(?:season|s)\s*\d+/i.test(prompt)) && /\b(upload|banao|bana\s*do|bnao|bnado|bna\s*do|rakho|set\s*karo|chahiye|add|create|banana|bnaaye|banaye)\b/i.test(prompt);

      let isExplicitUploadOrder = !isLoyaltyOrFunRequest && 
        !isInventoryQuery && 
        !isGeneralEditIntent && 
        !isSpecificEditIntent && 
        !isCasualGreeting && 
        !isConversationalQuestion &&
        (hasUploadAction || urlMatches.length > 0 || hasEpisodePattern);

      // --- ADVANCED MULTI-SEASON SPECIFICATION PARSER ---
      interface SeasonSpec {
        seasonNumber: number;
        episodeCount: number;
      }

      const promptWithoutUrls = prompt.replace(/https?:\/\/[^\s"'<>)\]]+/g, " [STREAM_LINK] ");
      const parsedSeasonsMap = new Map<number, number>();

      const getNumVal = (str: string): number => {
        if (!str) return 0;
        const clean = str.trim().toLowerCase();
        if (wordToNumMap[clean] !== undefined) return wordToNumMap[clean];
        const parsed = parseInt(clean, 10);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Strategy 1: Clause-based segmentation (e.g. "is series ke season 1 me 12 episode boxes bnao or issi series ke season 2 me 23 episode boxes bnao")
      const clauses = promptWithoutUrls.split(/\b(?:aur|or|and|\+|&|,|;|\n)\b|\b(?:issi\s*series\s*(?:ke|me)?|is\s*series\s*(?:ke|me)?|isike|iske|sath\s*hi|bhi)\b/i);
      for (const clause of clauses) {
        const sMatch = clause.match(/(?:season|s)\s*(\d+|ek|one|do|two|teen|three|char|four|paanch|five|che|six|saat|seven|aath|eight|nau|nine|das|ten)/i);
        if (sMatch) {
          const sNum = getNumVal(sMatch[1]);
          const epMatch = clause.match(/(\d+|ek|do|dono|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees)\s*(?:episodes?|eps?|ep|boxes?|box|bhag|kist)/i) ||
                          clause.match(/(?:episodes?|eps?|ep|boxes?|box)\s*[:=-]?\s*(\d+)/i);
          if (epMatch) {
            const epCnt = getNumVal(epMatch[1]);
            if (sNum > 0 && epCnt > 0) {
              parsedSeasonsMap.set(sNum, epCnt);
            }
          }
        }
      }

      // Strategy 2: Direct pattern matching across whole prompt
      // Pattern A: "season 1 me 12 episode boxes bnao... season 2 me 23 episode boxes bnao"
      const sEpPattern1 = /(?:season|s)\s*(\d+|ek|one|do|two|teen|three|char|four|paanch|five)[^.\n,;]*?(?:me|mein|par|ke\s*liye|ke|ko|has|have|with|me\s*bhi)?\s*[:=-]?\s*(\d+|ek|do|dono|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees)\s*(?:episodes?|eps?|ep|boxes?|box|bhag|kist)/gi;
      let sepM: RegExpExecArray | null;
      while ((sepM = sEpPattern1.exec(promptWithoutUrls)) !== null) {
        const sNum = getNumVal(sepM[1]);
        const epCnt = getNumVal(sepM[2]);
        if (sNum > 0 && epCnt > 0) {
          parsedSeasonsMap.set(sNum, epCnt);
        }
      }

      // Pattern B: Reverse order: "12 episode boxes season 1 me or 23 episode boxes season 2 me"
      const sEpPattern2 = /(\d+|ek|do|dono|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees)\s*(?:episodes?|eps?|ep|boxes?|box|bhag|kist)[^.\n,;]*?(?:ke\s*liye|in|me|mein|for)?\s*(?:season|s)\s*(\d+|ek|one|do|two|teen|three|char|four|paanch|five)/gi;
      let sepM2: RegExpExecArray | null;
      while ((sepM2 = sEpPattern2.exec(promptWithoutUrls)) !== null) {
        const epCnt = getNumVal(sepM2[1]);
        const sNum = getNumVal(sepM2[2]);
        if (sNum > 0 && epCnt > 0 && !parsedSeasonsMap.has(sNum)) {
          parsedSeasonsMap.set(sNum, epCnt);
        }
      }

      // Pattern C: "N seasons banao har season me M episodes" (e.g. "2 seasons banao har season me 12 episodes")
      if (parsedSeasonsMap.size === 0) {
        const uniformMatch = promptWithoutUrls.match(/(\d+|ek|do|teen|chaar|paanch|two|three|four|five)\s*seasons?[^.\n,;]*?(?:har|each|sabhi|every)\s*season[^.\n,;]*?(\d+|ek|do|teen|chaar|paanch|two|three|four|five|\d+)\s*(?:episodes?|eps?|ep|boxes?|box)/i);
        if (uniformMatch) {
          const totalS = getNumVal(uniformMatch[1]) || 1;
          const epPerS = getNumVal(uniformMatch[2]) || 12;
          for (let sI = 1; sI <= Math.min(totalS, 10); sI++) {
            parsedSeasonsMap.set(sI, epPerS);
          }
        }
      }

      // If seasons and episode counts were ordered in the prompt, guarantee explicit upload intent!
      if (parsedSeasonsMap.size > 0 && !isLoyaltyOrFunRequest && !isInventoryQuery && !isCasualGreeting && !isConversationalQuestion) {
        isExplicitUploadOrder = true;
      }

      const isMediaInquiry = !isExplicitUploadOrder && !isCasualGreeting && !isConversationalQuestion && !isLoyaltyOrFunRequest && !isInventoryQuery && !isGeneralEditIntent && !isSpecificEditIntent && /\b(movie|series|anime|season|film|show|kaisa|kaisi|story|plot|review|recommend|suggest|release|actor|cast)\b/i.test(prompt);

      // If no seasons detected by patterns 1-3, fall back to single season check
      let requestedEpisodeCount: number | null = null;
      const countMatch = promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees|\d+)\s*(?:episodes?|eps?|ep|boxes?|box|bhag|kist)\b/i) ||
                         promptWithoutUrls.match(/(?:episodes?|eps?|ep|boxes?|box)\s*(?:count|total|ki\s*sankhya)?\s*[:=-]?\s*(\d+)/i) ||
                         promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees|\d+)\s*(?:episode|episodes|boxes|box)\s*(?:banana|banao|bnao|bnado|bna\s*do|rakhna|upload|add|create|generate)/i);
      if (countMatch) {
        const rawVal = countMatch[1].toLowerCase();
        const num = wordToNumMap[rawVal] || parseInt(rawVal, 10);
        if (!isNaN(num) && num > 0 && num <= 100) {
          requestedEpisodeCount = num;
        }
      }

      const singleSeasonMatch = prompt.match(/(?:season|s)\s*(\d+)/i);
      const defaultSeasonNum = singleSeasonMatch ? parseInt(singleSeasonMatch[1], 10) : 1;

      if (parsedSeasonsMap.size === 0) {
        parsedSeasonsMap.set(defaultSeasonNum, requestedEpisodeCount || 1);
      }

      const sortedSeasons: SeasonSpec[] = Array.from(parsedSeasonsMap.entries())
        .map(([seasonNumber, episodeCount]) => ({ seasonNumber, episodeCount }))
        .sort((a, b) => a.seasonNumber - b.seasonNumber);

      const isMultiSeason = sortedSeasons.length > 1;
      const targetSeasonNumber = sortedSeasons[0].seasonNumber;

      // Map links to specific Season, Episode numbers, and Part numbers
      interface MappedLink {
        seasonNum: number;
        epNum: number;
        partNum: number;
        url: string;
        probedDurationSec?: number;
      }
      const mappedLinks: MappedLink[] = [];
      const linkRegex = /https?:\/\/[^\s"'<>)\]]+/g;
      const rawMatches: { url: string; index: number; end: number }[] = [];
      let lMatch: RegExpExecArray | null;

      while ((lMatch = linkRegex.exec(prompt)) !== null) {
        rawMatches.push({ url: lMatch[0], index: lMatch.index, end: lMatch.index + lMatch[0].length });
      }

      let lastSeason = sortedSeasons[0]?.seasonNumber || 1;
      let lastEp = 1;
      let lastPart = 0;

      for (let i = 0; i < rawMatches.length; i++) {
        const m = rawMatches[i];
        const prevEnd = i === 0 ? 0 : rawMatches[i - 1].end;
        const segment = prompt.substring(prevEnd, m.index);

        // Find season mention in segment
        const sMatches = Array.from(segment.matchAll(/(?:season|s)\s*(\d+)/gi));
        let seasonNum = sMatches.length > 0 ? parseInt(sMatches[sMatches.length - 1][1], 10) : lastSeason;

        // Find episode mentions in segment (e.g. "Episode 1", "Ep 2")
        const epMatches = Array.from(segment.matchAll(/(?:episode|ep|bhag|kist)\s*(\d+)/gi));
        let epNum = epMatches.length > 0 ? parseInt(epMatches[epMatches.length - 1][1], 10) : 0;

        // Find part mentions in segment (e.g. "part 2", "pt 2", "p 2")
        const partMatches = Array.from(segment.matchAll(/(?:part|pt|p)\s*(\d+)/gi));
        let partNum = partMatches.length > 0 ? parseInt(partMatches[partMatches.length - 1][1], 10) : 0;

        if (epNum === 0) {
          if (partNum > 1) {
            epNum = lastEp;
          } else if (rawMatches.length === 1 && sortedSeasons[0].episodeCount === 1) {
            epNum = 1;
          } else if (i === 0) {
            epNum = 1;
          } else {
            epNum = lastEp + 1;
          }
        }

        if (partNum === 0) {
          if (epNum === lastEp && mappedLinks.length > 0) {
            partNum = lastPart + 1;
          } else {
            partNum = 1;
          }
        }

        lastSeason = seasonNum;
        lastEp = epNum;
        lastPart = partNum;
        mappedLinks.push({ seasonNum, epNum, partNum, url: m.url });
      }

      // Media type detection
      const isAnime = /\b(anime|naruto|solo\s*leveling|jujutsu|demon\s*slayer|one\s*piece|bleach|death\s*note|dragon\s*ball|attack\s*on\s*titan|chainsaw\s*man)\b/i.test(prompt);
      const isMovie = /\b(movie|film|cinema)\b/i.test(prompt) && !isAnime && !hasEpisodePattern;
      const mediaType: "movie" | "series" | "anime" = isAnime ? "anime" : (isMovie ? "movie" : "series");

      // Clean search title for TMDB (removes procedural instruction words cleanly)
      let cleanSearchTitle = prompt
        .replace(/(https?:\/\/[^\s]+)/gi, " ")
        .replace(/\b(upload|add|draft|publish|stream|link|links|episode|episodes|ep|eps|season|seasons|s\d+|part|parts|skip|intro|outro|credits|movie|anime|series|web\s*series|urdu|hindi|english|japanese|korean|tamil|telugu|1080p|720p|480p|360p|4k|2k|with|and|for|in|to|batao|kaisa|kaisi|story|plot|review|banana|banao|bana\s*do|banane|banani|rakhna|rakho|rakhe|target|karna|kar|karo|hai|hain|ke|ka|ki|ko|me|mein|par|pe|audio|track|quality|qualities|kitne|total|count|number|hata|hatao|hata\s*do|laga|lagao|lagana|laga\s*do|sirf|baki|sab|saari|select|selected|selection|chahiye|honge|hoga|hogi|suggest|specification|badal\s*do|badlo|lekin|wale|wali|wala|iss|is|us|language|languages|hi|bhi|boxes|box|bnao|bna|bnado|banado|or|aur|dono|teeno|issi|isi|kist|bhag|generate|create)\b/gi, " ")
        .replace(/[\d]+s\b/gi, " ")
        .replace(/[0-9]+-[0-9]+s?/gi, " ")
        .replace(/\b\d+\b/g, " ")
        .replace(/[,\-:–—\?]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Detect known canonical media titles
      const knownMediaTitles = [
        { pattern: /\b(naruto\s*shippuden)\b/i, title: "Naruto Shippuden" },
        { pattern: /\b(naruto)\b/i, title: "Naruto" },
        { pattern: /\b(solo\s*leveling)\b/i, title: "Solo Leveling" },
        { pattern: /\b(death\s*note)\b/i, title: "Death Note" },
        { pattern: /\b(jujutsu\s*kaisen)\b/i, title: "Jujutsu Kaisen" },
        { pattern: /\b(demon\s*slayer|kimetsu\s*no\s*yaiba)\b/i, title: "Demon Slayer: Kimetsu no Yaiba" },
        { pattern: /\b(one\s*piece)\b/i, title: "One Piece" },
        { pattern: /\b(bleach(?:\s*thousand\s*year\s*blood\s*war)?)\b/i, title: "Bleach" },
        { pattern: /\b(attack\s*on\s*titan|shingeki\s*no\s*kyojin)\b/i, title: "Attack on Titan" },
        { pattern: /\b(chainsaw\s*man)\b/i, title: "Chainsaw Man" },
        { pattern: /\b(dragon\s*ball(?:\s*z|\s*super)?)\b/i, title: "Dragon Ball Z" },
        { pattern: /\b(my\s*hero\s*academia|boku\s*no\s*hero)\b/i, title: "My Hero Academia" },
        { pattern: /\b(tokyo\s*revengers)\b/i, title: "Tokyo Revengers" },
        { pattern: /\b(hunter\s*x\s*hunter)\b/i, title: "Hunter x Hunter" },
        { pattern: /\b(fullmetal\s*alchemist)\b/i, title: "Fullmetal Alchemist: Brotherhood" }
      ];

      let searchTitle = cleanSearchTitle;
      for (const k of knownMediaTitles) {
        if (k.pattern.test(prompt)) {
          searchTitle = k.title;
          break;
        }
      }

      if (!searchTitle || searchTitle.length < 2) {
        const draftTitle = enhancedContext?.currentDraft?.title || enhancedContext?.activeTitle;
        if (draftTitle && typeof draftTitle === "string" && draftTitle.trim().length > 1) {
          searchTitle = draftTitle.trim();
        } else {
          searchTitle = isAnime ? "Anime Series" : (isMovie ? "New Movie" : "Web Series");
        }
      }

      // 2. Playful Loyalty Commands (e.g. "meow meow bolo", "loyalty test", "tareef karo")
      if (isLoyaltyOrFunRequest) {
        const isMeow = /meow|meao|mew|billi/i.test(prompt);
        const reply = isMeow
          ? `Meow meow Boss! 🐾 Meow meow! Aapka hukum sar aankhon par! Aapne hukum diya aur maine meow meow bol diya! Main hamesha aapka 100% loyal aur obedient AI assistant hoon Boss. Aur bataiye mere maalik, aage kya hukum hai?`
          : `Haan Boss! Main hamesha aapka 100% loyal aur obedient AI assistant hoon. Aapka ek aadesh aur mera execution! Bataiye Boss, aaj kya seva karoon?`;
        return res.json({
          thought: "Responded loyally and obediently to Boss's playful loyalty command.",
          intent: "general_query",
          reply,
          voiceUsed: selectedVoice,
          summary: ["Responded with total loyalty and obedience to Boss"],
          actions: []
        });
      }

      // 3. INVENTORY QUERIES (Checking current uploaded content in MaxPlay)
      if (isInventoryQuery) {
        const totalCount = library.length;
        const animes = library.filter((c: any) => c.type === 'anime');
        const movies = library.filter((c: any) => c.type === 'movie');
        const series = library.filter((c: any) => c.type === 'series');

        const isAnimeSpecific = /\b(anime|animes)\b/i.test(prompt) && !/\b(movie|series)\b/i.test(prompt);
        const isMovieSpecific = /\b(movie|movies|film)\b/i.test(prompt) && !/\b(anime|series)\b/i.test(prompt);

        let invReply = "";
        const suggestionChips: { label: string; prompt: string }[] = [];

        if (totalCount === 0) {
          invReply = `Boss, abhi MaxPlay library me koi content upload nahi mila (ya library load ho rahi hai).\n\nAap chahein toh abhi naya anime ya movie upload kar sakte hain! Bas boliye: *"Solo Leveling anime upload karo"* ya *"Jawan movie upload karo"*.`;
          suggestionChips.push(
            { label: "📺 Naya Anime Upload", prompt: "Naya anime upload karna hai" },
            { label: "🎬 Nayi Movie Upload", prompt: "Nayi movie upload karna hai" }
          );
        } else if (isAnimeSpecific) {
          const animeListText = animes.length > 0 
            ? animes.map((a: any, idx: number) => `${idx + 1}. **${a.title}** (${a.year || '2024'}) — ${a.seasonsCount || 1} Season, ${a.episodesCount || 12} Episodes [${(a.languages || ['Hindi']).join(', ')}]`).join('\n')
            : "Abhi koi anime upload nahi hai.";
          invReply = `Boss, MaxPlay me abhi kul **${animes.length} Anime** upload ho chuke hain:\n\n${animeListText}\n\nAap inme se kisi bhi anime ko edit kar sakte hain ya usme naye episodes add kar sakte hain. Bas chat me boliye: *"[Anime Name] edit karna hai"*!`;
          animes.slice(0, 4).forEach((a: any) => {
            suggestionChips.push({ label: `✏️ Edit ${a.title}`, prompt: `${a.title} edit karna hai` });
          });
        } else if (isMovieSpecific) {
          const movieListText = movies.length > 0 
            ? movies.map((m: any, idx: number) => `${idx + 1}. **${m.title}** (${m.year || '2024'}) — Rating: ⭐${m.rating || '8.5'} [${(m.qualities || ['1080p']).join(', ')}]`).join('\n')
            : "Abhi koi movie upload nahi hai.";
          invReply = `Boss, MaxPlay me abhi kul **${movies.length} Movies** upload ho chuki hain:\n\n${movieListText}\n\nKisi bhi movie ki links ya qualities edit karne ke liye chat me boliye: *"[Movie Name] edit karna hai"*!`;
          movies.slice(0, 4).forEach((m: any) => {
            suggestionChips.push({ label: `✏️ Edit ${m.title}`, prompt: `${m.title} edit karna hai` });
          });
        } else {
          invReply = `Boss, MaxPlay library me abhi kul **${totalCount} Titles** uploaded hain:\n\n` +
            `• 📺 **Anime (${animes.length})**: ${animes.length > 0 ? animes.slice(0, 5).map((a: any) => a.title).join(', ') + (animes.length > 5 ? ` (+${animes.length - 5} more)` : '') : 'None'}\n` +
            `• 🎬 **Movies (${movies.length})**: ${movies.length > 0 ? movies.slice(0, 5).map((m: any) => m.title).join(', ') + (movies.length > 5 ? ` (+${movies.length - 5} more)` : '') : 'None'}\n` +
            `• 📽️ **Web Series (${series.length})**: ${series.length > 0 ? series.slice(0, 5).map((s: any) => s.title).join(', ') + (series.length > 5 ? ` (+${series.length - 5} more)` : '') : 'None'}\n\n` +
            `Aapko kisi title ki details dekhni ho ya use edit karna ho, chat me bas naam batayein!`;

          library.slice(0, 4).forEach((item: any) => {
            suggestionChips.push({ label: `✏️ Edit ${item.title}`, prompt: `${item.title} edit karna hai` });
          });
        }

        return res.json({
          thought: "Retrieved current library inventory and answered directly in chat.",
          intent: "inventory_query",
          reply: invReply,
          voiceUsed: selectedVoice,
          suggestionChips,
          summary: [
            `Total Uploads: ${totalCount}`,
            `Anime: ${animes.length} | Movies: ${movies.length} | Series: ${series.length}`
          ],
          actions: [] // NO page redirects!
        });
      }

      // 4. SPECIFIC EDIT INQUIRY (Title matched in database)
      if (isSpecificEditIntent && matchedContent) {
        const c = matchedContent;
        const typeStr = c.type === 'anime' ? 'Anime Series' : (c.type === 'movie' ? 'Movie' : 'Web Series');
        const langStr = Array.isArray(c.languages) && c.languages.length > 0 ? c.languages.join(', ') : 'Hindi';
        const qualStr = Array.isArray(c.qualities) && c.qualities.length > 0 ? c.qualities.join(', ') : '1080p, 720p';
        const genreStr = Array.isArray(c.genres) && c.genres.length > 0 ? c.genres.join(', ') : 'Action, Adventure';
        
        let epInfoStr = "";
        if (c.type !== 'movie') {
          epInfoStr = `• **Episodes & Seasons**: ${c.seasonsCount || 1} Season, ${c.episodesCount || 12} Total Episodes\n`;
        }

        let skipStr = "";
        if (c.skipMarkers && c.skipMarkers.intro) {
          skipStr = `• **Skip Markers**: Intro [${c.skipMarkers.intro.start || 0}s - ${c.skipMarkers.intro.end || 90}s]\n`;
        }

        const wantsToOpenForm = /\b(load|open|kholo|khool\s*do|le\s*jao|form\s*me\s*kholo|edit|update|badalna)\b/i.test(prompt);

        const editReply = `Haan Boss! **"${c.title}"** (${typeStr}) ka record mil gaya hai aur maine use Studio Edit Form me load kar diya hai. Abhi isme ye details maujud hain:\n\n` +
          `• **Title**: ${c.title} (${c.year || '2024'})\n` +
          `• **Type**: ${typeStr} | Rating: ⭐ ${c.rating || '8.8'}\n` +
          `• **Genres**: ${genreStr}\n` +
          `• **Audio Languages**: ${langStr}\n` +
          `• **Active Qualities**: ${qualStr}\n` +
          epInfoStr +
          skipStr +
          `\n**Aap isme kya modify karwana chahte hain?**\n` +
          `1. Skip markers (intro / outro) hatana ya badalna?\n` +
          `2. Quality update karna (jaise 720p hata kar 1080p lagana)?\n` +
          `3. Naye episodes ya stream links add karna?`;

        return res.json({
          thought: `Inspected ${c.title} from uploaded library and presented full configuration in chat.`,
          intent: "edit_inquiry",
          reply: editReply,
          voiceUsed: selectedVoice,
          suggestionChips: [
            { label: "⏩ Saare Skip Markers Hatao", prompt: `${c.title} me se skip markers jitne bhi set kiye hai sab ko hata do` },
            { label: "🎬 Set 1080p Quality", prompt: `${c.title} me 1080p quality set karo` },
            { label: "👁️ Step 2: Episodes Inspect", prompt: `Step 2 me episodes dikhao` }
          ],
          actions: wantsToOpenForm ? [{ type: "LOAD_FOR_EDIT", data: { contentId: c.id, title: c.title } }, { type: "GO_TO_STEP", step: 1 }] : [{ type: "LOAD_FOR_EDIT", data: { contentId: c.id, title: c.title } }],
          summary: [
            `Loaded "${c.title}" into Edit Studio`,
            `Languages: ${langStr}`,
            `Qualities: ${qualStr}`
          ]
        });
      }

      // 5. GENERAL EDIT INQUIRY (Title not specified yet)
      if (isGeneralEditIntent) {
        const topTitles = library.slice(0, 4).map((c: any) => c.title).filter(Boolean);
        const topChips = topTitles.map((t: string) => ({ label: `✏️ ${t}`, prompt: `${t} edit karna hai` }));

        const generalEditReply = `Haan Boss! Aapko kaun sa content edit karna hai?\n\n` +
          `Kripya title ka naam batayein (jaise kisi movie ya anime ka title). Main turant uski saari maujuda details nikaal kar chat me present kar dunga aur aap jo chahein modify kar sakte hain!`;

        return res.json({
          thought: "Politely asked admin which title to edit and offered quick options in chat.",
          intent: "edit_inquiry",
          reply: generalEditReply,
          voiceUsed: selectedVoice,
          suggestionChips: topChips.length > 0 ? topChips : [
            { label: "📊 Inventory Check Karo", prompt: "Kitne anime upload hai?" }
          ],
          summary: ["Awaiting content title for editing"],
          actions: [] // Stay in chat!
        });
      }

      // 6. CASUAL GREETINGS (When NOT an explicit upload order)
      if (isCasualGreeting) {
        const casualReplies = [
          `Haan Boss! Main bilkul badiya hoon. Aapka MaxPlay AI Copilot haazir hai! Bataiye aaj kya kaam karna hai?`,
          `Namaste Boss! MaxPlay AI Copilot online hai. Aap batayein aaj kaunsi movie/anime check karni hai, upload karni hai ya edit karni hai?`,
          `Hello Boss! Main ready hoon. Koi sawaal poochhna ho ya content manage karna ho, bas hukum kijiye!`
        ];
        const fallbackReply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
        return res.json({
          thought: "Responded warmly and respectfully to casual greeting.",
          intent: "general_query",
          reply: fallbackReply,
          voiceUsed: selectedVoice,
          suggestionChips: [
            { label: "📊 Inventory Overview", prompt: "Kitne anime aur content upload hai?" },
            { label: "🎬 Naya Upload", prompt: "Naya anime upload karna hai" },
            { label: "✏️ Edit Content", prompt: "Mujhe uploaded content edit karna hai" }
          ],
          summary: ["Responded to greeting in polite Hinglish"],
          actions: []
        });
      }

      // 7. CONVERSATIONAL QUESTIONS & TECHNICAL ADVICE (No TMDB search, pure chat answer!)
      if (isConversationalQuestion) {
        let conversationalReply = "";
        try {
          const chatModel = "gemini-3.1-flash-lite";
          const chatPrompt = `The Super Admin of MaxPlay streaming platform asked: "${prompt.trim()}".
You are the MaxPlay AI Copilot. Answer the admin directly, politely, and intelligently in fluent Hinglish.
Address them respectfully as "Boss".
Provide clear, expert, practical advice or explanations about streaming, video formats, bitrate, anime, platform management, or whatever they asked.
DO NOT generate upload actions or step transitions. Keep the answer concise and friendly.
Respond strictly in valid JSON format:
{
  "thought": "Reasoning about answer",
  "reply": "Your Hinglish response to Boss",
  "summary": ["Key point 1", "Key point 2"]
}`;
          const chatRes = await ai.models.generateContent({
            model: chatModel,
            contents: chatPrompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.3
            }
          });
          const parsedChat = JSON.parse(chatRes.text || "{}");
          if (parsedChat.reply) {
            return res.json({
              thought: parsedChat.thought || "Answered admin's question conversationally.",
              intent: "general_query",
              reply: parsedChat.reply,
              voiceUsed: selectedVoice,
              summary: parsedChat.summary || ["Answered question conversationally"],
              actions: []
            });
          }
        } catch (_) {}

        // Deterministic conversational fallback
        conversationalReply = `Haan Boss! Aapne poocha: "${prompt.trim()}".\n\n` +
          `MaxPlay streaming platform par sabhi streams HLS (.m3u8) aur standard MP4 formats me optimized hain. Video resolutions 1080p (approx 4-6 Mbps) aur 720p (approx 2-3 Mbps) best balance deti hain high quality aur zero buffer streaming ke liye.\n\nAapko platform me kisi specific feature ya content ke baare me detail chahiye ho toh batayein!`;

        return res.json({
          thought: "Answered admin's question conversationally via deterministic engine.",
          intent: "general_query",
          reply: conversationalReply,
          voiceUsed: selectedVoice,
          summary: ["Answered technical/streaming query in chat"],
          actions: []
        });
      }

      // 8. TMDB Search (STRICTLY for explicit upload orders with specific title)
      const isGenericTitle = /^(Web Series|Anime Series|New Movie|New Media|is series|nayi series|series|anime|movie)$/i.test(searchTitle.trim());
      const shouldSearchTmdb = isExplicitUploadOrder && !isGenericTitle && !isCasualGreeting && !isLoyaltyOrFunRequest && !isInventoryQuery && !isConversationalQuestion;
      if (shouldSearchTmdb && TMDB_API_KEY && TMDB_API_KEY !== "paste_your_api_key_here") {
        try {
          if (searchTitle) {
            const isTvSearch = mediaType !== "movie";
            const queryCandidates = [
              searchTitle,
              searchTitle.replace(/season\s*\d+/gi, "").trim(),
              searchTitle.split(" ").slice(0, 2).join(" ").trim()
            ].filter((q, idx, arr) => q && arr.indexOf(q) === idx);

            let topResult = null;
            for (const q of queryCandidates) {
              if (topResult) break;
              const searchEndpoints = isTvSearch
                ? [
                    `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`,
                    `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`
                  ]
                : [
                    `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`,
                    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`
                  ];

              for (const url of searchEndpoints) {
                try {
                  const tmdbRes = await fetch(url);
                  if (tmdbRes.ok) {
                    const tmdbData = await tmdbRes.json();
                    if (tmdbData.results && tmdbData.results.length > 0) {
                      topResult = tmdbData.results[0];
                      break;
                    }
                  }
                } catch (_) {}
              }
            }

            if (topResult) {
              const genreNames = (topResult.genre_ids || [])
                .map((gid: number) => TMDB_GENRES[gid])
                .filter(Boolean);

              if (mediaType === "anime" && !genreNames.includes("Anime")) {
                genreNames.unshift("Anime");
              }

              enhancedContext.tmdbMetadata = {
                title: topResult.title || topResult.name || topResult.original_name || searchTitle,
                type: topResult.media_type === "movie" ? "movie" : (mediaType === "anime" ? "anime" : (mediaType === "movie" ? "movie" : "series")),
                description: topResult.overview || `Official synopsis for ${topResult.title || topResult.name || searchTitle}`,
                posterUrl: topResult.poster_path ? `https://image.tmdb.org/t/p/w500${topResult.poster_path}` : null,
                backdropUrl: topResult.backdrop_path ? `https://image.tmdb.org/t/p/w1280${topResult.backdrop_path}` : (topResult.poster_path ? `https://image.tmdb.org/t/p/w1280${topResult.poster_path}` : null),
                rating: topResult.vote_average ? Number(topResult.vote_average.toFixed(1)) : 8.5,
                year: topResult.release_date ? topResult.release_date.substring(0, 4) : (topResult.first_air_date ? topResult.first_air_date.substring(0, 4) : "2024"),
                genres: genreNames.length > 0 ? genreNames : ["Action", "Adventure", "Fantasy"]
              };
            }
          }
        } catch(err) {
          console.error("TMDB Enhancement error:", err);
        }
      }

      // High-quality fallback for Solo Leveling if TMDB offline
      if (!enhancedContext.tmdbMetadata && /solo\s*leveling/i.test(prompt) && (isExplicitUploadOrder || isMediaInquiry)) {
        enhancedContext.tmdbMetadata = {
          title: "Solo Leveling",
          type: "anime",
          description: "In a world where hunters, humans who possess magical abilities, battle deadly monsters to protect the human race from certain defeat, a weak hunter named Sung Jinwoo embarks on a quest to become the greatest hunter.",
          posterUrl: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8BGdM.jpg",
          backdropUrl: "https://image.tmdb.org/t/p/w1280/84XPpjGvx2v8N9o0M7iJ8vA1iYf.jpg",
          rating: 8.8,
          year: "2024",
          genres: ["Anime", "Action", "Fantasy", "Supernatural"]
        };
      }

      const tmdb = enhancedContext.tmdbMetadata;

      // 5. Media Inquiries (Asking questions without ordering upload)
      if (isMediaInquiry && !isExplicitUploadOrder) {
        const title = tmdb?.title || searchTitle || "is content";
        const desc = tmdb?.description ? ` Iski story: ${tmdb.description.slice(0, 180)}...` : "";
        const rating = tmdb?.rating ? ` TMDB rating lagbhag ${tmdb.rating}/10 hai.` : "";
        const year = tmdb?.year ? ` (${tmdb.year})` : "";
        const reply = `Haan Boss! ${title}${year} ek zabardast ${tmdb?.type || mediaType} hai!${rating}${desc} Agar aap ise MaxPlay par upload karna chahein, to bas hukum kijiye aur main turant form aur episodes draft kar dunga!`;
        return res.json({
          thought: "Answered media inquiry conversationally without opening upload form.",
          intent: "general_query",
          reply,
          tmdbMetadata: tmdb || null,
          voiceUsed: selectedVoice,
          summary: [`Provided information and synopsis for ${title}`],
          actions: []
        });
      }

      // 6. Proactive Duration Probing for provided URLs (Parallelized for fast execution)
      if (mappedLinks.length > 0) {
        await Promise.all(
          mappedLinks.map(async (l) => {
            try {
              const dSec = await probeVideoDuration(l.url);
              if (dSec > 0) l.probedDurationSec = dSec;
            } catch (_) {}
          })
        );
      }

      // 7. Explicit Upload Order Handling - Gemini AI invocation with strict directives
      const primaryLang = targetLanguages[0] || "Hindi";
      const primaryQual = targetQualities[0] || "1080p";

      let seasonsDirective = "";
      if (isMultiSeason) {
        seasonsDirective = `\n- MULTIPLE SEASONS REQUESTED (CRITICAL MANDATE):
Boss explicitly ordered ${sortedSeasons.length} seasons in this single command:
${sortedSeasons.map(s => `  • Season ${s.seasonNumber}: Exactly ${s.episodeCount} episode boxes MUST be generated`).join('\n')}
You MUST output a separate "BUILD_SERIES_EPISODES" action in the "actions" array for EACH requested season:
${sortedSeasons.map(s => `  - Action: { "type": "BUILD_SERIES_EPISODES", "data": { "seasonNumber": ${s.seasonNumber}, "seasonTitle": "Season ${s.seasonNumber}", "episodes": [exactly ${s.episodeCount} episode objects (epNum 1 to ${s.episodeCount})] } }`).join('\n')}
DO NOT stop after Season 1! Both Season 1 and Season 2 (and all requested seasons) MUST be present in the actions array!`;
      } else {
        const s = sortedSeasons[0];
        seasonsDirective = `\n- SEASON NUMBER: ${s.seasonNumber}
- TARGET EPISODE COUNT: Exactly ${s.episodeCount} episodes MUST be in the "BUILD_SERIES_EPISODES" episodes array (epNum: 1 to ${s.episodeCount}). NEVER output fewer episodes!`;
      }

      let taskDirective = `\nCRITICAL UPLOAD SPECIFICATIONS (STRICTLY ADHERE TO THESE):
- MEDIA TYPE: "${mediaType}"${seasonsDirective}
- ALL TARGET QUALITIES: [${allActiveQualities.map(q => `"${q}"`).join(", ")}] in "FILL_UPLOAD_METADATA.data.qualities".
- TARGET LANGUAGES: [${targetLanguages.map(l => `"${l}"`).join(", ")}] in "FILL_UPLOAD_METADATA.data.languages".
- SPECIFIC EPISODE OVERRIDES:
  ${Object.keys(episodeQualitiesMap).length > 0 
    ? `Specific episode quality overrides: ${Object.entries(episodeQualitiesMap).map(([ep, qs]) => `Episode ${ep} -> [${qs.join(', ')}]`).join('; ')} (All other episodes use base quality [${targetQualities.join(', ')}])`
    : `All episodes use base quality [${targetQualities.join(', ')}]`}
  ${Object.keys(episodePartsMap).length > 0 
    ? `Specific episode parts: ${Object.entries(episodePartsMap).map(([ep, cnt]) => `Episode ${ep} has ${cnt} parts`).join('; ')}`
    : 'Single part default per episode.'}
- LINK MAPPING MANDATE:
  ${mappedLinks.length > 0 
    ? `Boss provided ${mappedLinks.length} stream links: ${JSON.stringify(mappedLinks.map(l => ({ seasonNum: l.seasonNum, epNum: l.epNum, partNum: l.partNum, url: l.url })))}. Paste these into their exact season and episodes.` 
    : 'Boss provided NO stream links in this message.'}
  CRITICAL: For all episodes where NO link was provided, keep input boxes clean and empty with NO fake URLs (no example.com, no test.mp4, no duplicates)!
- DURATION: Include CALCULATE_DURATION action.
- NAVIGATION: End with GO_TO_STEP 2 action.`;

      const userMessage = `Admin Command: ${prompt.trim()}\nCurrent Admin Context: ${JSON.stringify(enhancedContext)}${taskDirective}\nPlease analyze the admin's command and output the structured operational plan.`;

      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];
      let lastErr = null;
      let response = null;

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const generatePromise = ai.models.generateContent({
              model: modelName,
              contents: userMessage,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            });
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Gemini call timed out after 7s")), 7000)
            );
            response = await Promise.race([generatePromise, timeoutPromise]) as any;
            if (response && response.text) break;
          } catch (err: any) {
            lastErr = err;
            const isQuotaErr = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("Quota exceeded") || err?.message?.includes("resource_exhausted");
            if (isQuotaErr) break; // Break attempt to move to next candidate model
            const isUnavailable = err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE") || err?.status === 503;
            if (isUnavailable && attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
              continue;
            }
            break;
          }
        }
        if (response && response.text) break;
      }

      // Build flawless episodes structure helper supporting multi-seasons, per-episode qualities, and parts
      const buildVerifiedEpisodesForSeason = (seasonNum: number, epCount: number) => {
        const episodesList: any[] = [];
        const seasonLinks = mappedLinks.filter(l => (l.seasonNum || 1) === seasonNum);

        for (let epI = 1; epI <= epCount; epI++) {
          const linksForThisEp = seasonLinks.filter(l => l.epNum === epI).sort((a, b) => a.partNum - b.partNum);
          
          // Determine qualities for this specific episode
          const epQualities = (episodeQualitiesMap[epI] && episodeQualitiesMap[epI].length > 0)
            ? episodeQualitiesMap[epI]
            : targetQualities;

          // Determine parts count for this specific episode
          const customPartsCount = episodePartsMap[epI] || (linksForThisEp.length > 0 ? linksForThisEp.length : 1);

          if (linksForThisEp.length > 0) {
            let epDurationSum = 0;
            const builtLinks = linksForThisEp.map(l => {
              const pSec = l.probedDurationSec || 1420;
              epDurationSum += pSec;
              const vSources: Record<string, Record<string, string>> = {};
              targetLanguages.forEach(lng => {
                vSources[lng] = {};
                epQualities.forEach(ql => {
                  vSources[lng][ql] = l.url;
                });
              });
              return {
                partNum: l.partNum,
                duration: formatDurationSec(pSec),
                videoSources: vSources
              };
            });

            // If custom parts count is greater than links provided, add remaining empty parts
            while (builtLinks.length < customPartsCount) {
              const nextPartNum = builtLinks.length + 1;
              const emptySources: Record<string, Record<string, string>> = {};
              targetLanguages.forEach(lng => {
                emptySources[lng] = {};
                epQualities.forEach(ql => {
                  emptySources[lng][ql] = "";
                });
              });
              builtLinks.push({
                partNum: nextPartNum,
                duration: "",
                videoSources: emptySources
              });
            }

            // Skip markers for this specific episode
            const epSkipMarkers = episodeSkipMarkersMap[epI] || { intro: { start: 0, end: 90 } };

            episodesList.push({
              epNum: epI,
              title: `${tmdb?.title || searchTitle || 'Content'} - S${seasonNum} E${epI}`,
              duration: formatDurationSec(epDurationSum),
              qualities: epQualities,
              partsCount: customPartsCount,
              links: builtLinks,
              skipMarkers: epSkipMarkers
            });
          } else {
            // Unprovided links: build Part 1 (+ Extra parts if customPartsCount > 1) with clean empty sources!
            const builtLinks: any[] = [];
            for (let pNum = 1; pNum <= customPartsCount; pNum++) {
              const emptySources: Record<string, Record<string, string>> = {};
              targetLanguages.forEach(lng => {
                emptySources[lng] = {};
                epQualities.forEach(ql => {
                  emptySources[lng][ql] = "";
                });
              });
              builtLinks.push({
                partNum: pNum,
                duration: "",
                videoSources: emptySources
              });
            }

            // Skip markers for this specific episode
            const epSkipMarkers = episodeSkipMarkersMap[epI] || { intro: { start: 0, end: 90 } };

            episodesList.push({
              epNum: epI,
              title: `${tmdb?.title || searchTitle || 'Content'} - S${seasonNum} E${epI}`,
              duration: "",
              qualities: epQualities,
              partsCount: customPartsCount,
              links: builtLinks,
              skipMarkers: epSkipMarkers
            });
          }
        }
        return episodesList;
      };

      // Helper for human-readable duration strings
      const formatHumanDuration = (totalSec: number) => {
        if (!totalSec || totalSec <= 0) return "0 sec";
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hrs > 0) {
          return `${hrs} Hour${hrs > 1 ? 's' : ''} ${mins} Min ${secs} Sec`;
        }
        return `${mins} Min ${secs} Sec`;
      };

      // 8. Fallback automation engine if Gemini is rate limited or unavailable
      if (!response || !response.text) {
        console.warn("Using smart deterministic automation engine for upload configuration...");

        const fallbackActions: any[] = [];

        fallbackActions.push({
          type: "FILL_UPLOAD_METADATA",
          data: {
            title: tmdb?.title || searchTitle || "New Media",
            type: mediaType,
            description: tmdb?.description || `Official synopsis for ${tmdb?.title || searchTitle}`,
            posterUrl: tmdb?.posterUrl || "https://images.unsplash.com/photo-1618331835717-801e976710b2?w=800",
            backdropUrl: tmdb?.backdropUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280",
            rating: tmdb?.rating || "8.8",
            year: tmdb?.year || "2024",
            genres: tmdb?.genres || (mediaType === "anime" ? ["Anime", "Action", "Fantasy"] : ["Action", "Adventure", "Drama"]),
            languages: targetLanguages,
            qualities: targetQualities
          }
        });

        if (mediaType === "movie") {
          const movieLinks = mappedLinks.map(l => {
            const pSec = l.probedDurationSec || 7200;
            const vSources: Record<string, Record<string, string>> = {};
            targetLanguages.forEach(lng => {
              vSources[lng] = {};
              targetQualities.forEach(ql => {
                vSources[lng][ql] = l.url;
              });
            });
            return {
              partNum: l.partNum,
              duration: formatDurationSec(pSec),
              videoSources: vSources
            };
          });

          fallbackActions.push({
            type: "CONFIGURE_MOVIE_LINKS",
            data: {
              links: movieLinks,
              skipMarkers: { intro: { start: 0, end: 90 } }
            }
          });
        } else {
          // Output a separate BUILD_SERIES_EPISODES action for EACH requested season!
          for (const s of sortedSeasons) {
            fallbackActions.push({
              type: "BUILD_SERIES_EPISODES",
              data: {
                seasonNumber: s.seasonNumber,
                seasonTitle: "Season " + s.seasonNumber,
                episodes: buildVerifiedEpisodesForSeason(s.seasonNumber, s.episodeCount)
              }
            });
          }
        }

        fallbackActions.push({
          type: "CALCULATE_DURATION",
          mode: mediaType === "movie" ? "movie" : "episode"
        });

        fallbackActions.push({
          type: "GO_TO_STEP",
          step: 2
        });

        const linkedCount = mappedLinks.length;
        let epBreakdown = "";
        let totalSeasonSeconds = 0;

        if (mappedLinks.length > 0) {
          for (const s of sortedSeasons) {
            const sLinks = mappedLinks.filter(l => (l.seasonNum || 1) === s.seasonNumber);
            if (sLinks.length > 0) {
              epBreakdown += `\n**Season ${s.seasonNumber} Links**:`;
              for (let epI = 1; epI <= s.episodeCount; epI++) {
                const epLinks = sLinks.filter(l => l.epNum === epI).sort((a, b) => a.partNum - b.partNum);
                if (epLinks.length > 0) {
                  const epTotalSec = epLinks.reduce((acc, curr) => acc + (curr.probedDurationSec || 1420), 0);
                  totalSeasonSeconds += epTotalSec;
                  const partsText = epLinks.map((l, idx) => `Part ${idx + 1} (${formatHumanDuration(l.probedDurationSec || 1420)})`).join(" + ");
                  epBreakdown += `\n  • Episode ${epI} (${epLinks.length} Part${epLinks.length > 1 ? 's' : ''}): ${partsText} => Total: **${formatHumanDuration(epTotalSec)}**`;
                }
              }
            }
          }
        }

        let overridesSummary = "";
        if (Object.keys(episodeQualitiesMap).length > 0) {
          overridesSummary += `• Specific Quality Overrides: ${Object.entries(episodeQualitiesMap).map(([ep, qs]) => `Episode ${ep} -> [${qs.join(', ')}]`).join(', ')} (Baki sab [${targetQualities.join(', ')}]).\n`;
        }
        if (Object.keys(episodePartsMap).length > 0) {
          overridesSummary += `• Multi-Part Configuration: ${Object.entries(episodePartsMap).map(([ep, cnt]) => `Episode ${ep} me ${cnt} parts honge`).join(', ')}.\n`;
        }
        if (Object.keys(episodeSkipMarkersMap).length > 0) {
          overridesSummary += `• Isolated Skip Markers: ${Object.entries(episodeSkipMarkersMap).map(([ep, sm]) => `Episode ${ep} (Intro: ${sm.intro ? `${sm.intro.start}s-${sm.intro.end}s` : 'None'})`).join(', ')}.\n`;
        }

        const totalAllEpisodesCount = sortedSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
        const seasonsLines = sortedSeasons.map(s => `  • **Season ${s.seasonNumber}**: Exactly ${s.episodeCount} episode boxes`).join('\n');

        let fallbackReply = "";
        if (isMultiSeason) {
          fallbackReply = `Haan Boss! Aapke aadesh ke mutabiq maine **${tmdb?.title || searchTitle || 'series'}** (${mediaType === 'anime' ? 'Anime Series' : 'Series'}) ke sabhi ${sortedSeasons.length} seasons successfully prepare kar diye hain:\n` +
            `${seasonsLines}\n` +
            `• **Total Episodes**: Sabhi seasons milakar exactly **${totalAllEpisodesCount} episode boxes** generate kar diye gaye hain.\n` +
            `• **Selected Quality**: [${targetQualities.join(', ')}] select kiya hai.\n` +
            `• **Audio Language**: Sirf [${targetLanguages.join(', ')}] language set ki gayi hai.\n` +
            overridesSummary +
            (linkedCount > 0 
              ? `• Links & Duration Breakdown:${epBreakdown}\n` +
                `• **Total Calculated Duration**: **${formatHumanDuration(totalSeasonSeconds)}**!\n`
              : `• Stream Links: Message me koi video link nahi tha, isliye sabhi ${totalAllEpisodesCount} episodes ke input boxes bilkul clean aur empty chhod diye hain!\n`) +
            `Upload form Step 2 live open kar diya hai Boss! Season tabs se aap Season 1 aur Season 2 ke beech switch karke episodes verify kar sakte hain.`;
        } else {
          fallbackReply = `Haan Boss! Aapke aadesh ke mutabiq maine **${tmdb?.title || searchTitle || 'content'}** (${mediaType === 'anime' ? 'Anime Series' : 'Series'}, Season ${sortedSeasons[0].seasonNumber}) prepare kar diya hai:\n` +
            `• Total Episodes: Exactly ${sortedSeasons[0].episodeCount} episodes banaye hain.\n` +
            `• Global Selected Quality: [${targetQualities.join(', ')}] select kiya hai.\n` +
            `• Audio Language: Sirf [${targetLanguages.join(', ')}] language select ki gayi hai.\n` +
            overridesSummary +
            (linkedCount > 0 
              ? `• Links & Duration Breakdown:${epBreakdown}\n` +
                `• **Total Season Calculated Duration**: **${formatHumanDuration(totalSeasonSeconds)}**!\n`
              : `• Stream Links: Koi link message me nahi tha, isliye sabhi ${sortedSeasons[0].episodeCount} episodes ke input boxes bilkul clean aur empty chhod diye hain!\n`) +
            `Step 2 upload form open kar diya hai Boss!`;
        }

        const summaryBullets = [
          ...sortedSeasons.map(s => `Built Season ${s.seasonNumber} with ${s.episodeCount} episode boxes`),
          `Audio language set to ${targetLanguages.join(', ')}`,
          `Global selected quality: ${targetQualities.join(', ')}`,
          Object.keys(episodeQualitiesMap).length > 0 ? `Per-episode quality overrides: ${Object.entries(episodeQualitiesMap).map(([ep, qs]) => `Ep ${ep} [${qs.join(', ')}]`).join(', ')}` : null,
          Object.keys(episodePartsMap).length > 0 ? `Multi-part episodes configured` : null,
          Object.keys(episodeSkipMarkersMap).length > 0 ? `Episode-specific skip markers configured` : null,
          linkedCount > 0 ? `Pasted provided links and probed duration` : `Input boxes kept clean & empty for unprovided links`,
          `Navigated to Step 2 upload form`
        ].filter(Boolean) as string[];

        return res.json({
          thought: "Configured media upload adhering strictly to Boss's multiple seasons, episode count, quality, language, and link pasting instructions.",
          intent: mediaType === "movie" ? "movie_upload" : "series_upload",
          reply: fallbackReply,
          voiceUsed: selectedVoice,
          tmdbMetadata: tmdb || null,
          summary: summaryBullets,
          actions: fallbackActions
        });
      }

      // 9. Process and sanitize Gemini's response to guarantee 100% adherence
      const responseText = response.text || "{}";
      try {
        const parsed = JSON.parse(responseText);
        if (enhancedContext.tmdbMetadata && !parsed.tmdbMetadata) {
          parsed.tmdbMetadata = enhancedContext.tmdbMetadata;
        }

        // Post-process actions to ensure compliance
        if (Array.isArray(parsed.actions)) {
          let hasMetadata = false;
          let hasCalc = false;
          let hasStep = false;

          for (const act of parsed.actions) {
            if (act.type === "FILL_UPLOAD_METADATA") {
              hasMetadata = true;
              act.data = act.data || {};
              act.data.qualities = targetQualities;
              act.data.languages = targetLanguages;
              if (mediaType === "anime") {
                act.data.type = "anime";
                if (!act.data.genres || !act.data.genres.includes("Anime")) {
                  act.data.genres = ["Anime", ...(act.data.genres || ["Action", "Fantasy"])];
                }
              }
              if (tmdb) {
                if (!act.data.posterUrl) act.data.posterUrl = tmdb.posterUrl;
                if (!act.data.backdropUrl) act.data.backdropUrl = tmdb.backdropUrl;
                if (!act.data.title) act.data.title = tmdb.title;
              }
            }
            if (act.type === "CALCULATE_DURATION") hasCalc = true;
            if (act.type === "GO_TO_STEP") hasStep = true;
          }

          if (mediaType !== "movie") {
            const existingSeasonActions = parsed.actions.filter((a: any) => a.type === "BUILD_SERIES_EPISODES");

            // Guarantee that EVERY season requested by the admin is present with exact verified episodes
            for (const s of sortedSeasons) {
              const matchedAction = existingSeasonActions.find((a: any) => (a.data?.seasonNumber || 1) === s.seasonNumber);
              if (matchedAction) {
                matchedAction.data = matchedAction.data || {};
                matchedAction.data.seasonNumber = s.seasonNumber;
                matchedAction.data.seasonTitle = "Season " + s.seasonNumber;
                matchedAction.data.episodes = buildVerifiedEpisodesForSeason(s.seasonNumber, s.episodeCount);
              } else {
                // Gemini omitted this season; inject it into actions!
                parsed.actions.push({
                  type: "BUILD_SERIES_EPISODES",
                  data: {
                    seasonNumber: s.seasonNumber,
                    seasonTitle: "Season " + s.seasonNumber,
                    episodes: buildVerifiedEpisodesForSeason(s.seasonNumber, s.episodeCount)
                  }
                });
              }
            }

            // Remove any extra/hallucinated seasons not in sortedSeasons
            parsed.actions = parsed.actions.filter((a: any) => {
              if (a.type !== "BUILD_SERIES_EPISODES") return true;
              return sortedSeasons.some(s => s.seasonNumber === (a.data?.seasonNumber || 1));
            });
          }

          if (!hasMetadata && tmdb) {
            parsed.actions.unshift({
              type: "FILL_UPLOAD_METADATA",
              data: {
                title: tmdb.title,
                type: mediaType,
                description: tmdb.description,
                posterUrl: tmdb.posterUrl,
                backdropUrl: tmdb.backdropUrl,
                rating: tmdb.rating,
                year: tmdb.year,
                genres: mediaType === "anime" ? ["Anime", ...tmdb.genres] : tmdb.genres,
                qualities: targetQualities,
                languages: targetLanguages
              }
            });
          }

          if (!hasCalc) {
            parsed.actions.push({
              type: "CALCULATE_DURATION",
              mode: mediaType === "movie" ? "movie" : "episode"
            });
          }

          if (!hasStep) {
            parsed.actions.push({
              type: "GO_TO_STEP",
              step: 2
            });
          }
        }

        // If multi-season, ensure reply and summary explicitly reflect all seasons
        if (isMultiSeason) {
          const totalAllEpisodesCount = sortedSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
          const seasonsLines = sortedSeasons.map(s => `  • **Season ${s.seasonNumber}**: Exactly ${s.episodeCount} episode boxes`).join('\n');
          parsed.reply = `Haan Boss! Maine **${tmdb?.title || searchTitle || 'series'}** ke sabhi ${sortedSeasons.length} seasons successfully prepare kar diye hain:\n` +
            `${seasonsLines}\n` +
            `• **Total Episodes**: Sabhi seasons milakar exactly **${totalAllEpisodesCount} episode boxes** generate kar diye gaye hain.\n` +
            `• **Selected Quality**: [${targetQualities.join(', ')}] select kiya hai.\n` +
            `• **Audio Language**: Sirf [${targetLanguages.join(', ')}] language set ki gayi hai.\n` +
            `Upload form Step 2 live open kar diya hai Boss! Season tabs se aap Season 1 aur Season 2 ke beech switch karke episodes verify kar sakte hain.`;
          parsed.summary = [
            ...sortedSeasons.map(s => `Built Season ${s.seasonNumber} with ${s.episodeCount} episode boxes`),
            `Quality: ${targetQualities.join(', ')}`,
            `Language: ${targetLanguages.join(', ')}`,
            `Navigated to Step 2 upload form`
          ];
        }

        let inlineAudio: { audio: string; format: string } | null = null;
        if (parsed.reply) {
          try {
            inlineAudio = await Promise.race([
              generateInlineTts(ai, parsed.reply, selectedVoice, elevenlabsApiKey, elevenlabsVoiceId),
              new Promise<null>((r) => setTimeout(() => r(null), 3000))
            ]);
          } catch(e){}
        }

        res.json({
          ...parsed,
          audioBase64: inlineAudio?.audio || null,
          audioFormat: inlineAudio?.format || "mp3",
          voiceUsed: selectedVoice
        });
      } catch (parseErr) {
        console.error("Failed to parse Gemini output as JSON, returning verified fallback:", parseErr);
        const totalAllEpisodesCount = sortedSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
        res.json({
          thought: "Recovered from JSON parsing error with strict verified action plan.",
          intent: mediaType === "movie" ? "movie_upload" : "series_upload",
          reply: `Haan Boss! ${tmdb?.title || searchTitle} ke liye ${totalAllEpisodesCount} episodes aur ${targetQualities.join(', ')} (${targetLanguages.join(', ')}) settings tayar kar di hain!`,
          voiceUsed: selectedVoice,
          tmdbMetadata: tmdb || null,
          summary: [`Configured ${totalAllEpisodesCount} episodes`, `Quality: ${targetQualities.join(', ')}`, `Language: ${targetLanguages.join(', ')}`],
          actions: [
            {
              type: "FILL_UPLOAD_METADATA",
              data: {
                title: tmdb?.title || searchTitle,
                type: mediaType,
                description: tmdb?.description || "",
                posterUrl: tmdb?.posterUrl || "",
                backdropUrl: tmdb?.backdropUrl || "",
                rating: tmdb?.rating || "8.8",
                year: tmdb?.year || "2024",
                genres: tmdb?.genres || ["Action", "Fantasy"],
                qualities: targetQualities,
                languages: targetLanguages
              }
            },
            ...sortedSeasons.map(s => ({
              type: "BUILD_SERIES_EPISODES",
              data: {
                seasonNumber: s.seasonNumber,
                seasonTitle: "Season " + s.seasonNumber,
                episodes: buildVerifiedEpisodesForSeason(s.seasonNumber, s.episodeCount)
              }
            })),
            { type: "CALCULATE_DURATION", mode: "episode" },
            { type: "GO_TO_STEP", step: 2 }
          ]
        });
      }
    } catch (err: any) {
      console.error("Admin Co-pilot error:", err);
      res.status(500).json({
        error: err.message || "Failed to process AI assistant command",
      });
    }
  });

  // In-memory TTS cache to prevent rate limit spikes and provide 0ms cached playback
  const ttsAudioCache = new Map<string, { audio: string; format: string }>();

  // Runtime ElevenLabs configuration state (synced with user's settings)
  let runtimeElevenLabsApiKey: string = process.env.ELEVENLABS_API_KEY || "";
  let runtimeElevenLabsVoiceId: string = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  // Endpoints for checking and updating ElevenLabs configuration
  app.get("/api/admin/elevenlabs/config", (_req, res) => {
    const activeKey = runtimeElevenLabsApiKey || process.env.ELEVENLABS_API_KEY || "";
    const activeVoice = runtimeElevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    res.json({
      configured: Boolean(activeKey && activeKey.trim().length > 10),
      hasVoiceId: Boolean(activeVoice && activeVoice.trim().length > 0),
      voiceId: activeVoice,
      maskedKey: activeKey ? `${activeKey.substring(0, 4)}...${activeKey.substring(activeKey.length - 4)}` : ""
    });
  });

  app.post("/api/admin/elevenlabs/config", (req, res) => {
    const { apiKey, voiceId } = req.body;
    if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      runtimeElevenLabsApiKey = apiKey.trim();
    }
    if (voiceId && typeof voiceId === "string" && voiceId.trim()) {
      runtimeElevenLabsVoiceId = voiceId.trim();
    }
    res.json({
      success: true,
      configured: Boolean(runtimeElevenLabsApiKey && runtimeElevenLabsApiKey.trim().length > 10),
      voiceId: runtimeElevenLabsVoiceId
    });
  });

  // Check ElevenLabs live subscription & quota limits (detects 402 early)
  app.get("/api/admin/elevenlabs/subscription", async (req, res) => {
    try {
      const apiKey = ((req.query.apiKey as string) || runtimeElevenLabsApiKey || process.env.ELEVENLABS_API_KEY || "").trim();
      if (!apiKey || apiKey.length < 8) {
        return res.json({ configured: false, error: "No ElevenLabs API Key provided" });
      }

      const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": apiKey }
      });

      if (!response.ok) {
        const errText = await response.text();
        const isQuota = response.status === 402;
        return res.json({
          configured: true,
          status: response.status,
          quotaExceeded: isQuota,
          error: isQuota
            ? "ElevenLabs Quota Exceeded (Error 402): Free tier character limit reached on this key."
            : `ElevenLabs HTTP ${response.status}: ${errText}`
        });
      }

      const data = await response.json();
      const count = data.character_count ?? 0;
      const limit = data.character_limit ?? 10000;
      const isExceeded = count >= limit;

      return res.json({
        configured: true,
        status: 200,
        characterCount: count,
        characterLimit: limit,
        remainingCharacters: Math.max(0, limit - count),
        quotaExceeded: isExceeded,
        tier: data.tier || "free",
        nextReset: data.next_invoice_date || null
      });
    } catch (e: any) {
      return res.json({ error: e.message || "Failed to check subscription" });
    }
  });

  async function generateElevenLabsTts(
    text: string,
    customApiKey?: string,
    customVoiceId?: string
  ): Promise<{ audio: string; format: string } | { error: string; status: number; quotaExceeded?: boolean } | null> {
    const apiKey = (customApiKey && customApiKey.trim()) || runtimeElevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return { error: "No ElevenLabs API Key provided. Please add your key in AI Co-Pilot Settings.", status: 400 };
    }

    const voiceId = (customVoiceId && customVoiceId.trim()) || runtimeElevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const cacheKey = `elevenlabs:${voiceId}:${text}`;

    if (ttsAudioCache.has(cacheKey)) {
      return ttsAudioCache.get(cacheKey) || null;
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn("ElevenLabs TTS response error:", response.status, errText);
        let parsedMsg = errText;
        try {
          const j = JSON.parse(errText);
          parsedMsg = j.detail?.message || j.detail || j.message || errText;
        } catch (_) {}

        // If custom voice requires paid/creator tier and failed, try standard default voice once
        if ((parsedMsg.includes("creator tier") || parsedMsg.includes("tier")) && voiceId !== "EXAVITQu4vr4xnSDxMaL") {
          try {
            const retryRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
              method: "POST",
              headers: {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey.trim(),
              },
              body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
              }),
            });
            if (retryRes.ok) {
              const arrayBuffer = await retryRes.arrayBuffer();
              const base64Audio = Buffer.from(arrayBuffer).toString("base64");
              const result = { audio: base64Audio, format: "mp3" };
              if (ttsAudioCache.size > 200) ttsAudioCache.clear();
              ttsAudioCache.set(cacheKey, result);
              return result;
            }
          } catch (_) {}
        }

        const isQuota = response.status === 402 ||
          parsedMsg.toLowerCase().includes("quota") ||
          parsedMsg.toLowerCase().includes("character limit") ||
          parsedMsg.toLowerCase().includes("credits") ||
          parsedMsg.toLowerCase().includes("payment required");

        return {
          error: isQuota
            ? "ElevenLabs Quota Exceeded (Error 402): Free tier character limit reached on this API key."
            : `ElevenLabs (${response.status}): ${parsedMsg}`,
          status: response.status,
          quotaExceeded: isQuota
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");
      const result = { audio: base64Audio, format: "mp3" };

      if (ttsAudioCache.size > 200) ttsAudioCache.clear();
      ttsAudioCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      console.error("ElevenLabs TTS exception:", err);
      return { error: err.message || "Network connection to ElevenLabs failed", status: 500 };
    }
  }

  async function generateInlineTts(
    ai: GoogleGenAI,
    text: string,
    voiceName: string = "Kore",
    elevenlabsApiKey?: string,
    elevenlabsVoiceId?: string
  ): Promise<{ audio: string; format: string } | null> {
    if (!text) return null;
    try {
      let spokenText = text
        .replace(/https?:\/\/\S+/g, "link")
        .replace(/[*_#`~>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\{[^\}]+\}/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (spokenText.length > 280) spokenText = spokenText.slice(0, 280) + "...";

      // 1. First priority: ElevenLabs ultra-realistic human speech
      const elevenlabsResult = await generateElevenLabsTts(spokenText, elevenlabsApiKey, elevenlabsVoiceId);
      if (elevenlabsResult && "audio" in elevenlabsResult) {
        return { audio: elevenlabsResult.audio, format: "mp3" };
      }

      const validVoices = ["Kore", "Aoede", "Leda", "Fenrir", "Puck", "Charon", "Orpheus", "Zephyr"];
      const voice = validVoices.includes(voiceName) ? voiceName : "Kore";
      const cacheKey = `gemini:${voice}:${spokenText}`;

      if (ttsAudioCache.has(cacheKey)) {
        const cached = ttsAudioCache.get(cacheKey);
        return cached ? { audio: cached.audio, format: cached.format } : null;
      }

      const ttsModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];
      for (const modelName of ttsModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ parts: [{ text: spokenText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          });

          const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            if (ttsAudioCache.size > 200) ttsAudioCache.clear();
            ttsAudioCache.set(cacheKey, { audio: audioData, format: "pcm24k" });
            return { audio: audioData, format: "pcm24k" };
          }
        } catch (mErr) {
          // Continue to next TTS candidate model
        }
      }
      return null;
    } catch (err: any) {
      return null;
    }
  }

  // ============================================================================
  // 🎙️ MAXPLAY AI CO-PILOT: ULTRA-REALISTIC HUMAN SPEECH SYNTHESIS ENGINE (TTS)
  // ============================================================================
  app.post(["/api/admin/co-pilot/tts", "/api/ai/admin-copilot/tts"], async (req, res) => {
    try {
      const { text, voice = "Kore", elevenlabsApiKey, elevenlabsVoiceId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required for speech synthesis" });
      }

      // Convert raw formatting/markdown/URLs to natural human conversational phrasing
      let spokenText = text
        .replace(/https?:\/\/\S+/g, "link")
        .replace(/[*_#`~>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\{[^\}]+\}/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (spokenText.length > 250) {
        // Keep conversational responses punchy and avoid draining character limits
        spokenText = spokenText.slice(0, 250) + "...";
      }

      // 1. Try ElevenLabs TTS if key is present
      const elevenlabsData = await generateElevenLabsTts(spokenText, elevenlabsApiKey, elevenlabsVoiceId);
      if (elevenlabsData && "audio" in elevenlabsData) {
        return res.json({
          success: true,
          audio: elevenlabsData.audio,
          format: "mp3",
          engine: "elevenlabs",
          text: spokenText
        });
      }

      const elevenlabsErrorMsg = (elevenlabsData && "error" in elevenlabsData) ? elevenlabsData.error : null;
      const elevenlabsStatus = (elevenlabsData && "status" in elevenlabsData) ? elevenlabsData.status : null;
      const isQuotaExceeded = elevenlabsStatus === 402 || (elevenlabsData && "quotaExceeded" in elevenlabsData && Boolean(elevenlabsData.quotaExceeded));

      const validVoices = ["Kore", "Aoede", "Leda", "Fenrir", "Puck", "Charon", "Orpheus", "Zephyr"];
      const selectedVoice = validVoices.includes(voice) ? voice : "Kore";
      const cacheKey = `gemini:${selectedVoice}:${spokenText}`;

      if (ttsAudioCache.has(cacheKey)) {
        const cached = ttsAudioCache.get(cacheKey);
        return res.json({
          success: true,
          audio: cached?.audio,
          format: cached?.format || "pcm24k",
          sampleRate: 24000,
          voice: selectedVoice,
          engine: "gemini_cached",
          text: spokenText,
          cached: true,
          elevenlabsError: elevenlabsErrorMsg,
          elevenlabsStatus,
          isQuotaExceeded
        });
      }

      const ai = getGenAI();
      const ttsModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];
      
      for (const modelName of ttsModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ parts: [{ text: spokenText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            if (ttsAudioCache.size > 200) ttsAudioCache.clear();
            ttsAudioCache.set(cacheKey, { audio: base64Audio, format: "pcm24k" });
            return res.json({
              success: true,
              audio: base64Audio,
              format: "pcm24k",
              sampleRate: 24000,
              voice: selectedVoice,
              engine: "gemini_neural",
              text: spokenText,
              elevenlabsError: elevenlabsErrorMsg,
              elevenlabsStatus,
              isQuotaExceeded
            });
          }
        } catch (ttsErr: any) {
          // Continue to fallback
        }
      }

      return res.json({
        success: false,
        fallback: true,
        useBrowserSpeech: true,
        error: elevenlabsErrorMsg || "Voice synthesis providers unavailable",
        elevenlabsError: elevenlabsErrorMsg,
        elevenlabsStatus,
        isQuotaExceeded,
        text: spokenText,
        voice: selectedVoice,
      });
    } catch (err: any) {
      res.status(200).json({
        success: false,
        fallback: true,
        useBrowserSpeech: true,
        error: err?.message || "Speech synthesis exception",
        text: req.body?.text || "",
        voice: req.body?.voice || "Kore"
      });
    }
  });

  app.get("/native-banner.html", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const pubFile = path.join(process.cwd(), "public", "native-banner.html");
    const distFile = path.join(process.cwd(), "dist", "native-banner.html");
    if (fs.existsSync(pubFile)) {
      res.sendFile(pubFile);
    } else if (fs.existsSync(distFile)) {
      res.sendFile(distFile);
    } else {
      res.status(404).send("Not found");
    }
  });

  const isVercel = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV
  );

  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  let vitePromise: Promise<any> | null = null;
  let viteMiddleware: any = null;

  if (!isVercel && process.env.NODE_ENV !== "production") {
    // Development mode: always use Vite middleware and dynamic index.html transformation
    vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    })
      .then((vite) => {
        viteMiddleware = vite.middlewares;
        return vite;
      })
      .catch((err) => {
        console.error("Failed to create Vite server:", err);
        return null;
      });

    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/proxy/")) {
        return next();
      }
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      if (vitePromise) {
        try {
          const vite = await vitePromise;
          if (vite) {
            return vite.middlewares(req, res, next);
          }
        } catch (e) {
          console.error("Error waiting for Vite middleware:", e);
        }
      }
      next();
    });

    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/proxy/")) {
        return next();
      }
      try {
        const vite = (await vitePromise);
        if (vite) {
          const template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
          return;
        }
      } catch (e) {
        console.error("Vite index transform error:", e);
      }
      const rootIndex = path.join(process.cwd(), "index.html");
      if (fs.existsSync(rootIndex)) {
        res.sendFile(rootIndex);
      } else {
        next();
      }
    });
  } else {
    // Production mode: serve built dist static files
    if (hasDist) {
      app.use(express.static(distPath));
    }
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/proxy/")) {
        return next();
      }
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        const rootIndex = path.join(process.cwd(), "index.html");
        if (fs.existsSync(rootIndex)) {
          res.sendFile(rootIndex);
        } else {
          res.status(404).send("App is building or dist not found. Please compile.");
        }
      }
    });
  }

  if (!isVercel) {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  export default app;
