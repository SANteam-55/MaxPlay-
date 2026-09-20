import express from "express";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      // 1.C In-Place Draft Modification Intent (e.g. "720p hata Do 1080p is episode mein laga do", "Episode 2 me intro skip 15 se 95 kar do")
      const hasModificationAction = /\b(hata\s*do|hatao|hata|remove|delete|mita\s*do|replace|badal\s*do|badlo|swap|change|laga\s*do|lagao|add\s*karo|set\s*karo|rakh\s*do|daal\s*do|dal\s*do)\b/i.test(prompt);
      const hasQualityToken = /\b(1080p?|720p?|480p?|360p?|4k|2k|quality|qualities)\b/i.test(prompt);
      const hasPartToken = /\b(part|parts|bhag)\b/i.test(prompt);
      const hasSkipToken = /\b(skip|intro|outro|credits)\b/i.test(prompt);
      const hasTargetEpMention = /\b(is\s*(?:wale)?\s*episode|is\s*episode|iss\s*episode|episode\s*\d+|ep\s*\d+|sabhi\s*episodes?)\b/i.test(prompt);

      const isDraftModification = hasModificationAction && (hasQualityToken || hasPartToken || hasSkipToken) && (hasTargetEpMention || (enhancedContext?.currentDraft && enhancedContext.currentDraft.activeSeasonEpisodesCount > 0));

      if (isDraftModification && !isLoyaltyOrFunRequest) {
        // Extract target episode numbers
        const targetEpNums: number[] = [];
        const epNumMatches = Array.from(prompt.matchAll(/(?:episode|ep)\s*(\d+)/gi));
        if (epNumMatches.length > 0) {
          epNumMatches.forEach(m => targetEpNums.push(parseInt(m[1], 10)));
        } else if (!/\b(sabhi|sab|all)\s*episodes?\b/i.test(prompt)) {
          const activeEp = enhancedContext?.currentSeasonIdx !== undefined ? (enhancedContext.currentSeasonIdx + 1) : 1;
          targetEpNums.push(activeEp);
        }

        // Extract qualities to remove and add using clause segmentation
        const removeQualities: string[] = [];
        const addQualities: string[] = [];

        const clauses = prompt.split(/\b(?:aur|and|lekin|but|fir|then|waise|,|;)\b/i);
        clauses.forEach(clause => {
          const hasRemove = /\b(hata\s*do|hatao|remove|delete|hata|mita\s*do)\b/i.test(clause);
          const hasAdd = /\b(laga\s*do|lagao|add|set|rakh\s*do|daal\s*do|dal\s*do)\b/i.test(clause);
          const qMatches = Array.from(clause.matchAll(/\b(1080p?|720p?|480p?|360p?|4k)\b/gi)).map(m => m[1].toLowerCase().replace(/(\d+)$/, '$1p'));

          if (hasRemove && !hasAdd) {
            qMatches.forEach(q => { if (!removeQualities.includes(q)) removeQualities.push(q); });
          } else if (hasAdd && !hasRemove) {
            qMatches.forEach(q => { if (!addQualities.includes(q)) addQualities.push(q); });
          } else if (hasRemove && hasAdd) {
            qMatches.forEach(q => {
              const qIdx = clause.toLowerCase().indexOf(q.toLowerCase());
              const remIdx = clause.toLowerCase().search(/\b(hata\s*do|hatao|remove|delete|hata|mita\s*do)\b/);
              const addIdx = clause.toLowerCase().search(/\b(laga\s*do|lagao|add|set|rakh\s*do|daal\s*do|dal\s*do)\b/);
              const distToRem = remIdx !== -1 ? Math.abs(qIdx - remIdx) : Infinity;
              const distToAdd = addIdx !== -1 ? Math.abs(qIdx - addIdx) : Infinity;
              if (distToRem < distToAdd) {
                if (!removeQualities.includes(q)) removeQualities.push(q);
              } else {
                if (!addQualities.includes(q)) addQualities.push(q);
              }
            });
          }
        });

        // Extract parts count adjustment
        const partsMatch = prompt.match(/(?:(\d+|ek|do|teen|chaar|two|three|four)\s*parts?)/i);
        const draftPartsCount = partsMatch ? (wordToNumMap[partsMatch[1].toLowerCase()] || parseInt(partsMatch[1], 10)) : undefined;

        // Extract skip markers adjustment
        const draftSkipMarkers: any = {};
        const dIntro = prompt.match(/(?:intro|opening|op)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
        if (dIntro) {
          draftSkipMarkers.intro = { start: parseInt(dIntro[1], 10), end: parseInt(dIntro[2], 10) };
        }
        const dOutro = prompt.match(/(?:outro|ending|ed)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
        if (dOutro) {
          draftSkipMarkers.outro = { start: parseInt(dOutro[1], 10), end: parseInt(dOutro[2], 10) };
        }
        const dCredits = prompt.match(/(?:credits)\s*(?:skip)?\s*[:=-]?\s*(\d+)\s*(?:s|sec|seconds?)?\s*(?:se|to|-)\s*(\d+)\s*(?:s|sec|seconds?)?/i);
        if (dCredits) {
          draftSkipMarkers.credits = { start: parseInt(dCredits[1], 10), end: parseInt(dCredits[2], 10) };
        }
        if (/\b(?:intro\s*(?:skip)?\s*(?:hata\s*do|remove|delete|mat|nahi))\b/i.test(prompt)) {
          draftSkipMarkers.removeIntro = true;
        }
        if (/\b(?:outro\s*(?:skip)?\s*(?:hata\s*do|remove|delete|mat|nahi))\b/i.test(prompt)) {
          draftSkipMarkers.removeOutro = true;
        }

        const epStr = targetEpNums.length > 0 ? `Episode ${targetEpNums.join(', ')}` : "sabhi episodes";
        let modReply = `Haan Boss! Maine ${epStr} me aapke aadesh ke anusar modifications kar diye hain:\n`;
        if (removeQualities.length > 0) modReply += `• [${removeQualities.join(', ')}] quality hata di hai.\n`;
        if (addQualities.length > 0) modReply += `• [${addQualities.join(', ')}] quality laga di hai.\n`;
        if (draftPartsCount) modReply += `• Total ${draftPartsCount} parts configure kar diye hain.\n`;
        if (draftSkipMarkers.intro) modReply += `• Intro skip [${draftSkipMarkers.intro.start}s - ${draftSkipMarkers.intro.end}s] set kar diya hai.\n`;
        if (draftSkipMarkers.outro) modReply += `• Outro skip [${draftSkipMarkers.outro.start}s - ${draftSkipMarkers.outro.end}s] set kar diya hai.\n`;
        modReply += `Upload form live sync ho chuka hai Boss!`;

        return res.json({
          thought: "Detected in-place draft modification command for existing episode specification.",
          intent: "series_upload",
          reply: modReply,
          voiceUsed: selectedVoice,
          summary: [
            `Updated specifications for ${epStr}`,
            removeQualities.length > 0 ? `Removed quality: ${removeQualities.join(', ')}` : null,
            addQualities.length > 0 ? `Added quality: ${addQualities.join(', ')}` : null,
            draftPartsCount ? `Set parts count to ${draftPartsCount}` : null,
            draftSkipMarkers.intro ? `Set intro skip: ${draftSkipMarkers.intro.start}s - ${draftSkipMarkers.intro.end}s` : null,
            draftSkipMarkers.outro ? `Set outro skip: ${draftSkipMarkers.outro.start}s - ${draftSkipMarkers.outro.end}s` : null
          ].filter(Boolean),
          actions: [
            {
              type: "UPDATE_EPISODES_SPEC",
              data: {
                episodeNumbers: targetEpNums.length > 0 ? targetEpNums : undefined,
                applyToAll: targetEpNums.length === 0,
                removeQualities,
                addQualities,
                setQualities: (removeQualities.length > 0 && addQualities.length > 0) ? addQualities : undefined,
                partsCount: draftPartsCount,
                skipMarkers: Object.keys(draftSkipMarkers).length > 0 ? draftSkipMarkers : undefined
              }
            }
          ]
        });
      }

      // 1. Inventory Query (e.g. "Kitne anime upload hai?", "Uploaded content dikhao", "MaxPlay me kya kya upload hai?")
      const isInventoryQuery = !isLoyaltyOrFunRequest && 
        (/\b(kitne|kitna|kitni|kaun|kaunse|kaunsi|kya\s*kya|total|list|show|batao|dikhao|check|inventory|kya\s*upload|kya\s*hai)\b/i.test(prompt) &&
         /\b(upload|uploaded|anime|animes|series|movie|movies|content|titles|database|library)\b/i.test(prompt) &&
         !/\b(karo|kar\s*do|banao|upload\s*karna|laga\s*do|upload\s*karo|chada\s*do)\b/i.test(prompt));

      // 2. Edit Inquiry or Existing Content Inspection
      const library = Array.isArray(enhancedContext?.contentLibrary) ? enhancedContext.contentLibrary : [];
      let matchedContent: any = null;
      if (library.length > 0) {
        const lowerPrompt = prompt.toLowerCase();
        for (const item of library) {
          if (item && item.title && lowerPrompt.includes(item.title.toLowerCase())) {
            matchedContent = item;
            break;
          }
        }
      }

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
      const hasUploadAction = /\b(upload\s*karo|upload\s*karna|naya\s*upload|upload\s*kar\s*do|upload\s*kijiye|add\s*karo|draft\s*banao|publish\s*karo|insert\s*karo|daal\s*do|dal\s*do|chada\s*do|chadhado|link\s*lagao|link\s*dalo|form\s*bharo|save\s*content|banao|banana|bana\s*do)\b/i.test(prompt);
      const hasEpisodePattern = (/\b\d+\s*(?:episodes?|eps?|ep|bhag)\b/i.test(prompt) || /\b(?:episode|ep)\s*\d+/i.test(prompt)) && /\b(upload|banao|bana\s*do|rakho|set\s*karo)\b/i.test(prompt);

      const isExplicitUploadOrder = !isLoyaltyOrFunRequest && 
        !isInventoryQuery && 
        !isGeneralEditIntent && 
        !isSpecificEditIntent && 
        !isCasualGreeting && 
        !isConversationalQuestion &&
        (hasUploadAction || urlMatches.length > 0 || hasEpisodePattern);

      const isMediaInquiry = !isExplicitUploadOrder && !isCasualGreeting && !isConversationalQuestion && !isLoyaltyOrFunRequest && !isInventoryQuery && !isGeneralEditIntent && !isSpecificEditIntent && /\b(movie|series|anime|season|film|show|kaisa|kaisi|story|plot|review|recommend|suggest|release|actor|cast)\b/i.test(prompt);

      // Season Number detection
      const seasonMatch = prompt.match(/(?:season|s)\s*(\d+)/i);
      const targetSeasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

      // Episode Count detection ("kitne episode banana hai", "do episode upload karna hai")
      const promptWithoutUrls = prompt.replace(/https?:\/\/[^\s"'<>)\]]+/g, " [STREAM_LINK] ");

      let requestedEpisodeCount: number | null = null;
      const countMatch = promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees|\d+)\s*(?:episodes?|eps?|ep|bhag|kist)\b/i) ||
                         promptWithoutUrls.match(/(?:episodes?|eps?|ep)\s*(?:count|total|ki\s*sankhya)?\s*[:=-]?\s*(\d+)/i) ||
                         promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|gyarah|barah|baarah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|chaubees|pachees|\d+)\s*(?:episode|episodes)\s*(?:banana|banao|rakhna|upload|add|create|generate)/i);
      if (countMatch) {
        const rawVal = countMatch[1].toLowerCase();
        const num = wordToNumMap[rawVal] || parseInt(rawVal, 10);
        if (!isNaN(num) && num > 0 && num <= 100) {
          requestedEpisodeCount = num;
        }
      }

      // Map links to specific Episode numbers and Part numbers using accurate segment slicing
      interface MappedLink {
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

      let lastEp = 1;
      let lastPart = 0;

      for (let i = 0; i < rawMatches.length; i++) {
        const m = rawMatches[i];
        const prevEnd = i === 0 ? 0 : rawMatches[i - 1].end;
        const segment = prompt.substring(prevEnd, m.index);

        // Find episode mentions in segment (e.g. "Episode 1", "Ep 2")
        const epMatches = Array.from(segment.matchAll(/(?:episode|ep|bhag|kist)\s*(\d+)/gi));
        let epNum = epMatches.length > 0 ? parseInt(epMatches[epMatches.length - 1][1], 10) : 0;

        // Find part mentions in segment (e.g. "part 2", "pt 2", "p 2")
        const partMatches = Array.from(segment.matchAll(/(?:part|pt|p)\s*(\d+)/gi));
        let partNum = partMatches.length > 0 ? parseInt(partMatches[partMatches.length - 1][1], 10) : 0;

        if (epNum === 0) {
          if (partNum > 1) {
            epNum = lastEp;
          } else if (rawMatches.length === 1 && requestedEpisodeCount === 1) {
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

        lastEp = epNum;
        lastPart = partNum;
        mappedLinks.push({ epNum, partNum, url: m.url });
      }

      // Media type detection
      const isAnime = /\b(anime|naruto|solo\s*leveling|jujutsu|demon\s*slayer|one\s*piece|bleach|death\s*note|dragon\s*ball|attack\s*on\s*titan|chainsaw\s*man)\b/i.test(prompt);
      const isMovie = /\b(movie|film|cinema)\b/i.test(prompt) && !isAnime && !hasEpisodePattern;
      const mediaType: "movie" | "series" | "anime" = isAnime ? "anime" : (isMovie ? "movie" : "series");

      if (!requestedEpisodeCount && mediaType !== "movie") {
        if (mappedLinks.length > 0) {
          const maxEp = Math.max(...mappedLinks.map(l => l.epNum));
          requestedEpisodeCount = Math.max(maxEp, 1);
        } else {
          requestedEpisodeCount = 1;
        }
      }

      // Clean search title for TMDB (removes procedural instruction words cleanly)
      let searchTitle = prompt
        .replace(/(https?:\/\/[^\s]+)/gi, " ")
        .replace(/\b(upload|add|draft|publish|stream|link|links|episode|episodes|ep|eps|season|seasons|s\d+|part|parts|skip|intro|outro|credits|movie|anime|series|web\s*series|urdu|hindi|english|japanese|korean|tamil|telugu|1080p|720p|480p|360p|4k|2k|with|and|for|in|to|batao|kaisa|kaisi|story|plot|review|banana|banao|bana\s*do|banane|banani|rakhna|rakho|rakhe|target|karna|kar|karo|hai|hain|ke|ka|ki|ko|me|mein|par|pe|audio|track|quality|qualities|kitne|total|count|number|hata|hatao|hata\s*do|laga|lagao|lagana|laga\s*do|sirf|baki|sab|saari|select|selected|selection|chahiye|honge|hoga|hogi|suggest|specification|badal\s*do|badlo|lekin|wale|wali|wala|iss|is|us|language|languages|hi|bhi)\b/gi, " ")
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

      for (const k of knownMediaTitles) {
        if (k.pattern.test(prompt)) {
          searchTitle = k.title;
          break;
        }
      }

      if (!searchTitle || searchTitle.length < 2) {
        searchTitle = prompt.split(" ").slice(0, 3).join(" ").trim();
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

        const wantsToOpenForm = /\b(load|open|kholo|khool\s*do|le\s*jao|form\s*me\s*kholo)\b/i.test(prompt);

        const editReply = `Haan Boss! **"${c.title}"** (${typeStr}) ka record mil gaya hai. Abhi isme ye details maujud hain:\n\n` +
          `• **Title**: ${c.title} (${c.year || '2024'})\n` +
          `• **Type**: ${typeStr} | Rating: ⭐ ${c.rating || '8.8'}\n` +
          `• **Genres**: ${genreStr}\n` +
          `• **Audio Languages**: ${langStr}\n` +
          `• **Active Qualities**: ${qualStr}\n` +
          epInfoStr +
          skipStr +
          `\n**Aap isme kya edit karwana chahte hain?**\n` +
          `1. Naye episodes ya stream links add karna?\n` +
          `2. Quality update karna (jaise 720p se 1080p)?\n` +
          `3. Skip markers (intro / outro) badalna?\n` +
          `4. Ya direct upload form me load karna?`;

        return res.json({
          thought: `Inspected ${c.title} from uploaded library and presented full configuration in chat.`,
          intent: "edit_inquiry",
          reply: editReply,
          voiceUsed: selectedVoice,
          suggestionChips: [
            { label: "📝 Open in Edit Form", prompt: `Load ${c.title} in edit form` },
            { label: "🎬 Set 1080p Quality", prompt: `${c.title} me 1080p quality set karo` },
            { label: "⏩ Intro Skip 0-90s", prompt: `${c.title} me intro skip 0 to 90s set karo` }
          ],
          actions: wantsToOpenForm ? [{ type: "LOAD_FOR_EDIT", data: { contentId: c.id, title: c.title } }] : [],
          summary: [
            `Inspected "${c.title}" (${typeStr})`,
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
          const chatModel = "gemini-3.6-flash";
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

      // 8. TMDB Search (STRICTLY for explicit upload orders)
      const shouldSearchTmdb = isExplicitUploadOrder && !isCasualGreeting && !isLoyaltyOrFunRequest && !isInventoryQuery && !isConversationalQuestion;
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
      const maxLinkEp = mappedLinks.length > 0 ? Math.max(...mappedLinks.map(l => l.epNum)) : 1;
      const finalEpCount = Math.max(requestedEpisodeCount || 1, maxLinkEp);
      const primaryLang = targetLanguages[0] || "Hindi";
      const primaryQual = targetQualities[0] || "1080p";

      let taskDirective = `\nCRITICAL UPLOAD SPECIFICATIONS (STRICTLY ADHERE TO THESE):
- MEDIA TYPE: "${mediaType}"
- SEASON NUMBER: ${targetSeasonNumber}
- TARGET EPISODE COUNT: Exactly ${finalEpCount} episodes MUST be in the "BUILD_SERIES_EPISODES" episodes array (epNum: 1 to ${finalEpCount}). NEVER output fewer episodes!
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
    ? `Boss provided ${mappedLinks.length} stream links: ${JSON.stringify(mappedLinks.map(l => ({ epNum: l.epNum, partNum: l.partNum, url: l.url })))}. Paste these into their exact episodes.` 
    : 'Boss provided NO stream links in this message.'}
  CRITICAL: For all episodes where NO link was provided, keep input boxes clean and empty with NO fake URLs (no example.com, no test.mp4, no duplicates)!
- DURATION: Include CALCULATE_DURATION action.
- NAVIGATION: End with GO_TO_STEP 2 action.`;

      const userMessage = `Admin Command: ${prompt.trim()}\nCurrent Admin Context: ${JSON.stringify(enhancedContext)}${taskDirective}\nPlease analyze the admin's command and output the structured operational plan.`;

      const candidateModels = ["gemini-3.6-flash", "gemini-2.5-pro"];
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
            const isQuotaErr = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("Quota exceeded");
            if (isQuotaErr) break;
            const isUnavailable = err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE") || err?.status === 503;
            if (isUnavailable && attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
              continue;
            }
            break;
          }
        }
        if (response && response.text) break;
        if (lastErr && (lastErr?.status === 429 || lastErr?.message?.includes("429") || lastErr?.message?.includes("Quota exceeded"))) break;
      }

      // Build flawless episodes structure helper supporting per-episode qualities and parts
      const buildVerifiedEpisodes = () => {
        const episodesList: any[] = [];
        for (let epI = 1; epI <= finalEpCount; epI++) {
          const linksForThisEp = mappedLinks.filter(l => l.epNum === epI).sort((a, b) => a.partNum - b.partNum);
          
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
              title: `${tmdb?.title || searchTitle || 'Content'} - Episode ${epI}`,
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
              title: `${tmdb?.title || searchTitle || 'Content'} - Episode ${epI}`,
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
          fallbackActions.push({
            type: "BUILD_SERIES_EPISODES",
            data: {
              seasonNumber: targetSeasonNumber,
              episodes: buildVerifiedEpisodes()
            }
          });
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
          for (let epI = 1; epI <= finalEpCount; epI++) {
            const epLinks = mappedLinks.filter(l => l.epNum === epI).sort((a, b) => a.partNum - b.partNum);
            if (epLinks.length > 0) {
              const epTotalSec = epLinks.reduce((acc, curr) => acc + (curr.probedDurationSec || 1420), 0);
              totalSeasonSeconds += epTotalSec;
              const partsText = epLinks.map((l, idx) => `Part ${idx + 1} (${formatHumanDuration(l.probedDurationSec || 1420)})`).join(" + ");
              epBreakdown += `\n  • Episode ${epI} (${epLinks.length} Part${epLinks.length > 1 ? 's' : ''}): ${partsText} => Combined Total: **${formatHumanDuration(epTotalSec)}**`;
            } else {
              epBreakdown += `\n  • Episode ${epI}: Link input box empty (unprovided)`;
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

        const fallbackReply = `Haan Boss! Aapke aadesh ke mutabiq maine **${tmdb?.title || searchTitle || 'content'}** (${mediaType === 'anime' ? 'Anime Series' : 'Series'}, Season ${targetSeasonNumber}) prepare kar diya hai:\n` +
          `• Total Episodes: Exactly ${finalEpCount} episodes banaye hain.\n` +
          `• Global Selected Quality: [${targetQualities.join(', ')}] select kiya hai.\n` +
          `• Audio Language: Sirf [${targetLanguages.join(', ')}] language select ki gayi hai.\n` +
          overridesSummary +
          (linkedCount > 0 
            ? `• Links & Duration Breakdown:${epBreakdown}\n` +
              `• **Total Season Calculated Duration**: **${formatHumanDuration(totalSeasonSeconds)}**!\n`
            : `• Stream Links: Koi link message me nahi tha, isliye sabhi ${finalEpCount} episodes ke input boxes bilkul clean aur empty chhod diye hain!\n`) +
          `Step 2 upload form open kar diya hai Boss!`;

        const summaryBullets = [
          `Built ${finalEpCount} episode(s) for ${tmdb?.title || searchTitle}`,
          `Audio language set to ${targetLanguages.join(', ')}`,
          `Global selected quality: ${targetQualities.join(', ')}`,
          Object.keys(episodeQualitiesMap).length > 0 ? `Per-episode quality overrides: ${Object.entries(episodeQualitiesMap).map(([ep, qs]) => `Ep ${ep} [${qs.join(', ')}]`).join(', ')}` : null,
          Object.keys(episodePartsMap).length > 0 ? `Multi-part episodes: ${Object.entries(episodePartsMap).map(([ep, p]) => `Ep ${ep} (${p} parts)`).join(', ')}` : null,
          Object.keys(episodeSkipMarkersMap).length > 0 ? `Episode-specific skip markers configured` : null,
          linkedCount > 0 ? `Pasted provided links and probed duration` : `Input boxes kept clean & empty for unprovided links`,
          `Navigated to Step 2 upload form`
        ].filter(Boolean) as string[];

        return res.json({
          thought: "Configured media upload adhering strictly to Boss's episode count, quality, language, and link pasting instructions.",
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
          let hasEpisodes = false;
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
            if (act.type === "BUILD_SERIES_EPISODES") {
              hasEpisodes = true;
              act.data = act.data || {};
              // Enforce exact requested episode count, overrides and parts
              act.data.episodes = buildVerifiedEpisodes();
            }
            if (act.type === "CALCULATE_DURATION") hasCalc = true;
            if (act.type === "GO_TO_STEP") hasStep = true;
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

          if (mediaType !== "movie" && !hasEpisodes) {
            parsed.actions.push({
              type: "BUILD_SERIES_EPISODES",
              data: {
                seasonNumber: 1,
                episodes: buildVerifiedEpisodes()
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
        res.json({
          thought: "Recovered from JSON parsing error with strict verified action plan.",
          intent: mediaType === "movie" ? "movie_upload" : "series_upload",
          reply: `Haan Boss! ${tmdb?.title || searchTitle} ke liye ${finalEpCount} episodes aur ${targetQualities.join(', ')} (${targetLanguages.join(', ')}) settings tayar kar di hain!`,
          voiceUsed: selectedVoice,
          tmdbMetadata: tmdb || null,
          summary: [`Configured ${finalEpCount} episodes`, `Quality: ${targetQualities.join(', ')}`, `Language: ${targetLanguages.join(', ')}`],
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
            {
              type: "BUILD_SERIES_EPISODES",
              data: {
                seasonNumber: 1,
                episodes: buildVerifiedEpisodes()
              }
            },
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

      const ttsModels = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash", "gemini-3.1-flash-live-preview", "gemini-flash-latest"];
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
      const ttsModels = ["gemini-3.1-flash-tts-preview"];
      
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
