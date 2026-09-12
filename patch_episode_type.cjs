const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(
  "export interface Episode {\n  id: string;\n  episodeNumber: number;\n  title: string;\n  duration: number; // seconds\n  thumbnailUrl: string;\n  videoUrl: string;\n  qualityLinks?: Record<string, string>;",
  "export interface Episode {\n  id: string;\n  episodeNumber: number;\n  title: string;\n  duration: number; // seconds\n  thumbnailUrl: string;\n  videoUrl: string;\n  qualityLinks?: Record<string, string>;\n  videoSources?: Record<string, Record<string, string>>;"
);

fs.writeFileSync('src/types/index.ts', code);
