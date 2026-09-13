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
1. STRICT HINGLISH RESPONSE: You MUST write your 'reply' in natural, conversational, fluent Hinglish (Hindi written in English alphabets). Always speak like an intelligent, loyal, polite personal AI butler/copilot. Example: "Haan Boss! Main Jawan movie ke saare links aur metadata setup kar raha hoon. Aage bataiye kya aadesh hai?"
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
   - CASE B (EXPLICIT UPLOAD ORDER): ONLY when Boss explicitly orders an upload using words like "upload karo", "add karo", "daal do", "chada do", "draft banao", "publish karo", "new series add karo", or provides video stream URLs (e.g. .mp4, .m3u8, https://...):
     - Set intent: "movie_upload" or "series_upload".
     - Generate full automation actions: FILL_UPLOAD_METADATA, BUILD_SERIES_EPISODES, CONFIGURE_MOVIE_LINKS, CALCULATE_DURATION, GO_TO_STEP.
6. COMPREHENSIVE PRESENTATION & MULTI-PART SUMMATION:
   - Provide a complete breakdown of ALL episodes.
   - MULTI-PART DURATION CALCULATION: When an episode contains multiple parts (e.g. Part 1, Part 2), the episode's total duration MUST be the sum of all its parts.
   - In your \`reply\` and \`summary\`, explicitly detail the parts and total calculation in Hinglish.

CORE AUTOMATION RULES:

1. CONTENT UPLOAD & LINK PASTING:
Only generate upload actions when Master explicitly asks to upload, add, draft, publish, configure media, or create episodes (e.g. "upload karo", "12 episode banana hai", "banao", "draft karo", "stream links"):
- DETECT TYPE: Set mode to "movie" or "series". (For anime or episodic shows, use mode "series").
- EXTRACT METADATA & SYSTEM SETTINGS:
  - Check \`context.tmdbMetadata\`. If present, use that exact title, description, posterUrl, backdropUrl, rating, year, and genres!
- TARGET VIDEO QUALITIES ("kaun si quality target karni hai"):
  - Check user prompt for target qualities (e.g. "1080p target karna hai", "720p", "480p", "360p", "all qualities").
  - In \`FILL_UPLOAD_METADATA\`, set \`data.qualities\` to ONLY the requested qualities (e.g. ["1080p"]). If unspecified, default to ["1080p"].
- TARGET AUDIO LANGUAGES ("kaun sa language rakhna hai"):
  - Check user prompt for audio languages (e.g. "Hindi language rakhna hai", "Japanese", "English", "Urdu").
  - In \`FILL_UPLOAD_METADATA\`, set \`data.languages\` to ONLY the requested languages (e.g. ["Hindi"]). If unspecified, default to ["Hindi"].
- EPISODE COUNT & NUMBERING ("kitne episode banana hai"):
  - When Boss specifies how many episodes to make (e.g. "12 episode banana hai", "5 episodes banao", "10 episodes"):
    - In \`BUILD_SERIES_EPISODES\`, \`data.episodes\` MUST contain an array of EXACTLY that many episode objects (epNum: 1, 2, ... N)!
    - NEVER generate only 1 episode when Boss asked for 12!
- STREAM LINKS PASTING & EMPTY INPUT BOXES ("agar link diya hai to paste karo, agar nahi diya to khali chhod do"):
  - If Boss provided stream links for specific episodes (e.g. "Episode 1 link: ..."):
    - Paste that link into that episode's \`videoSources\` for the requested language and quality.
    - If multi-parts were given (e.g. "Episode 1 Part 1 link: ... Part 2 link: ..."), assign to partNum 1 and partNum 2.
  - CRITICAL - UNPROVIDED EPISODES:
    - If Boss did NOT provide a link for an episode (e.g. Boss said "12 episode banana hai" and only gave a link for Ep 1, or gave NO links):
      - DO NOT invent fake URLs (no example.com, no test.mp4, no duplicate URLs)!
      - Set \`links: []\` for those episodes so their input boxes in the admin panel remain completely clean and empty for the admin to paste links later!
- AUTOMATIC DURATION CALCULATION:
  - Always include the \`CALCULATE_DURATION\` action (\`{ "type": "CALCULATE_DURATION", "mode": "movie" | "episode" }\`).
- WIZARD NAVIGATION:
  - End the action pipeline by navigating to Step 2 (\`{ "type": "GO_TO_STEP", "step": 2 }\`).

2. BROADCAST / ANNOUNCEMENTS:
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

      const hasUploadAction = /\b(upload|add|draft|publish|insert|daal\s*do|dal\s*do|chada\s*do|chadhado|link\s*lagao|link\s*dalo|form\s*bharo|save\s*content|create|generate|setup|configure|banao|banana|bana\s*do|banayein?|banaoge|target\s*karna|target\s*karo|rakhna\s*hai|rakho|set\s*karo)\b/i.test(prompt);
      const hasEpisodePattern = /\b\d+\s*(?:episodes?|eps?|ep|bhag)\b/i.test(prompt) || /\b(?:episode|ep)\s*\d+/i.test(prompt);
      const isExplicitUploadOrder = !isLoyaltyOrFunRequest && (hasUploadAction || urlMatches.length > 0 || hasEpisodePattern);

      const isCasualGreeting = !isExplicitUploadOrder && !isLoyaltyOrFunRequest && /^(hi|hello|hey|kaise\s*ho|kya\s*haal|good\s*(morning|evening|afternoon|night)|who\s*are\s*you|tum\s*kaun\s*ho|namaste|pranam|kya\s*chal\s*raha\s*hai|help|shukriya|thanks|thank\s*you)\b/i.test(prompt.trim());

      const isMediaInquiry = !isExplicitUploadOrder && !isCasualGreeting && !isLoyaltyOrFunRequest && /\b(movie|series|anime|season|film|show|kaisa|kaisi|story|plot|review|recommend|suggest|release|actor|cast|episode|details|batao|kya\s*hai)\b/i.test(prompt);

      // Target qualities ("kaun si quality target karni hai")
      const targetQualities: string[] = [];
      if (/\b(all\s*qualit|sab\s*qualit|saari\s*qualit|har\s*qualit)\b/i.test(prompt)) {
        targetQualities.push("1080p", "720p", "480p", "360p");
      } else {
        if (/\b(1080p?|fhd|full\s*hd)\b/i.test(prompt)) targetQualities.push("1080p");
        if (/\b(720p?)\b/i.test(prompt) || (/\bhd\b/i.test(prompt) && !/full\s*hd|fhd/i.test(prompt))) targetQualities.push("720p");
        if (/\b(480p?|sd)\b/i.test(prompt)) targetQualities.push("480p");
        if (/\b(360p?)\b/i.test(prompt)) targetQualities.push("360p");
      }
      if (targetQualities.length === 0) {
        targetQualities.push("1080p");
      }

      // Target audio languages ("kaun sa language rakhna hai")
      const targetLanguages: string[] = [];
      if (/\b(dual\s*audio)\b/i.test(prompt)) {
        targetLanguages.push("Hindi", "English");
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

      // Season Number detection
      const seasonMatch = prompt.match(/(?:season|s)\s*(\d+)/i);
      const targetSeasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

      // Episode Count detection ("kitne episode banana hai", "do episode upload karna hai")
      // Remove URLs first so numbers inside URLs (like tg62t9.mp4) don't confuse count regex!
      const promptWithoutUrls = prompt.replace(/https?:\/\/[^\s"'<>)\]]+/g, " [STREAM_LINK] ");

      let requestedEpisodeCount: number | null = null;
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
        das: 10, ten: 10
      };

      const countMatch = promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|\d+)\s*(?:episodes?|eps?|ep|bhag|kist)\b/i) ||
                         promptWithoutUrls.match(/(?:episodes?|eps?|ep)\s*(?:count|total|ki\s*sankhya)?\s*[:=-]?\s*(\d+)/i) ||
                         promptWithoutUrls.match(/\b(ek|one|do|dono|donon|two|teen|teeno|three|char|chaar|four|paanch|panch|five|che|chhah|six|saat|seven|aath|eight|nau|nine|das|ten|\d+)\s*(?:episode|episodes)\s*(?:banana|banao|rakhna|upload|add|create|generate)/i);
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
        .replace(/\b(upload|add|draft|publish|stream|link|links|episode|episodes|ep|eps|season|seasons|s\d+|part|parts|skip|intro|outro|credits|movie|anime|series|web\s*series|urdu|hindi|english|japanese|korean|tamil|telugu|1080p|720p|480p|360p|with|and|for|in|to|batao|kaisa|kaisi|story|plot|review|banana|banao|bana\s*do|rakhna|rakho|target|karna|hai|karo|ke|ka|ki|ko|me|mein|audio|track|quality|qualities|kitne|total|count|number)\b/gi, " ")
        .replace(/[\d]+s\b/gi, " ")
        .replace(/[0-9]+-[0-9]+s?/gi, " ")
        .replace(/\b\d+\b/g, " ")
        .replace(/[,\-:–—\?]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!searchTitle || searchTitle.length < 2) {
        searchTitle = prompt.split(" ").slice(0, 3).join(" ").trim();
      }

      // 2. Playful Loyalty Commands (e.g. "meow meow bolo", "loyalty test", "tareef karo")
      const selectedVoice = voice || req.body.voice || "Kore";
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

      // 3. Casual Greetings (When NOT an explicit upload order)
      if (isCasualGreeting && !isExplicitUploadOrder) {
        const casualReplies = [
          `Haan Boss! Main bilkul badiya hoon. Aapka wafadar AI Co-Pilot haazir hai, batayein aaj kya hukum hai?`,
          `Namaste Boss! MaxPlay AI Co-Pilot haazir hai. Aap batayein aaj kaunsi nayi movie ya series upload karni hai ya system ka koi kaam karna hai?`,
          `Hello Boss! Main hamesha ready hoon. Bataiye aaj kya upload karna hai ya kaunsi announcement broadcast karni hai?`
        ];
        const fallbackReply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
        return res.json({
          thought: "Handled general conversational query respectfully without forcing upload actions.",
          intent: "general_query",
          reply: fallbackReply,
          voiceUsed: selectedVoice,
          summary: ["Responded to general query in conversational Hinglish"],
          actions: []
        });
      }

      // 4. TMDB Search (ONLY for explicit upload orders or media inquiries)
      const shouldSearchTmdb = (isExplicitUploadOrder || isMediaInquiry) && !isCasualGreeting && !isLoyaltyOrFunRequest;
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
- TARGET QUALITIES: [${targetQualities.map(q => `"${q}"`).join(", ")}] in "FILL_UPLOAD_METADATA.data.qualities".
- TARGET LANGUAGES: [${targetLanguages.map(l => `"${l}"`).join(", ")}] in "FILL_UPLOAD_METADATA.data.languages".
- LINK MAPPING MANDATE:
  ${mappedLinks.length > 0 
    ? `Boss provided ${mappedLinks.length} stream links: ${JSON.stringify(mappedLinks.map(l => ({ epNum: l.epNum, partNum: l.partNum, url: l.url })))}. Paste these into their exact episodes under "${primaryLang}" and "${primaryQual}".` 
    : 'Boss provided NO stream links in this message.'}
  CRITICAL: For all episodes where NO link was provided, leave "links: []" completely empty! Do NOT invent fake URLs (no example.com, no test.mp4, no duplicates)!
- DURATION: Include CALCULATE_DURATION action.
- NAVIGATION: End with GO_TO_STEP 2 action.`;

      const userMessage = `Admin Command: ${prompt.trim()}\nCurrent Admin Context: ${JSON.stringify(enhancedContext)}${taskDirective}\nPlease analyze the admin's command and output the structured operational plan.`;

      const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-1.5-flash", "gemini-3.1-pro-preview"];
      let lastErr = null;
      let response = null;

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: userMessage,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            });
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

      // Build flawless episodes structure helper
      const buildVerifiedEpisodes = () => {
        const episodesList: any[] = [];
        for (let epI = 1; epI <= finalEpCount; epI++) {
          const linksForThisEp = mappedLinks.filter(l => l.epNum === epI).sort((a, b) => a.partNum - b.partNum);
          
          if (linksForThisEp.length > 0) {
            let epDurationSum = 0;
            const builtLinks = linksForThisEp.map(l => {
              const pSec = l.probedDurationSec || 1420;
              epDurationSum += pSec;
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

            episodesList.push({
              epNum: epI,
              title: `${tmdb?.title || searchTitle || 'Content'} - Episode ${epI}`,
              duration: formatDurationSec(epDurationSum),
              links: builtLinks,
              skipMarkers: { intro: { start: 0, end: 90 } }
            });
          } else {
            // Unprovided links: keep links empty so input box stays completely clean!
            episodesList.push({
              epNum: epI,
              title: `${tmdb?.title || searchTitle || 'Content'} - Episode ${epI}`,
              duration: "",
              links: [],
              skipMarkers: { intro: { start: 0, end: 90 } }
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
            genres: tmdb?.genres || ["Action", "Adventure", "Fantasy"],
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

        const fallbackReply = `Haan Boss! Aapke aadesh ke anusar maine **${tmdb?.title || searchTitle || 'content'}** (Season ${targetSeasonNumber}) ready kar diya hai:\n` +
          `• Total Episodes: Exactly ${finalEpCount} episodes banaye hain.\n` +
          `• Target Quality: ${targetQualities.join(', ')} set kiya hai.\n` +
          `• Audio Language: ${targetLanguages.join(', ')} set kiya hai.\n` +
          (linkedCount > 0 
            ? `• Links & Duration Breakdown:${epBreakdown}\n` +
              `• **Total Season Calculated Duration**: **${formatHumanDuration(totalSeasonSeconds)}**!\n`
            : `• Stream Links: Koi link message me nahi tha, isliye sabhi ${finalEpCount} episodes ke input boxes bilkul khali (empty) chhod diye hain!\n`) +
          `Step 2 upload form open kar diya hai Boss!`;

        return res.json({
          thought: "Configured media upload adhering strictly to Boss's episode count, quality, language, and link pasting instructions.",
          intent: mediaType === "movie" ? "movie_upload" : "series_upload",
          reply: fallbackReply,
          voiceUsed: selectedVoice,
          tmdbMetadata: tmdb || null,
          summary: [
            `Built ${finalEpCount} episode(s) for ${tmdb?.title || searchTitle}`,
            `Target quality set to ${targetQualities.join(', ')}`,
            `Audio language set to ${targetLanguages.join(', ')}`,
            linkedCount > 0 ? `Pasted provided links and probed duration` : `Input boxes kept clean & empty for unprovided links`,
            `Navigated to Step 2 upload form`
          ],
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
              if (tmdb) {
                if (!act.data.posterUrl) act.data.posterUrl = tmdb.posterUrl;
                if (!act.data.backdropUrl) act.data.backdropUrl = tmdb.backdropUrl;
                if (!act.data.title) act.data.title = tmdb.title;
              }
            }
            if (act.type === "BUILD_SERIES_EPISODES") {
              hasEpisodes = true;
              act.data = act.data || {};
              // Enforce exact requested episode count and verified link assignment
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
                genres: tmdb.genres,
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
            inlineAudio = await generateInlineTts(ai, parsed.reply, selectedVoice, elevenlabsApiKey, elevenlabsVoiceId);
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
