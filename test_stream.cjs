const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

// Replace activeVideoUrl to ALWAYS be Big Buck Bunny
code = code.replace(
  /const activeVideoUrl = useMemo\(\(\) => \{[\s\S]*?\}, \[qualityLinks, videoSources, videoUrl, activeLanguage\]\);/,
  `const activeVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";`
);

fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
